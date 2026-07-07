'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useLoans } from '@/hooks/use-loans';
import { generateAmortizationSchedule, calculateTotalInterest, getOutstandingBalance } from '@/lib/loan-utils';
import { formatINR, formatINRShort } from '@/lib/format-inr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building, Calendar, IndianRupee, Percent, ScrollText, Trash2, PlusCircle, TrendingUp, TrendingDown, ArrowRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { AddRevisionDialog } from './AddRevisionDialog';
import { AddLoanForm } from './AddLoanForm';
import { useToast } from '@/hooks/use-toast';

export function LoanDetailsView({ loanId }: { loanId: string }) {
  const { loans, isLoading, deleteLoan, deleteRateRevision } = useLoans();
  const router = useRouter();
  const { toast } = useToast();
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [deletingRevisionId, setDeletingRevisionId] = useState<string | null>(null);
  
  const loan = useMemo(() => loans.find(l => l.id === loanId), [loans, loanId]);

  const { schedule, totalInterest, baseTotalInterest, outstanding, chartData } = useMemo(() => {
    if (!loan) return { schedule: [], totalInterest: 0, baseTotalInterest: 0, outstanding: 0, chartData: [] };
    
    // Schedule WITH floating rate revisions (only user-added, never auto-generated)
    const sched = generateAmortizationSchedule(
      loan.principal, loan.interestRate, loan.tenureMonths,
      loan.startDate, loan.emiDueDate, loan.emiAmount,
      loan.interestRateHistory
    );
    const totInt = calculateTotalInterest(sched);
    const outBal = getOutstandingBalance(sched);
    
    // Base schedule (if rates never changed) for analytics
    const bSched = generateAmortizationSchedule(
      loan.principal, loan.interestRate, loan.tenureMonths,
      loan.startDate, loan.emiDueDate, loan.emiAmount, []
    );
    const bTotInt = calculateTotalInterest(bSched);

    // Sample chart data — ~24 points max for readability
    const step = Math.max(1, Math.floor(sched.length / 24));
    const data = sched
      .filter((_, i) => i % step === 0 || i === sched.length - 1)
      .map(entry => ({
        name: format(entry.dueDate, 'MMM yy'),
        balance: Math.round(entry.outstandingBalance),
        principalPaid: Math.round(loan.principal - entry.outstandingBalance),
        dueDate: entry.dueDate,
      }));

    return { schedule: sched, totalInterest: totInt, baseTotalInterest: bTotInt, outstanding: outBal, chartData: data };
  }, [loan]);

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!loan) return <div>Loan not found</div>;

  const handleDeleteLoan = async () => {
    if (window.confirm('Are you sure you want to delete this loan? This action cannot be undone.')) {
      await deleteLoan(loan.id);
      router.push('/loans');
    }
  };

  const handleDeleteRevision = async (revisionId: string, isFirstEntry: boolean) => {
    if (isFirstEntry) {
      toast({ title: 'Cannot Delete', description: 'The initial rate entry cannot be deleted.', variant: 'destructive' });
      return;
    }
    if (!window.confirm('Delete this interest rate revision? The loan will be recalculated based on remaining entries.')) return;
    
    setDeletingRevisionId(revisionId);
    try {
      await deleteRateRevision(loan.id, revisionId);
      toast({ title: 'Deleted', description: 'Interest rate revision removed. Loan recalculated.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete revision.', variant: 'destructive' });
    } finally {
      setDeletingRevisionId(null);
    }
  };

  const progress = Math.min(100, Math.max(0, ((loan.principal - outstanding) / loan.principal) * 100));

  // Current active rate & EMI (only from user-added history, no auto-generation)
  let currentActiveEmi = loan.emiAmount;
  let currentActiveRate = loan.interestRate;
  if (loan.interestRateHistory && loan.interestRateHistory.length > 0) {
    const sortedHist = [...loan.interestRateHistory].sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
    const applicableRev = sortedHist.filter(h => h.effectiveDate <= new Date()).pop();
    if (applicableRev) {
      currentActiveEmi = applicableRev.emiAmount;
      currentActiveRate = applicableRev.interestRate;
    }
  }

  // Sort history for display — strictly by user-added data, no auto-creation
  const sortedHistory = loan.interestRateHistory
    ? [...loan.interestRateHistory].sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
    : [];

  const interestDifference = baseTotalInterest - totalInterest; // Positive = Saved

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{loan.name}</h2>
          <p className="text-muted-foreground flex items-center mt-1">
            <Building className="w-4 h-4 mr-1" /> {loan.bank}
            {loan.accountNumber && (
              <span className="ml-2 px-2 py-0.5 bg-muted rounded text-xs">Acc: {loan.accountNumber}</span>
            )}
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
          <Button variant="outline" size="icon" onClick={() => setIsEditFormOpen(true)} title="Edit Loan">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDeleteLoan} title="Delete Loan">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(loan.principal)}</div>
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
            <div className="text-2xl font-bold">{formatINR(currentActiveEmi)}</div>
            {currentActiveEmi !== loan.emiAmount && (
              <p className="text-xs text-muted-foreground">Started at {formatINR(loan.emiAmount)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatINR(outstanding)}</div>
            <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(1)}% repaid</p>
          </CardContent>
        </Card>
      </div>

      {/* Repayment Summary + Chart */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Repayment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Total Principal</span>
              <span className="font-medium">{formatINR(loan.principal)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Total Interest Payable</span>
              <span className="font-medium text-destructive">{formatINR(totalInterest)}</span>
            </div>
            <div className="flex justify-between items-center py-2 font-bold text-lg">
              <span>Total Cost of Loan</span>
              <span>{formatINR(loan.principal + totalInterest)}</span>
            </div>

            {loan.interestType === 'floating' && sortedHistory.length > 1 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Impact of Rate Changes:</p>
                <div className="flex items-center gap-2">
                  {interestDifference > 0 ? (
                    <><TrendingDown className="h-5 w-5 text-green-500" /> <span className="font-semibold text-green-600">Saved {formatINR(interestDifference)}</span></>
                  ) : interestDifference < 0 ? (
                    <><TrendingUp className="h-5 w-5 text-red-500" /> <span className="font-semibold text-red-600">Extra {formatINR(Math.abs(interestDifference))}</span></>
                  ) : (
                    <span className="font-semibold text-muted-foreground">No net impact</span>
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
                <span className="text-muted-foreground">Maturity Date</span>
                <span>{schedule.length > 0 ? format(schedule[schedule.length - 1].dueDate, 'dd MMM yyyy') : '--'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining Tenure</span>
                <span>
                  {(() => {
                    const remaining = schedule.filter(e => e.outstandingBalance > 0).length;
                    return `${Math.floor(remaining / 12)} Yr ${remaining % 12} Mo (${remaining} months)`;
                  })()}
                </span>
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
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                <YAxis tickFormatter={formatINRShort} fontSize={12} width={60} />
                <RechartsTooltip formatter={(value: number) => [formatINR(value), '']} />
                <Legend />
                <Area type="monotone" dataKey="balance" name="Outstanding" stroke="#ef4444" fillOpacity={1} fill="url(#colorBalance)" />
                <Area type="monotone" dataKey="principalPaid" name="Paid Principal" stroke="#22c55e" fillOpacity={1} fill="url(#colorPaid)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Interest Rate Timeline — only user-added entries, with delete option */}
      {loan.interestType === 'floating' && sortedHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interest Rate Timeline</CardTitle>
            <CardDescription>
              History of rate revisions. Delete a revision to recalculate the loan using remaining entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              {sortedHistory.map((rev, index) => {
                const isFirst = index === 0;
                const isDeleting = deletingRevisionId === rev.id;
                return (
                  <div key={rev.id} className="flex items-start">
                    <div className="flex flex-col items-center mr-4 mt-1.5">
                      <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                      {index < sortedHistory.length - 1 && <div className="w-0.5 h-14 bg-border my-1" />}
                    </div>
                    <div className="flex-1 pb-4 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{format(rev.effectiveDate, 'dd MMM yyyy')}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold text-primary">{rev.interestRate}%</span>
                          {isFirst && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Initial</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          EMI: {formatINR(rev.emiAmount, true)}
                        </p>
                        {rev.remarks && (
                          <p className="text-sm text-muted-foreground italic mt-0.5">"{rev.remarks}"</p>
                        )}
                      </div>
                      {!isFirst && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                          disabled={isDeleting}
                          onClick={() => handleDeleteRevision(rev.id, isFirst)}
                          title="Delete this rate revision"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amortization Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Amortization Schedule</CardTitle>
          <CardDescription>Month-by-month EMI breakdown. Highlighted rows indicate rate changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[60px]">No.</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">EMI</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right text-destructive">Interest</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((entry) => {
                  const isRateChangeMonth = sortedHistory.some(
                    h => format(h.effectiveDate, 'MMM yyyy') === format(entry.dueDate, 'MMM yyyy')
                  );
                  return (
                    <TableRow
                      key={entry.emiNumber}
                      className={
                        entry.outstandingBalance === 0
                          ? 'bg-muted/50 font-medium'
                          : isRateChangeMonth
                          ? 'bg-primary/5'
                          : ''
                      }
                    >
                      <TableCell>{entry.emiNumber}</TableCell>
                      <TableCell>
                        {format(entry.dueDate, 'dd MMM yyyy')}
                        {isRateChangeMonth && (
                          <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1">Rate Changed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatINR(entry.emiAmount, true)}</TableCell>
                      <TableCell className="text-right">{formatINR(entry.principalComponent, true)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatINR(entry.interestComponent, true)}</TableCell>
                      <TableCell className="text-right">{formatINR(entry.outstandingBalance, true)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {loan.interestType === 'floating' && (
        <AddRevisionDialog 
          isOpen={isRevisionDialogOpen} 
          setIsOpen={setIsRevisionDialogOpen} 
          loan={loan} 
        />
      )}
      
      {isEditFormOpen && (
        <AddLoanForm 
          isOpen={isEditFormOpen} 
          setIsOpen={setIsEditFormOpen} 
          loanToEdit={loan} 
        />
      )}
    </div>
  );
}
