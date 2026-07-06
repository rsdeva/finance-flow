'use client';

import Link from 'next/link';
import { useCategories } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getIcon } from '@/components/icons';
import { ChevronLeft, PlusCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { CategoryForm } from './CategoryForm';
import type { ExpenseCategory, PaymentMethod, InvestmentCategory } from '@/lib/types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCurrency } from '@/hooks/use-currency';
import { currencies } from '@/lib/currencies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { PaymentMethodForm } from './PaymentMethodForm';
import { useInvestmentCategories } from '@/hooks/use-investment-categories';
import { InvestmentCategoryForm } from './InvestmentCategoryForm';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useAuth } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const { categories, deleteCategory, isCategoriesLoading } = useCategories();
  const { investmentCategories, deleteInvestmentCategory, isInvestmentCategoriesLoading } = useInvestmentCategories();
  const { currency: currentCurrency, setCurrency: saveCurrency, isInitialized: isCurrencyInitialized } = useCurrency();
  const { paymentMethods, deletePaymentMethod, isPaymentMethodsLoading } = usePaymentMethods();
  const { toast } = useToast();
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const auth = useAuth();

  const [isPending, startTransition] = useTransition();

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | undefined>(undefined);
  
  const [isPaymentMethodFormOpen, setIsPaymentMethodFormOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | undefined>(undefined);

  const [isInvestmentCategoryFormOpen, setIsInvestmentCategoryFormOpen] = useState(false);
  const [editingInvestmentCategory, setEditingInvestmentCategory] = useState<InvestmentCategory | undefined>(undefined);

  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (user) {
        setDisplayName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    if (isCurrencyInitialized) {
      setSelectedCurrency(currentCurrency);
    }
  }, [isCurrencyInitialized, currentCurrency]);

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(undefined);
    setIsCategoryFormOpen(true);
  };

  const handleCloseCategoryForm = () => {
    setIsCategoryFormOpen(false);
    setEditingCategory(undefined);
  }

  const handleEditPaymentMethod = (method: PaymentMethod) => {
    setEditingPaymentMethod(method);
    setIsPaymentMethodFormOpen(true);
  };

  const handleAddPaymentMethod = () => {
    setEditingPaymentMethod(undefined);
    setIsPaymentMethodFormOpen(true);
  };

  const handleClosePaymentMethodForm = () => {
    setIsPaymentMethodFormOpen(false);
    setEditingPaymentMethod(undefined);
  }

  const handleEditInvestmentCategory = (category: InvestmentCategory) => {
    setEditingInvestmentCategory(category);
    setIsInvestmentCategoryFormOpen(true);
  };

  const handleAddInvestmentCategory = () => {
    setEditingInvestmentCategory(undefined);
    setIsInvestmentCategoryFormOpen(true);
  };

  const handleCloseInvestmentCategoryForm = () => {
    setIsInvestmentCategoryFormOpen(false);
    setEditingInvestmentCategory(undefined);
  }

  const handleSaveSettings = () => {
    startTransition(async () => {
        try {
            if (auth.currentUser && displayName !== auth.currentUser.displayName) {
                await updateProfile(auth.currentUser, { displayName });
            }
            await saveCurrency(selectedCurrency);
            toast({
                title: "Settings saved!",
                description: "Your preferences have been updated.",
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'An error occurred',
                description: error.message,
            });
        }
    })
  };
  
  const isLoading = isCategoriesLoading || isPaymentMethodsLoading || isInvestmentCategoriesLoading || !isCurrencyInitialized || isUserAuthLoading;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back to Dashboard</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
      </div>

      <CategoryForm
        isOpen={isCategoryFormOpen}
        setIsOpen={handleCloseCategoryForm}
        category={editingCategory}
      />
      
      <PaymentMethodForm
        isOpen={isPaymentMethodFormOpen}
        setIsOpen={handleClosePaymentMethodForm}
        paymentMethod={editingPaymentMethod}
      />

      <InvestmentCategoryForm
        isOpen={isInvestmentCategoryFormOpen}
        setIsOpen={handleCloseInvestmentCategoryForm}
        category={editingInvestmentCategory}
      />

      <Card>
        <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Manage your public profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-sm">
                <Label htmlFor="displayName">Name</Label>
                {isLoading ? <Skeleton className="h-10 w-full" /> : (
                    <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                    />
                )}
            </div>
            <div className="grid gap-2 max-w-sm">
                <Label htmlFor="email">Email</Label>
                {isLoading ? <Skeleton className="h-10 w-full" /> : (
                    <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                    />
                )}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Manage your application settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-sm">
                <Label htmlFor="currency">Currency</Label>
                 {isLoading ? <Skeleton className="h-10 w-full" /> : (
                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                        <SelectTrigger id="currency">
                            <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                        <SelectContent>
                        {currencies.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                                {c.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 )}
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Manage Categories</CardTitle>
                  <CardDescription>Add, edit, or delete your expense categories.</CardDescription>
              </div>
              <Button onClick={handleAddCategory} size="sm" disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add
              </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     Array.from({length: 3}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                        </TableRow>
                     ))
                  ) : categories.map((category) => {
                    const Icon = getIcon(category.icon);
                    const isInvestment = category.label === 'Investment';
                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                            <span>{category.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)} disabled={isInvestment}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                          </Button>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Delete category" disabled={isInvestment}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete this category.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteCategory(category.id)}>
                                          Delete
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Manage Investment Types</CardTitle>
                  <CardDescription>Add, edit, or delete your investment types.</CardDescription>
              </div>
              <Button onClick={handleAddInvestmentCategory} size="sm" disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add
              </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investment Type</TableHead>
                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     Array.from({length: 3}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                        </TableRow>
                     ))
                  ) : investmentCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.label}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEditInvestmentCategory(category)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Delete investment category">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this investment category.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteInvestmentCategory(category.id)}>
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Manage Payment Modes</CardTitle>
                  <CardDescription>Add, edit, or delete your payment methods.</CardDescription>
              </div>
              <Button onClick={handleAddPaymentMethod} size="sm" disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add
              </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     Array.from({length: 3}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                        </TableRow>
                     ))
                  ) : paymentMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">{method.label}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEditPaymentMethod(method)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Delete payment method">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this payment method.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePaymentMethod(method.id)}>
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveSettings} disabled={isPending || isLoading}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save All Settings
        </Button>
      </div>
    </div>
  );
}
