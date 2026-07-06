'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';
import { useCurrency } from '@/hooks/use-currency';
import { TrendingDown, Scale, Landmark, PiggyBank } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';

export function FilteredSummary({ transactions }: { transactions: Transaction[] }) {
  const { formatCurrency, isInitialized } = useCurrency();

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalInvestment = transactions
    .filter(t => t.category === 'investment')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const investmentPercentage = totalIncome > 0 ? (totalInvestment / totalIncome) * 100 : 0;

  const balance = totalIncome - totalExpenses;

  return (
    <Card className="col-span-4 md:col-span-2 lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Summary</CardTitle>
        <CardDescription>Income and expenses for the selected period.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-green-500" />
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
        <Separator />
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Invested</span>
            </div>
            {isInitialized ? (
                <div className="text-lg font-bold text-primary">
                    {investmentPercentage.toFixed(1)}%
                </div>
            ) : <Skeleton className="h-6 w-20" /> }
        </div>
      </CardContent>
    </Card>
  );
}
