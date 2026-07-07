'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLoans } from '@/hooks/use-loans';
import { AddLoanForm } from './AddLoanForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building, Calendar, IndianRupee, TrendingDown, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { generateAmortizationSchedule, getOutstandingBalance } from '@/lib/loan-utils';
import { formatINR } from '@/lib/format-inr';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, isSameMonth, parseISO, startOfDay, isBefore } from 'date-fns';
import { Input } from '@/components/ui/input';

export function LoansDashboard() {
  const { loans, isLoading, deleteLoan } = useLoans();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const handleDeleteLoan = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm(`Are you sure you want to delete the loan "${name}"? This action cannot be undone.`)) {
      try {
        await deleteLoan(id);
      } catch (error) {
        console.error('Failed to delete loan', error);
      }
    }
  };

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

  // Monthly breakdown calculation
  const monthlyBreakdown = useMemo(() => {
    const targetDate = parseISO(`${selectedMonth}-01`);
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalEmi = 0;
    const loanDetails: any[] = [];

    loans.forEach(loan => {
      const schedule = generateAmortizationSchedule(loan.principal, loan.interestRate, loan.tenureMonths, loan.startDate, loan.emiDueDate, loan.emiAmount, loan.interestRateHistory);
      const entry = schedule.find(e => isSameMonth(e.dueDate, targetDate));
      
      if (entry) {
        totalPrincipal += entry.principalComponent;
        totalInterest += entry.interestComponent;
        totalEmi += entry.emiAmount;
        loanDetails.push({
          name: loan.name,
          principal: entry.principalComponent,
          interest: entry.interestComponent,
          emi: entry.emiAmount,
        });
      }
    });

    return { totalPrincipal, totalInterest, totalEmi, loanDetails };
  }, [loans, selectedMonth]);

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
                 const schedule = generateAmortizationSchedule(loan.principal, loan.interestRate, loan.tenureMonths, loan.startDate, loan.emiDueDate, loan.emiAmount, loan.interestRateHistory);
                 const outstanding = getOutstandingBalance(schedule);
                 const progress = ((loan.principal - outstanding) / loan.principal) * 100;
                 
                 const today = startOfDay(new Date());
                 const pendingMonths = schedule.filter(e => !isBefore(startOfDay(e.dueDate), today)).length;

                 let activeEmi = loan.emiAmount;
                 if (loan.interestRateHistory && loan.interestRateHistory.length > 0) {
                   const sorted = [...loan.interestRateHistory].sort((a,b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
                   const applicable = sorted.filter(h => h.effectiveDate <= new Date()).pop();
                   if (applicable) activeEmi = applicable.emiAmount;
                 }

                 return (
                  <div key={loan.id} className="relative group">
                    <Link href={`/loans/${loan.id}`} className="block">
                      <div className="flex items-center justify-between p-4 border rounded-lg transition-colors group-hover:border-primary group-hover:bg-muted/50 pr-12">
                        <div className="space-y-1">
                          <p className="font-medium leading-none">{loan.name}</p>
                          <p className="text-sm text-muted-foreground">{loan.bank}</p>
                          <p className="text-xs text-primary mt-1">Pending Tenure: {pendingMonths} months</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-medium">Outstanding: {formatINR(outstanding)}</p>
                          <p className="text-sm text-muted-foreground">EMI: {formatINR(activeEmi)} / mo</p>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Monthly Repayment Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">See how much principal and interest you are paying in a specific month.</p>
          </div>
          <div className="w-48">
            <Input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">Total EMI</p>
              <p className="text-2xl font-bold">{formatINR(monthlyBreakdown.totalEmi)}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-primary">Principal Component</p>
              <p className="text-2xl font-bold text-primary">{formatINR(monthlyBreakdown.totalPrincipal)}</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive">Interest Component</p>
              <p className="text-2xl font-bold text-destructive">{formatINR(monthlyBreakdown.totalInterest)}</p>
            </div>
          </div>
          
          {monthlyBreakdown.loanDetails.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBreakdown.loanDetails} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatINR(value)}
                    cursor={{ fill: 'transparent' }} 
                  />
                  <Legend />
                  <Bar dataKey="principal" name="Principal" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="interest" name="Interest" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              No active EMIs for the selected month.
            </div>
          )}
        </CardContent>
      </Card>

      <AddLoanForm isOpen={isAddFormOpen} setIsOpen={setIsAddFormOpen} />
    </div>
  );
}
