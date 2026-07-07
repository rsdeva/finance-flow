'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLoans } from '@/hooks/use-loans';
import { calculateEMI, generateAmortizationSchedule, calculateTotalInterest } from '@/lib/loan-utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const loanSchema = z.object({
  name: z.string().min(1, 'Loan Name is required'),
  bank: z.string().min(1, 'Bank Name is required'),
  principal: z.coerce.number().min(1, 'Principal must be greater than 0'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  interestType: z.enum(['fixed', 'floating']),
  startDate: z.string().min(1, 'Start Date is required'),
  tenureMonths: z.coerce.number().min(1, 'Tenure must be at least 1 month'),
  emiAmount: z.coerce.number().min(0, 'EMI amount cannot be negative'),
  emiDueDate: z.coerce.number().min(1).max(31, 'Due date must be between 1 and 31'),
  processingFee: z.coerce.number().optional(),
  accountNumber: z.string().optional(),
  remarks: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

interface AddLoanFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function AddLoanForm({ isOpen, setIsOpen }: AddLoanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewEmi, setPreviewEmi] = useState<number | null>(null);
  const [previewTotalInterest, setPreviewTotalInterest] = useState<number | null>(null);
  
  const { addLoan } = useLoans();
  const { toast } = useToast();

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      name: '',
      bank: '',
      principal: 0,
      interestRate: 0,
      interestType: 'fixed',
      startDate: new Date().toISOString().split('T')[0],
      tenureMonths: 12,
      emiAmount: 0,
      emiDueDate: 1,
      processingFee: 0,
      accountNumber: '',
      remarks: '',
    },
  });

  const { watch, setValue, handleSubmit, reset } = form;
  
  const principal = watch('principal');
  const interestRate = watch('interestRate');
  const tenureMonths = watch('tenureMonths');
  const emiAmount = watch('emiAmount');

  // Keep track of the last EMI we auto-calculated so we know if the user manually overrode it
  const lastAutoCalculatedEmi = React.useRef<number>(0);

  // Auto calculate EMI when inputs change
  useEffect(() => {
    if (principal > 0 && interestRate >= 0 && tenureMonths > 0) {
      const calculatedEmi = calculateEMI(principal, interestRate, tenureMonths);
      setPreviewEmi(calculatedEmi);
      
      // Calculate total interest
      const schedule = generateAmortizationSchedule(principal, interestRate, tenureMonths, new Date(), 1, calculatedEmi);
      setPreviewTotalInterest(calculateTotalInterest(schedule));

      // Auto-fill EMI amount if it's 0 or if it matches our LAST auto-calculation
      if (emiAmount === 0 || Math.abs(emiAmount - lastAutoCalculatedEmi.current) < 1) {
          setValue('emiAmount', calculatedEmi);
          lastAutoCalculatedEmi.current = calculatedEmi;
      }
    } else {
      setPreviewEmi(null);
      setPreviewTotalInterest(null);
    }
  }, [principal, interestRate, tenureMonths]);


  const onSubmit = async (data: LoanFormValues) => {
    try {
      setIsSubmitting(true);
      const startDate = new Date(data.startDate);
      
      const interestRateHistory = data.interestType === 'floating' ? [{
          id: Date.now().toString(),
          effectiveDate: startDate,
          interestRate: data.interestRate,
          emiAmount: data.emiAmount,
          remarks: 'Initial Rate'
      }] : [];

      await addLoan({
        ...data,
        startDate,
        interestRateHistory
      });
      
      toast({
        title: 'Success',
        description: 'Loan added successfully',
      });
      
      reset();
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to add loan',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Loan</DialogTitle>
          <DialogDescription>
            Enter your loan details to track and generate an amortization schedule.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Home Loan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank / Institution</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Chase Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (% p.a.)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tenureMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenure (Months)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="interestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="floating">Floating</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calculator className="h-5 w-5" />
                  <span>Calculated EMI:</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    {previewEmi !== null ? `$${previewEmi.toFixed(2)}` : '--'}
                  </div>
                  {previewTotalInterest !== null && (
                    <div className="text-xs text-muted-foreground">
                      Total Interest: ${previewTotalInterest.toFixed(2)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emiAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual EMI (Override)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emiDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EMI Due Date (Day)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="31" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
             <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Loan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
