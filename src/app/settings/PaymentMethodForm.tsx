'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { useToast } from '@/hooks/use-toast';

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
import type { PaymentMethod } from '@/lib/types';
import { useEffect, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

const PaymentMethodFormSchema = z.object({
  label: z.string().min(1, 'Label is required.'),
});

type PaymentMethodFormValues = z.infer<typeof PaymentMethodFormSchema>;

interface PaymentMethodFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  paymentMethod?: PaymentMethod;
}

export function PaymentMethodForm({ isOpen, setIsOpen, paymentMethod }: PaymentMethodFormProps) {
  const { addPaymentMethod, updatePaymentMethod } = usePaymentMethods();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(PaymentMethodFormSchema),
  });

  useEffect(() => {
    if (paymentMethod) {
      form.reset({ label: paymentMethod.label });
    } else {
      form.reset({ label: '' });
    }
  }, [paymentMethod, isOpen, form]);

  const onSubmit = (values: PaymentMethodFormValues) => {
    startTransition(async () => {
      try {
        if (paymentMethod) {
          await updatePaymentMethod(paymentMethod.id, values);
          toast({ title: 'Payment method updated successfully!' });
        } else {
          await addPaymentMethod(values);
          toast({ title: 'Payment method added successfully!' });
        }
        setIsOpen(false);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: error.message,
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{paymentMethod ? 'Edit Payment Method' : 'Add New Payment Method'}</DialogTitle>
          <DialogDescription>
            {paymentMethod ? 'Change the details of your payment method.' : 'Create a new payment method.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Credit Card" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
