'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useLoans } from '@/hooks/use-loans';
import { generateAmortizationSchedule, calculateTotalInterest, getOutstandingBalance } from '@/lib/loan-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building, Calendar, DollarSign, Percent, ScrollText, Trash2, PlusCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { AddRevisionDialog } from './AddRevisionDialog';

export function LoanDetailsView({ loanId }: { loanId: string }) {
  const { loans, isLoading, deleteLoan } = useLoans();
  const router = useRouter();
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  
  const loan = useMemo(() => loans.find(l => l.id === loanId), [loans, loanId]);

  const { schedule, baseSchedule, totalInterest, baseTotalInterest, outstanding, chartData } = useMemo(() => {
    if (!loan) return { schedule: [], baseSchedule: [], totalInterest: 0, baseTotalInterest: 0, outstanding: 0, chartData: [] };
    
    // Schedule WITH floating rate revisions
    const sched = generateAmortizationSchedule(loan.principal, loan.interestRate, loan.tenureMonths, loan.startDate, loan.emiDueDate, loan.emiAmount, loan.interestRateHistory);
    const totInt = calculateTotalInterest(sched);
    const outBal = getOutstandingBalance(sched);
    
    // Base schedule (if rates never changed) for analytics
    const bSched = generateAmortizationSchedule(loan.principal, loan.interestRate, loan.tenureMonths, loan.startDate, loan.emiDueDate, loan.emiAmount, []);
    const bTotInt = calculateTotalInterest(bSched);

    const data = sched.map(entry => ({
      name: format(entry.dueDate, 'MMM yy'),
      balance: entry.outstandingBalance,
      principalPaid: loan.principal - entry.outstandingBalance,
      dueDate: entry.dueDate,
    })).filter((_, i) => i % Math.max(1, Math.floor(sched.length / 12)) === 0 || i === sched.length - 1); // Sample data for chart

    return { schedule: sched, baseSchedule: bSched, totalInterest: totInt, baseTotalInterest: bTotInt, outstanding: outBal, chartData: data };
  }, [loan]);

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!loan) return <div>Loan not found</div>;

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
        await deleteLoan(loan.id);
        router.push('/loans');
    }
  };

  const progress = ((loan.principal - outstanding) / loan.principal) * 100;
  
  // Figure out current active rate and EMI for display
  let currentActiveEmi = loan.emiAmount;
  let currentActiveRate = loan.interestRate;
  if (loan.interestRateHistory && loan.interestRateHistory.length > 0) {
      const sortedHist = [...loan.interestRateHistory].sort((a,b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
      const applicableRev = sortedHist.filter(h => h.effectiveDate <= new Date()).pop();
      if (applicableRev) {
          currentActiveEmi = applicableRev.emiAmount;
          currentActiveRate = applicableRev.interestRate;
      }
  }

  const sortedHistory = loan.interestRateHistory ? [...loan.interestRateHistory].sort((a,b) => a.effectiveDate.getTime() - b.effectiveDate.getTime()) : [];
  const interestDifference = baseTotalInterest - totalInterest; // Positive = Saved, Negative = Lost

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{loan.name}</h2>
          <p className="text-muted-foreground flex items-center mt-1">
            <Building className="w-4 h-4 mr-1" /> {loan.bank}
            {loan.accountNumber && <span className="ml-2 px-2 py-0.5 bg-muted rounded text-xs">Acc: {loan.accountNumber}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm py-1">
                {loan.interestType === 'fixed' ? 'Fixed Rate' : 'Floating Rate'}
            </Badge>
            {loan.interestType === 'floating' && (
                <Button variant="outline" onClick={() => setIsRevisionDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Rate Revision
                </Button>
            )}
            <Button variant="destructive" size="icon" onClick={handleDelete} title="Delete Loan">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${loan.principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Original Amount</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Interest Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentActiveRate}%</div>
            {currentActiveRate !== loan.interestRate && (
                <p className="text-xs text-muted-foreground">Started at {loan.interestRate}%</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current EMI</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentActiveEmi.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
             {currentActiveEmi !== loan.emiAmount && (
                <p className="text-xs text-muted-foreground">Started at ${loan.emiAmount.toFixed(2)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Repayment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total Principal Repayable</span>
                    <span className="font-medium">${loan.principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total Interest Payable</span>
                    <span className="font-medium text-destructive">${totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center py-2 font-bold text-lg">
                    <span>Total Cost of Loan</span>
                    <span>${(loan.principal + totalInterest).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                
                {loan.interestType === 'floating' && sortedHistory.length > 1 && (
                     <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">Impact of Rate Changes:</p>
                        <div className="flex items-center gap-2">
                            {interestDifference > 0 ? (
                                <><TrendingDown className="h-5 w-5 text-green-500" /> <span className="font-semibold text-green-600">Saved ${interestDifference.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></>
                            ) : interestDifference < 0 ? (
                                <><TrendingUp className="h-5 w-5 text-red-500" /> <span className="font-semibold text-red-600">Lost ${Math.abs(interestDifference).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></>
                            ) : (
                                <span className="font-semibold text-muted-foreground">No net impact on interest</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Compared to original fixed schedule</p>
                    </div>
                )}
                
                <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Start Date</span>
                        <span>{format(loan.startDate, 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Revised Maturity Date</span>
                        <span>{schedule.length > 0 ? format(schedule[schedule.length - 1].dueDate, 'dd MMM yyyy') : '--'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Revised Total Tenure</span>
                        <span>{schedule.length} Months ({Math.floor(schedule.length / 12)} Yr {schedule.length % 12} Mo)</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Balance Over Time</CardTitle>
                <CardDescription>Projected outstanding principal vs repaid principal</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                        <YAxis tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} fontSize={12} />
                        <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`} />
                        <Legend />
                        <Area type="monotone" dataKey="balance" name="Outstanding" stroke="#ef4444" fillOpacity={1} fill="url(#colorBalance)" />
                        <Area type="monotone" dataKey="principalPaid" name="Paid Principal" stroke="#22c55e" fillOpacity={1} fill="url(#colorPaid)" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
      
      {loan.interestType === 'floating' && sortedHistory.length > 0 && (
          <Card>
              <CardHeader>
                  <CardTitle>Interest Rate Timeline</CardTitle>
                  <CardDescription>History of rate revisions and their effective dates.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="flex flex-col space-y-4">
                      {sortedHistory.map((rev, index) => (
                          <div key={rev.id} className="flex items-start">
                              <div className="flex flex-col items-center mr-4">
                                  <div className="w-3 h-3 rounded-full bg-primary mt-1.5" />
                                  {index < sortedHistory.length - 1 && <div className="w-0.5 h-12 bg-border my-1" />}
                              </div>
                              <div className="flex-1 pb-4">
                                  <div className="flex items-center gap-2">
                                      <span className="font-semibold">{format(rev.effectiveDate, 'dd MMM yyyy')}</span>
                                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-bold text-primary">{rev.interestRate}%</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                      Revised EMI: ${rev.emiAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                  {rev.remarks && <p className="text-sm text-muted-foreground italic mt-0.5">"{rev.remarks}"</p>}
                              </div>
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Amortization Schedule</CardTitle>
          <CardDescription>Detailed month-by-month breakdown of your EMI payments.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="max-h-[600px] overflow-auto rounded-md border">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 shadow-sm">
                <TableRow>
                    <TableHead className="w-[80px]">No.</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">EMI</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right text-destructive">Interest</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {schedule.map((entry) => {
                    // Highlight rows where rate changes
                    const isRateChangeMonth = sortedHistory.some(h => format(h.effectiveDate, 'MMM yyyy') === format(entry.dueDate, 'MMM yyyy'));
                    
                    return (
                        <TableRow key={entry.emiNumber} className={entry.outstandingBalance === 0 ? "bg-muted/50 font-medium" : (isRateChangeMonth ? "bg-primary/5" : "")}>
                            <TableCell>{entry.emiNumber}</TableCell>
                            <TableCell>
                                {format(entry.dueDate, 'dd MMM yyyy')}
                                {isRateChangeMonth && <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1">Rate Changed</Badge>}
                            </TableCell>
                            <TableCell className="text-right">${entry.emiAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">${entry.principalComponent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-destructive">${entry.interestComponent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">${entry.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <AddRevisionDialog isOpen={isRevisionDialogOpen} setIsOpen={setIsRevisionDialogOpen} loan={loan} />
    </div>
  );
}
