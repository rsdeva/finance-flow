'use client';

import { useEffect, useTransition } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/use-categories';
import { getIcon } from '@/components/icons';
import { useCurrency } from '@/hooks/use-currency';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { useInvestmentCategories } from '@/hooks/use-investment-categories';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Transaction } from '@/lib/types';
import { AutoFormatDateInput } from '@/components/ui/auto-format-date-input';

const dateSchema = z.string().refine((val) => {
    if (!val || val.split('-').length !== 3) return false;
    const [day, month, year] = val.split('-').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}, { message: "Invalid date. Please use DD-MM-YYYY format." });


const ExpenseFormSchema = z.object({
  reason: z.string().min(1, 'Reason is required.'),
  amount: z.coerce.number({invalid_type_error: "Please enter a valid number."}).positive('Amount must be a positive number.'),
  date: dateSchema,
  category: z.string().min(1, 'Category is required.'),
  investmentCategory: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  notes: z.string().optional(),
}).refine((data) => {
    if (data.category === 'investment') {
        return typeof data.investmentCategory === 'string' && data.investmentCategory.length > 0;
    }
    return true;
}, {
    message: 'Investment type is required for investment expenses.',
    path: ['investmentCategory'],
});

type ExpenseFormValues = z.infer<typeof ExpenseFormSchema>;


interface ExpenseFormProps {
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

export function ExpenseForm({ isOpen, setIsOpen, transaction }: ExpenseFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { categories } = useCategories();
  const { investmentCategories } = useInvestmentCategories();
  const { currency } = useCurrency();
  const { paymentMethods } = usePaymentMethods();
  const { addTransaction, updateTransaction } = useTransactions();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: {
      reason: '',
      amount: '' as any,
      date: '',
      category: '',
      investmentCategory: '',
      paymentMethod: '',
      notes: '',
    },
  });

  const category = form.watch('category');

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        form.reset({
          reason: transaction.reason,
          amount: transaction.amount,
          date: formatDateToDDMMYYYY(new Date(transaction.date)),
          category: transaction.category,
          investmentCategory: transaction.investmentCategory,
          paymentMethod: transaction.paymentMethod,
          notes: transaction.notes,
        });
      } else {
        form.reset({
          reason: '',
          amount: '' as any,
          date: formatDateToDDMMYYYY(new Date()),
          category: '',
          investmentCategory: '',
          paymentMethod: '',
          notes: '',
        });
      }
    }
  }, [transaction, form, isOpen]);

  useEffect(() => {
    if (category !== 'investment') {
        form.setValue('investmentCategory', undefined);
    }
  }, [category, form]);

  const onSubmit = (values: ExpenseFormValues) => {
    const transactionData: Omit<Transaction, 'id'> = {
        type: 'expense' as const,
        reason: values.reason,
        amount: values.amount,
        date: parseDateFromDDMMYYYY(values.date),
        category: values.category,
        paymentMethod: values.paymentMethod,
    };

    if (values.category === 'investment' && values.investmentCategory) {
        transactionData.investmentCategory = values.investmentCategory;
    }

    if (values.notes) {
        transactionData.notes = values.notes;
    }
    
    startTransition(async () => {
        try {
            if (transaction) {
                await updateTransaction(transaction.id, transactionData);
                toast({ title: 'Expense updated!', description: 'Your expense has been successfully saved.' });
            } else {
                await addTransaction(transactionData);
                toast({ title: 'Expense added!', description: 'Your expense has been successfully saved.' });
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

  const title = transaction ? 'Edit Expense' : 'Add New Expense';
  const description = transaction ? "Change the details of your expense." : "Fill in the details of your expense. Click save when you're done.";
  const buttonText = transaction ? 'Save Changes' : 'Save Expense';

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
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dinner with friends" {...field} />
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
                            value={field.value as string}
                            onChange={field.onChange}
                       />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => {
                            const Icon = getIcon(cat.icon);
                            return (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                  <span>{cat.label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>
               {category === 'investment' && (
                 <FormField
                  control={form.control}
                  name="investmentCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an investment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investmentCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               )}
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
                <Button type="submit" disabled={isPending}>
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
