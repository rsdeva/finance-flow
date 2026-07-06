
'use client';

import * as React from 'react';
import { Pie, PieChart, Cell, TooltipPayload } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Transaction, ExpenseCategory } from '@/lib/types';
import { useCurrency } from '@/hooks/use-currency';

interface CategoryChartProps {
  transactions: Transaction[];
  categories: ExpenseCategory[];
}

export function CategoryChart({ transactions, categories }: CategoryChartProps) {
  const { formatCurrency } = useCurrency();

  const totalIncome = React.useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);


  const expenseData = React.useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};

    transactions
      .filter((t) => t.type === 'expense' && t.category !== 'investment')
      .forEach((t) => {
        if (t.category) {
          if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = 0;
          }
          categoryTotals[t.category] += t.amount;
        }
      });

    return Object.entries(categoryTotals)
      .map(([categoryId, total], index) => {
        const categoryInfo = categories.find((c) => c.id === categoryId);
        return {
          name: categoryInfo ? categoryInfo.label : 'Other',
          total: total,
          fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories]);

  const chartConfig = React.useMemo(() => {
    const config: any = {};
    expenseData.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    return config;
  }, [expenseData]);

  const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const expenseValue = data.total;
      const percentage = totalIncome > 0 ? (expenseValue / totalIncome) * 100 : 0;
      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-xl">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(expenseValue)} ({percentage.toFixed(1)}% of income)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="flex flex-col col-span-4 lg:col-span-1">
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>
          Category-wise spending for the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {expenseData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<CustomTooltip />}
              />
              <Pie
                data={expenseData}
                dataKey="total"
                nameKey="name"
                innerRadius={60}
                strokeWidth={1}
                labelLine={true}
                label={({
                    percent,
                  }) => `${(percent * 100).toFixed(0)}%`
                  }
              >
                {expenseData.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={entry.fill}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No expense data for this period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
