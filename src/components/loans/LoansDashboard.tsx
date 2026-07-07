'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLoans } from '@/hooks/use-loans';
import { AddLoanForm } from './AddLoanForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building, Calendar, IndianRupee, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { generateAmortizationSchedule, getOutstandingBalance } from '@/lib/loan-utils';
import { formatINR } from '@/lib/format-inr';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export function LoansDashboard() {
  const { loans, isLoading } = useLoans();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Aggregate calculations
  const aggregatedData = useMemo(() => {
    let totalOutstanding = 0;
    let totalEmi = 0;
    let totalPrincipal = 0;
    const chartData: any[] = [];

    loans.forEach(loan => {
      const schedule = generateAmortizationSchedule(
        loan.principal, loan.interestRate, loan.tenureMonths,
        loan.startDate, loan.emiDueDate, loan.emiAmount, loan.interestRateHistory
      );
      const outstanding = getOutstandingBalance(schedule);
      
      totalOutstanding += outstanding;
      // Use current active EMI for floating loans
      let activeEmi = loan.emiAmount;
      if (loan.interestRateHistory && loan.interestRateHistory.length > 0) {
        const sorted = [...loan.interestRateHistory].sort((a,b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
        const applicable = sorted.filter(h => h.effectiveDate <= new Date()).pop();
        if (applicable) activeEmi = applicable.emiAmount;
      }
      totalEmi += activeEmi;
      totalPrincipal += loan.principal;

      chartData.push({
        name: loan.name,
        value: outstanding
      });
    });

    return {
      totalOutstanding,
      totalEmi,
      totalPrincipal,
      chartData
    };
  }, [loans]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
           <Skeleton className="h-8 w-48" />
           <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Loan Management</h2>
        <Button onClick={() => setIsAddFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Loan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(aggregatedData.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Original Principal: {formatINR(aggregatedData.totalPrincipal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly EMI</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(aggregatedData.totalEmi)}/mo</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregatedData.totalPrincipal > 0 
                ? (((aggregatedData.totalPrincipal - aggregatedData.totalOutstanding) / aggregatedData.totalPrincipal) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Principal repaid</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Your Loans</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {loans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No loans added yet.
              </div>
            ) : (
              loans.map(loan => {
                 const schedule = generateAmortizationSchedule(loan.principal, loan.interestRate, loan.tenureMonths, loan.startDate, loan.emiDueDate, loan.emiAmount);
                 const outstanding = getOutstandingBalance(schedule);
                 const progress = ((loan.principal - outstanding) / loan.principal) * 100;

                 return (
                  <Link href={`/loans/${loan.id}`} key={loan.id} className="block group">
                    <div className="flex items-center justify-between p-4 border rounded-lg transition-colors group-hover:border-primary group-hover:bg-muted/50">
                      <div className="space-y-1">
                        <p className="font-medium leading-none">{loan.name}</p>
                        <p className="text-sm text-muted-foreground">{loan.bank}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-medium">Outstanding: {formatINR(outstanding)}</p>
                        <p className="text-sm text-muted-foreground">EMI: {formatINR(loan.emiAmount)} / mo</p>
                      </div>
                    </div>
                  </Link>
                 )
              })
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Outstanding Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[300px]">
            {loans.length > 0 && aggregatedData.totalOutstanding > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aggregatedData.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {aggregatedData.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatINR(value), '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Not enough data for chart.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddLoanForm isOpen={isAddFormOpen} setIsOpen={setIsAddFormOpen} />
    </div>
  );
}
