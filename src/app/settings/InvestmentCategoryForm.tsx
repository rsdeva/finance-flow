'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInvestmentCategories } from '@/hooks/use-investment-categories';
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
import type { InvestmentCategory } from '@/lib/types';
import { useEffect, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

const InvestmentCategoryFormSchema = z.object({
  label: z.string().min(1, 'Label is required.'),
});

type InvestmentCategoryFormValues = z.infer<typeof InvestmentCategoryFormSchema>;

interface InvestmentCategoryFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  category?: InvestmentCategory;
}

export function InvestmentCategoryForm({ isOpen, setIsOpen, category }: InvestmentCategoryFormProps) {
  const { addInvestmentCategory, updateInvestmentCategory } = useInvestmentCategories();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<InvestmentCategoryFormValues>({
    resolver: zodResolver(InvestmentCategoryFormSchema),
  });

  useEffect(() => {
    if (category) {
      form.reset({ label: category.label });
    } else {
      form.reset({ label: '' });
    }
  }, [category, isOpen, form]);

  const onSubmit = (values: InvestmentCategoryFormValues) => {
    startTransition(async () => {
      try {
        if (category) {
          await updateInvestmentCategory(category.id, values);
          toast({ title: 'Investment category updated successfully!' });
        } else {
          await addInvestmentCategory(values);
          toast({ title: 'Investment category added successfully!' });
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
          <DialogTitle>{category ? 'Edit Investment Category' : 'Add New Investment Category'}</DialogTitle>
          <DialogDescription>
            {category ? 'Change the details of your investment category.' : 'Create a new category for your investments.'}
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
                    <Input placeholder="e.g., Stocks" {...field} />
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
