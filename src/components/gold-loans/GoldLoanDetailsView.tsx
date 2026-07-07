'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useGoldLoans } from '@/hooks/use-gold-loans';
import { calculateGoldLoanState } from '@/lib/gold-loan-utils';
import { formatINR } from '@/lib/format-inr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building, Calendar as CalendarIcon, IndianRupee, Percent, Trash2, PlusCircle, Pencil, Scale, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfMonth, addMonths, isBefore, endOfMonth } from 'date-fns';
import { AddGoldLoanForm } from './AddGoldLoanForm';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { useToast } from '@/hooks/use-toast';

export function GoldLoanDetailsView({ loanId }: { loanId: string }) {
  const { goldLoans, goldLoanPayments, isLoading, deleteGoldLoan, deleteGoldLoanPayment } = useGoldLoans();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const loan = useMemo(() => goldLoans.find(l => l.id === loanId), [goldLoans, loanId]);
  
  const payments = useMemo(() => {
    return goldLoanPayments
        .filter(p => p.loanId === loanId)
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // newest first for display
  }, [goldLoanPayments, loanId]);

  const state = useMemo(() => {
    if (!loan) return null;
    return calculateGoldLoanState(loan, payments);
  }, [loan, payments]);

  const trendData = useMemo(() => {
    if (!loan) return [];
    const data = [];
    let current = startOfMonth(loan.startDate);
    const endDate = addMonths(new Date(), 6); // Project 6 months into the future

    while (isBefore(current, endDate)) {
      // For each month, calculate the state at the end of that month
      const targetDate = endOfMonth(current);
      const pastPayments = payments.filter(p => isBefore(p.date, targetDate) || p.date.getTime() === targetDate.getTime());
      const monthState = calculateGoldLoanState(loan, pastPayments, targetDate);
      
      data.push({
        month: format(current, 'MMM yyyy'),
        principal: monthState.currentPrincipal,
        interest: monthState.outstandingInterest,
        total: monthState.totalOutstanding
      });
      
      current = addMonths(current, 1);
    }
    return data;
  }, [loan, payments]);

  const handleDeleteLoan = async () => {
    if (window.confirm('Are you sure you want to delete this gold loan? All payment history will also be permanently deleted.')) {
      try {
        await deleteGoldLoan(loanId);
        router.push('/loans?tab=gold');
        toast({ title: 'Gold Loan deleted successfully' });
      } catch (error) {
        toast({ title: 'Failed to delete loan', variant: 'destructive' });
      }
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (window.confirm('Are you sure you want to delete this payment record? This will recalculate the entire loan state.')) {
      try {
        await deleteGoldLoanPayment(paymentId);
        toast({ title: 'Payment deleted' });
      } catch (error) {
        toast({ title: 'Failed to delete payment', variant: 'destructive' });
      }
    }
  };

  if (isLoading || !loan || !state) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/loans?tab=gold')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Gold Loans
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card border rounded-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{loan.name}</h2>
            {loan.status === 'closed' ? (
              <Badge variant="secondary">Closed</Badge>
            ) : (
              <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Active</Badge>
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-4">
            <span className="flex items-center"><Building className="mr-1 h-4 w-4" /> {loan.bank}</span>
            <span className="flex items-center"><Scale className="mr-1 h-4 w-4" /> {loan.goldWeight}g {loan.goldPurity}</span>
            {loan.accountNumber && (
              <span>Acc: {loan.accountNumber}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1">
            {loan.interestType === 'fixed' ? 'Fixed Rate' : 'Floating Rate'}
          </Badge>
          <Button variant="outline" onClick={() => setIsPaymentDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Record Payment
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsEditFormOpen(true)} title="Edit Loan">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDeleteLoan} title="Delete Loan">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal Balance</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(state.currentPrincipal)}</div>
            <p className="text-xs text-muted-foreground">Original: {formatINR(loan.principal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accrued Interest</CardTitle>
            <Percent className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatINR(state.outstandingInterest)}</div>
            <p className="text-xs text-muted-foreground">Calculated up to today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liability</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatINR(state.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Principal + Accrued</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Rate</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loan.interestRate}%</div>
            <p className="text-xs text-muted-foreground capitalize">{loan.interestType} Interest</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interest Growth Trend</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Projected accrued interest and principal over time (next 6 months included).</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip 
                  formatter={(value: number) => formatINR(value)}
                  labelClassName="text-foreground font-bold"
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="principal" stackId="1" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPrincipal)" name="Principal" />
                <Area type="monotone" dataKey="interest" stackId="1" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorInterest)" name="Interest" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No payments recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(p.date, 'dd MMM yyyy')}</TableCell>
                      <TableCell className="capitalize">{p.paymentType}</TableCell>
                      <TableCell className="text-right">{p.principalComponent ? formatINR(p.principalComponent) : '-'}</TableCell>
                      <TableCell className="text-right">{p.interestComponent ? formatINR(p.interestComponent) : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(p.amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePayment(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {isEditFormOpen && (
        <AddGoldLoanForm 
          isOpen={isEditFormOpen} 
          setIsOpen={setIsEditFormOpen} 
          loanToEdit={loan} 
        />
      )}

      {isPaymentDialogOpen && (
        <RecordPaymentDialog
          isOpen={isPaymentDialogOpen}
          setIsOpen={setIsPaymentDialogOpen}
          loanId={loan.id}
        />
      )}
    </div>
  );
}
