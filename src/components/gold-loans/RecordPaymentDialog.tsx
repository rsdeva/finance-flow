import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useGoldLoans } from '@/hooks/use-gold-loans';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  date: z.date({
    required_error: 'Payment date is required.',
  }),
  paymentType: z.enum(['interest', 'principal', 'both']),
  principalComponent: z.coerce.number().min(0).optional(),
  interestComponent: z.coerce.number().min(0).optional(),
  remarks: z.string().optional(),
}).refine(data => {
  if (data.paymentType === 'interest' && (!data.interestComponent || data.interestComponent <= 0)) {
    return false;
  }
  if (data.paymentType === 'principal' && (!data.principalComponent || data.principalComponent <= 0)) {
    return false;
  }
  if (data.paymentType === 'both') {
    if ((!data.principalComponent || data.principalComponent <= 0) && (!data.interestComponent || data.interestComponent <= 0)) {
       return false;
    }
  }
  return true;
}, {
  message: "Please enter a valid amount for the selected payment type.",
  path: ["paymentType"]
});

export function RecordPaymentDialog({
  isOpen,
  setIsOpen,
  loanId,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  loanId: string;
}) {
  const { addGoldLoanPayment } = useGoldLoans();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      paymentType: 'interest',
      principalComponent: undefined,
      interestComponent: undefined,
      remarks: '',
    },
  });

  const paymentType = form.watch('paymentType');

  useEffect(() => {
    if (isOpen) {
      form.reset({
        date: new Date(),
        paymentType: 'interest',
        principalComponent: undefined,
        interestComponent: undefined,
        remarks: '',
      });
    }
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      let principal = 0;
      let interest = 0;
      
      if (values.paymentType === 'principal' || values.paymentType === 'both') {
         principal = values.principalComponent || 0;
      }
      if (values.paymentType === 'interest' || values.paymentType === 'both') {
         interest = values.interestComponent || 0;
      }

      await addGoldLoanPayment({
        loanId,
        date: values.date,
        amount: principal + interest,
        paymentType: values.paymentType,
        principalComponent: principal,
        interestComponent: interest,
        remarks: values.remarks
      });
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Failed to record payment', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a partial or full payment for this gold loan.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date *</FormLabel>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="interest">Interest Only</SelectItem>
                      <SelectItem value="principal">Principal Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(paymentType === 'principal' || paymentType === 'both') && (
              <FormField
                control={form.control}
                name="principalComponent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal Amount Paid (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(paymentType === 'interest' || paymentType === 'both') && (
              <FormField
                control={form.control}
                name="interestComponent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Amount Paid (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Receipt number, notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
