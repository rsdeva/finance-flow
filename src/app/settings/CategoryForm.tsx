'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCategories } from '@/hooks/use-categories';
import { useToast } from '@/hooks/use-toast';
import { iconNames, getIcon } from '@/components/icons';

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
import type { ExpenseCategory } from '@/lib/types';
import { useEffect, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

const CategoryFormSchema = z.object({
  label: z.string().min(1, 'Label is required.'),
  icon: z.string().min(1, 'An icon is required.'),
});

type CategoryFormValues = z.infer<typeof CategoryFormSchema>;

interface CategoryFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  category?: ExpenseCategory;
}

export function CategoryForm({ isOpen, setIsOpen, category }: CategoryFormProps) {
  const { addCategory, updateCategory } = useCategories();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
  });

  useEffect(() => {
    if (category) {
      form.reset({
        label: category.label,
        icon: category.icon,
      });
    } else {
      form.reset({
        label: '',
        icon: '',
      });
    }
  }, [category, isOpen, form]);

  const onSubmit = (values: CategoryFormValues) => {
    startTransition(async () => {
      try {
        if (category) {
          await updateCategory(category.id, values);
          toast({ title: 'Category updated successfully!' });
        } else {
          await addCategory(values);
          toast({ title: 'Category added successfully!' });
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
          <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {category ? 'Change the details of your category.' : 'Create a new category for your expenses.'}
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
                    <Input placeholder="e.g., Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconNames.map((iconName) => {
                        const Icon = getIcon(iconName);
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                              <span>{iconName}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
