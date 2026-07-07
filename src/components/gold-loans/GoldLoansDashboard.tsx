'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useGoldLoans } from '@/hooks/use-gold-loans';
import { AddGoldLoanForm } from './AddGoldLoanForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Coins, IndianRupee, TrendingUp, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateGoldLoanState } from '@/lib/gold-loan-utils';
import { formatINR } from '@/lib/format-inr';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, startOfDay } from 'date-fns';

export function GoldLoansDashboard() {
  const { goldLoans, goldLoanPayments, isLoading, deleteGoldLoan } = useGoldLoans();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const handleDeleteLoan = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm(`Are you sure you want to delete the gold loan "${name}"? This will also delete all associated payments.`)) {
      try {
        await deleteGoldLoan(id);
      } catch (error) {
        console.error('Failed to delete gold loan', error);
      }
    }
  };

  const aggregatedData = useMemo(() => {
    let totalPrincipal = 0;
    let totalOutstanding = 0;
    let totalInterestAccrued = 0;
    const chartData: any[] = [];
    const activeLoans = goldLoans.filter(l => l.status === 'active');

    activeLoans.forEach(loan => {
      const payments = goldLoanPayments.filter(p => p.loanId === loan.id);
      const state = calculateGoldLoanState(loan, payments);
      
      totalPrincipal += state.currentPrincipal;
      totalOutstanding += state.totalOutstanding;
      totalInterestAccrued += state.totalInterestAccrued;

      chartData.push({
        name: loan.name,
        value: state.totalOutstanding
      });
    });

    return {
      totalPrincipal,
      totalOutstanding,
      totalInterestAccrued,
      chartData,
      activeLoansCount: activeLoans.length
    };
  }, [goldLoans, goldLoanPayments]);

  if (isLoading) {
    return (
      <div className="space-y-6">
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

  const COLORS = ['#FFD700', '#FFA500', '#FF8C00', '#FF4500', '#FFD700'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gold Loans</h2>
        <Button onClick={() => setIsAddFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Gold Loan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Gold Loans</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedData.activeLoansCount}</div>
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
              Principal: {formatINR(aggregatedData.totalPrincipal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest Accrued</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatINR(aggregatedData.totalInterestAccrued)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Your Gold Loans</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {goldLoans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No gold loans added yet.
              </div>
            ) : (
              goldLoans.map(loan => {
                 const payments = goldLoanPayments.filter(p => p.loanId === loan.id);
                 const state = calculateGoldLoanState(loan, payments);
                 
                 const maturityDays = loan.maturityDate 
                    ? differenceInDays(startOfDay(loan.maturityDate), startOfDay(new Date()))
                    : null;

                 return (
                  <div key={loan.id} className="relative group">
                    <Link href={`/gold-loans/${loan.id}`} className="block">
                      <div className="flex items-center justify-between p-4 border rounded-lg transition-colors group-hover:border-primary group-hover:bg-muted/50 pr-12">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium leading-none">{loan.name}</p>
                            {loan.status === 'closed' ? (
                               <Badge variant="secondary">Closed</Badge>
                            ) : maturityDays !== null && maturityDays < 30 ? (
                               <Badge variant="destructive">Matures in {maturityDays} days</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">{loan.bank} • {loan.goldWeight}g {loan.goldPurity}</p>
                          <p className="text-xs text-primary mt-1">Accrued Interest: {formatINR(state.outstandingInterest)}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-medium">Total: {formatINR(state.totalOutstanding)}</p>
                          <p className="text-sm text-muted-foreground">Principal: {formatINR(state.currentPrincipal)}</p>
                        </div>
                      </div>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteLoan(loan.id, loan.name, e)}
                      title="Delete Loan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                 )
              })
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Liability Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[300px]">
            {aggregatedData.chartData.length > 0 && aggregatedData.totalOutstanding > 0 ? (
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

      <AddGoldLoanForm isOpen={isAddFormOpen} setIsOpen={setIsAddFormOpen} />
    </div>
  );
}
