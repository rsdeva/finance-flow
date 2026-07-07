'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLoans } from '@/hooks/use-loans';
import { Loan, InterestRateRevision } from '@/lib/types';
import { calculateEMI, calculateNewTenure, generateAmortizationSchedule, getOutstandingBalance } from '@/lib/loan-utils';
import { formatINR } from '@/lib/format-inr';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';

const revisionSchema = z.object({
  effectiveDate: z.string().min(1, 'Date is required'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  recalcOption: z.enum(['keep_emi', 'keep_tenure', 'manual_emi', 'manual_tenure']),
  manualEmi: z.coerce.number().optional(),
  manualTenure: z.coerce.number().optional(),
  remarks: z.string().optional(),
});

type RevisionFormValues = z.infer<typeof revisionSchema>;

interface AddRevisionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  loan: Loan;
}

export function AddRevisionDialog({ isOpen, setIsOpen, loan }: AddRevisionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewEmi, setPreviewEmi] = useState<number | null>(null);
  const [previewTenure, setPreviewTenure] = useState<number | null>(null);
  const { updateLoan } = useLoans();
  const { toast } = useToast();

  const form = useForm<RevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      effectiveDate: new Date().toISOString().split('T')[0],
      interestRate: loan.interestRate,
      recalcOption: 'keep_tenure',
      manualEmi: loan.emiAmount,
      manualTenure: 12,
      remarks: '',
    },
  });

  const { watch, handleSubmit, reset, setValue } = form;

  const effectiveDate = watch('effectiveDate');
  const interestRate = watch('interestRate');
  const recalcOption = watch('recalcOption');
  const manualEmi = watch('manualEmi');
  const manualTenure = watch('manualTenure');

  useEffect(() => {
    if (!effectiveDate || interestRate === undefined) return;

    // Calculate outstanding balance right before this new effective date
    const targetDate = new Date(effectiveDate);
    const schedule = generateAmortizationSchedule(loan.principal, loan.interestRate, loan.tenureMonths, loan.startDate, loan.emiDueDate, loan.emiAmount, loan.interestRateHistory);
    
    // Find the outstanding balance at this point in time
    const outstanding = getOutstandingBalance(schedule, targetDate);
    
    // Find remaining months if nothing changed
    const lastEntry = schedule.length > 0 ? schedule[schedule.length - 1] : null;
    let currentRemainingTenure = 0;
    if (lastEntry) {
       // Estimate remaining tenure based on current schedule
       const pastEntries = schedule.filter(e => e.dueDate < targetDate).length;
       currentRemainingTenure = Math.max(1, schedule.length - pastEntries);
    }
    
    // Get the previous EMI amount
    // The history is already considered in generateAmortizationSchedule. Let's just find the last paid EMI
    let currentActiveEmi = loan.emiAmount;
    if (loan.interestRateHistory && loan.interestRateHistory.length > 0) {
       const sortedHist = [...loan.interestRateHistory].sort((a,b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
       const applicableRev = sortedHist.filter(h => h.effectiveDate <= targetDate).pop();
       if (applicableRev) currentActiveEmi = applicableRev.emiAmount;
    }

    if (recalcOption === 'keep_emi') {
      const newTenure = calculateNewTenure(outstanding, interestRate, currentActiveEmi);
      setPreviewEmi(currentActiveEmi);
      setPreviewTenure(newTenure);
    } else if (recalcOption === 'keep_tenure') {
      const newEmi = calculateEMI(outstanding, interestRate, currentRemainingTenure);
      setPreviewEmi(newEmi);
      setPreviewTenure(currentRemainingTenure);
    } else if (recalcOption === 'manual_emi') {
      const newEmi = manualEmi || currentActiveEmi;
      const newTenure = calculateNewTenure(outstanding, interestRate, newEmi);
      setPreviewEmi(newEmi);
      setPreviewTenure(newTenure);
    } else if (recalcOption === 'manual_tenure') {
      const newTenure = manualTenure || currentRemainingTenure;
      const newEmi = calculateEMI(outstanding, interestRate, newTenure);
      setPreviewEmi(newEmi);
      setPreviewTenure(newTenure);
    }
    
  }, [effectiveDate, interestRate, recalcOption, manualEmi, manualTenure, loan]);

  const onSubmit = async (data: RevisionFormValues) => {
    try {
      setIsSubmitting(true);
      
      const newHistory = [...(loan.interestRateHistory || [])];
      
      // If history is completely empty, backfill the original as the first record to ensure consistency
      if (newHistory.length === 0) {
         newHistory.push({
            id: Date.now().toString() + '-base',
            effectiveDate: loan.startDate,
            interestRate: loan.interestRate,
            emiAmount: loan.emiAmount,
            remarks: 'Initial Rate'
         });
      }
      
      newHistory.push({
        id: Date.now().toString(),
        effectiveDate: new Date(data.effectiveDate),
        interestRate: data.interestRate,
        emiAmount: previewEmi || loan.emiAmount,
        remarks: data.remarks
      });

      // Destructure to explicitly exclude loan.id (prevent Firestore field overwrite)
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...loanWithoutMeta } = loan as any;
      await updateLoan(loan.id, {
        ...loanWithoutMeta,
        interestRateHistory: newHistory
      });
      
      toast({ title: 'Success', description: 'Interest rate updated successfully' });
      reset();
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to update interest rate', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Interest Rate Revision</DialogTitle>
          <DialogDescription>
            Record a change in the floating interest rate for this loan.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="effectiveDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="interestRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Interest Rate (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="recalcOption" render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>How would you like to handle this change?</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl><RadioGroupItem value="keep_emi" /></FormControl>
                      <FormLabel className="font-normal">Keep EMI the same (auto-adjust remaining tenure)</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl><RadioGroupItem value="keep_tenure" /></FormControl>
                      <FormLabel className="font-normal">Keep remaining tenure unchanged (auto-adjust EMI)</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl><RadioGroupItem value="manual_emi" /></FormControl>
                      <FormLabel className="font-normal">Manually choose a new EMI amount</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl><RadioGroupItem value="manual_tenure" /></FormControl>
                      <FormLabel className="font-normal">Manually choose a revised tenure (months)</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="grid grid-cols-2 gap-4">
                {recalcOption === 'manual_emi' && (
                    <FormField control={form.control} name="manualEmi" render={({ field }) => (
                        <FormItem>
                        <FormLabel>New EMI Amount</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                )}
                {recalcOption === 'manual_tenure' && (
                    <FormField control={form.control} name="manualTenure" render={({ field }) => (
                        <FormItem>
                        <FormLabel>New Remaining Tenure (Months)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                )}
            </div>
            
            <FormField control={form.control} name="remarks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g. RBI Repo Rate Cut" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />

            <Card className="bg-muted/50 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calculator className="h-5 w-5" />
                  <span>Projected Changes:</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    New EMI: {previewEmi !== null ? formatINR(previewEmi, true) : '--'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Remaining Tenure: {previewTenure !== null ? `${previewTenure} months (${Math.floor(previewTenure/12)} Yr ${previewTenure%12} Mo)` : '--'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Revision'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
