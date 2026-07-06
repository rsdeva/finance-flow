
'use client';

import type { Transaction, ExpenseCategory } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { useTransition } from 'react';
import { getIcon } from './icons';
import { useCurrency } from '@/hooks/use-currency';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { useInvestmentCategories } from '@/hooks/use-investment-categories';
import { useTransactions } from '@/hooks/use-transactions';
import { Pagination } from './Pagination';

interface ExpenseListProps {
    expenses: Transaction[];
    categories: ExpenseCategory[];
    onEdit: (transaction: Transaction) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function ExpenseList({ expenses, categories, onEdit, currentPage, totalPages, onPageChange }: ExpenseListProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const { formatCurrency, isInitialized } = useCurrency();
    const { getPaymentMethodLabel } = usePaymentMethods();
    const { getInvestmentCategoryLabel } = useInvestmentCategories();
    const { deleteTransaction } = useTransactions();

    const getCategory = (id: string) => {
        return categories.find(c => c.id === id);
    }

    const handleDelete = (id: string) => {
        startTransition(async () => {
            try {
                await deleteTransaction(id);
                toast({
                    title: "Transaction deleted",
                    description: "The transaction has been removed.",
                });
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: "Error deleting transaction",
                    description: error.message || "Could not delete transaction.",
                });
            }
        });
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                    A list of your income and expenses based on the selected filters.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Payment Mode</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[100px] text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.length > 0 ? (
                                expenses.map(transaction => {
                                    const category = transaction.type === 'expense' ? getCategory(transaction.category!) : null;
                                    const Icon = category ? getIcon(category.icon) : null;
                                    const isIncome = transaction.type === 'income';

                                    let categoryLabel: React.ReactNode;
                                    if (isIncome) {
                                        categoryLabel = <Badge variant="outline" className="text-green-600 border-green-600">Income</Badge>;
                                    } else if (category?.label === 'Investment') {
                                        const investmentLabel = transaction.investmentCategory ? getInvestmentCategoryLabel(transaction.investmentCategory) : 'Investment';
                                        categoryLabel = (
                                            <Badge variant="outline" className="flex items-center gap-2 w-fit">
                                                {Icon && <Icon className="h-3 w-3" />}
                                                {investmentLabel}
                                            </Badge>
                                        );
                                    } else {
                                        categoryLabel = (
                                            <Badge variant="outline" className="flex items-center gap-2 w-fit">
                                                {Icon && <Icon className="h-3 w-3" />}
                                                {category?.label || 'N/A'}
                                            </Badge>
                                        );
                                    }

                                    return (
                                    <TableRow key={transaction.id}>
                                        <TableCell className="text-muted-foreground">{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell className="font-medium">{transaction.reason}</TableCell>
                                        <TableCell>
                                            {categoryLabel}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{getPaymentMethodLabel(transaction.paymentMethod)}</TableCell>
                                        <TableCell className={cn(
                                            "text-right font-semibold",
                                            isIncome ? 'text-green-600' : 'text-red-600'
                                        )}>
                                            {isInitialized ? (isIncome ? '+' : '-') + formatCurrency(transaction.amount) : <Skeleton className="h-5 w-20 ml-auto" />}
                                        </TableCell>
                                        <TableCell className="text-center flex justify-center">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)}>
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" aria-label="Delete transaction" disabled={isPending}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete this transaction.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(transaction.id)} disabled={isPending}>
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )})
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No transactions found. Try adjusting your filters.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            </CardContent>
        </Card>
    );
}
