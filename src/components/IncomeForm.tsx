'use client';

import { useTransition, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/use-currency';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { useTransactions } from '@/hooks/use-transactions';

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
import { Textarea } from '@/components/ui/textarea';
import type { Transaction } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AutoFormatDateInput } from '@/components/ui/auto-format-date-input';


const dateSchema = z.string().refine((val) => {
    if (!val || val.split('-').length !== 3) return false;
    const [day, month, year] = val.split('-').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}, { message: "Invalid date. Please use DD-MM-YYYY format." });


const IncomeFormSchema = z.object({
  reason: z.string().min(1, 'Source is required.'),
  amount: z.coerce.number({invalid_type_error: "Please enter a valid number."}).positive('Amount must be a positive number.'),
  date: dateSchema,
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  notes: z.string().optional(),
});

type IncomeFormValues = z.infer<typeof IncomeFormSchema>;

interface IncomeFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  transaction?: Transaction;
}

function formatDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function parseDateFromDDMMYYYY(dateString: string): Date {
  const [day, month, year] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function IncomeForm({ isOpen, setIsOpen, transaction }: IncomeFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { paymentMethods } = usePaymentMethods();
  const { addTransaction, updateTransaction } = useTransactions();

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(IncomeFormSchema),
    defaultValues: {
      reason: '',
      amount: '' as any,
      date: '',
      paymentMethod: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        form.reset({
          reason: transaction.reason,
          amount: transaction.amount,
          date: formatDateToDDMMYYYY(new Date(transaction.date)),
          paymentMethod: transaction.paymentMethod,
          notes: transaction.notes,
        });
      } else {
          form.reset({
              reason: '',
              amount: '' as any,
              date: formatDateToDDMMYYYY(new Date()),
              paymentMethod: '',
              notes: '',
          });
      }
    }
  }, [transaction, form, isOpen]);

  const onSubmit = (values: IncomeFormValues) => {
     const transactionData: Omit<Transaction, 'id'> = {
        type: 'income' as const,
        reason: values.reason,
        amount: values.amount,
        date: parseDateFromDDMMYYYY(values.date),
        paymentMethod: values.paymentMethod,
        category: 'income',
      };

      if (values.notes) {
        transactionData.notes = values.notes;
      }

    startTransition(async () => {
        try {
            if (transaction) {
                await updateTransaction(transaction.id, transactionData);
                toast({ title: 'Income updated!', description: 'Your income has been successfully recorded.' });
            } else {
                await addTransaction(transactionData);
                toast({ title: 'Income added!', description: 'Your income has been successfully recorded.' });
            }
            setIsOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'An error occurred',
                description: error.message || 'Failed to save transaction.',
            });
        }
    });
  };

  const title = transaction ? 'Edit Income' : 'Add New Income';
  const description = transaction ? 'Change the details of your income.' : "Fill in the details of your income. Click save when you're done.";
  const buttonText = transaction ? 'Save Changes' : 'Save Income';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Income Source</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Salary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ({currency})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" step="0.01" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date (DD-MM-YYYY)</FormLabel>
                       <AutoFormatDateInput
                            value={field.value}
                            onChange={field.onChange}
                       />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode of Payment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes <span className="text-muted-foreground">(Optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any extra details here..."
                        className="resize-none"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {buttonText}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
