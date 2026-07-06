
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Transaction, InvestmentCategory } from '@/lib/types';
import { useCurrency } from '@/hooks/use-currency';
import { Skeleton } from './ui/skeleton';
import { Pie, PieChart, Cell, TooltipPayload } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface InvestmentSummaryProps {
  transactions: Transaction[];
  investmentCategories: InvestmentCategory[];
}

export function InvestmentSummary({ transactions, investmentCategories }: InvestmentSummaryProps) {
  const { formatCurrency, isInitialized } = useCurrency();

  const totalIncome = React.useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalInvestment = transactions
    .filter(t => t.category === 'investment')
    .reduce((sum, t) => sum + t.amount, 0);

  const investmentData = React.useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};

    transactions
      .filter((t) => t.category === 'investment' && t.investmentCategory)
      .forEach((t) => {
        if (t.investmentCategory) {
          if (!categoryTotals[t.investmentCategory]) {
            categoryTotals[t.investmentCategory] = 0;
          }
          categoryTotals[t.investmentCategory] += t.amount;
        }
      });

    return Object.entries(categoryTotals)
      .map(([categoryId, total], index) => {
        const categoryInfo = investmentCategories.find((c) => c.id === categoryId);
        return {
          name: categoryInfo ? categoryInfo.label : 'Other',
          total: total,
          fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [transactions, investmentCategories]);

  const chartConfig = React.useMemo(() => {
    const config: any = {};
    investmentData.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    return config;
  }, [investmentData]);

  const hasInvestments = totalInvestment > 0;

  const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const investmentValue = data.total;
      const percentage = totalIncome > 0 ? (investmentValue / totalIncome) * 100 : 0;
      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-xl">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(investmentValue)} ({percentage.toFixed(1)}% of income)
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="col-span-4 lg:col-span-1 flex flex-col">
      <CardHeader>
        <CardTitle>Investments</CardTitle>
        <CardDescription>Allocation for the selected period.</CardDescription>
      </CardHeader>
       <CardContent className="flex-1 flex flex-col justify-center items-center p-4">
        {hasInvestments ? (
           <div className="relative w-full h-full max-h-[300px] aspect-square">
            <ChartContainer
                config={chartConfig}
                className="w-full h-full"
            >
                <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={<CustomTooltip />}
                />
                <Pie
                    data={investmentData}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={1}
                    labelLine={true}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                    {investmentData.map((entry) => (
                    <Cell
                        key={`cell-${entry.name}`}
                        fill={entry.fill}
                        className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    ))}
                </Pie>
                </PieChart>
            </ChartContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <p className="text-xs text-muted-foreground">Total Invested</p>
                {isInitialized ? (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-bold">{formatCurrency(totalInvestment)}</p>
                  </div>
                ) : <Skeleton className="h-6 w-24 mx-auto" />}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-center gap-2 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No investment data for this period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
