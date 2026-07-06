
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';
import { useCurrency } from '@/hooks/use-currency';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';

export function MonthlySummary({ transactions }: { transactions: Transaction[] }) {
  const { formatCurrency, isInitialized } = useCurrency();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  });

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  return (
    <Card className="col-span-4 md:col-span-3">
      <CardHeader>
        <CardTitle className="text-sm font-medium">This Month's Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Income</span>
            </div>
            {isInitialized ? (
                <div className="text-lg font-bold text-green-600">
                    {formatCurrency(totalIncome)}
                </div>
            ) : <Skeleton className="h-6 w-28" /> }
        </div>
        <Separator />
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <span className="text-sm text-muted-foreground">Expenses</span>
            </div>
            {isInitialized ? (
                <div className="text-lg font-bold text-red-600">
                    {formatCurrency(totalExpenses)}
                </div>
             ) : <Skeleton className="h-6 w-28" /> }
        </div>
        <Separator />
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-semibold">Balance</span>
            </div>
            {isInitialized ? (
                <div className="text-xl font-bold">
                    {formatCurrency(balance)}
                </div>
            ) : <Skeleton className="h-7 w-32" /> }
        </div>
      </CardContent>
    </Card>
  );
}
