'use client';

import type { Transaction } from '@/lib/types';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

import { FilteredSummary } from './FilteredSummary';
import { FilterControls, type FilterState } from './FilterControls';
import { ExpenseList } from './ExpenseList';
import { Button } from './ui/button';
import { PlusCircle, Settings, LogOut, Download, Moon, Sun } from 'lucide-react';
import { ExpenseForm } from './ExpenseForm';
import { IncomeForm } from './IncomeForm';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useCategories } from '@/hooks/use-categories';
import { CategoryChart } from './CategoryChart';
import { InvestmentSummary } from './InvestmentSummary';
import { useInvestmentCategories } from '@/hooks/use-investment-categories';
import { useTransactions } from '@/hooks/use-transactions';
import { Skeleton } from './ui/skeleton';
import { ExportDialog } from './ExportDialog';
import { useTheme } from 'next-themes';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

export function Dashboard() {
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    month: 'all',
    year: 'all',
    categories: [],
    paymentMethods: [],
  });
  
  const [viewMode, setViewMode] = useState<'consolidated' | 'month'>('consolidated');
  const [currentPage, setCurrentPage] = useState(1);

  const { transactions, isLoading } = useTransactions();
  const { categories } = useCategories();
  const { investmentCategories } = useInvestmentCategories();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      await fetch('/api/auth/session', { method: 'DELETE' });
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const filteredTransactions = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);

        // 1. Date/Timeframe filter
        if (viewMode === 'month') {
            if (transactionDate.getMonth() !== currentMonth || transactionDate.getFullYear() !== currentYear) {
                return false;
            }
        } else { // consolidated view
            let dateInRange = true;
            if (filters.month !== 'all' && filters.year !== 'all') {
                dateInRange =
                    transactionDate.getMonth() === parseInt(filters.month, 10) &&
                    transactionDate.getFullYear() === parseInt(filters.year, 10);
            } else {
                if (filters.dateFrom) {
                    const fromDate = new Date(filters.dateFrom);
                    fromDate.setHours(0,0,0,0);
                    dateInRange = transactionDate >= fromDate;
                }
                if (filters.dateTo) {
                    const toDate = new Date(filters.dateTo);
                    toDate.setHours(23,59,59,999);
                    dateInRange = dateInRange && transactionDate <= toDate;
                }
            }
            if (!dateInRange) return false;
        }


        // 2. Category Filter
        const categoryMatch = filters.categories.length === 0 ||
                            (transaction.type === 'income' && filters.categories.includes('income')) ||
                            (transaction.category === 'investment' && filters.categories.includes('investment')) ||
                            (transaction.type === 'expense' && transaction.category && filters.categories.includes(transaction.category));
        if (!categoryMatch) return false;

        // 3. Payment Method Filter
        const paymentMethodMatch = filters.paymentMethods.length === 0 ||
                                 (transaction.paymentMethod && filters.paymentMethods.includes(transaction.paymentMethod));
        if (!paymentMethodMatch) return false;

        return true;
    });
}, [transactions, filters, viewMode]);

  const transactionsPerPage = 30;
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const paginatedTransactions = useMemo(() => {
    const indexOfLastTransaction = currentPage * transactionsPerPage;
    const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
    return filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  }, [filteredTransactions, currentPage, transactionsPerPage]);


  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    if (transaction.type === 'income') {
      setIsIncomeFormOpen(true);
    } else {
      setIsExpenseFormOpen(true);
    }
  };

  const handleCloseForms = () => {
    setIsExpenseFormOpen(false);
    setIsIncomeFormOpen(false);
    setEditingTransaction(undefined);
  }

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };
  
  if (isLoading) {
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Welcome, {user?.displayName || 'User'}!</h1>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'consolidated' | 'month')} className="w-fit">
                <TabsList>
                <TabsTrigger value="consolidated">Consolidated</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="flex items-center gap-2">
           <Button onClick={() => { setEditingTransaction(undefined); setIsIncomeFormOpen(true); }} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Income
          </Button>
          <Button onClick={() => { setEditingTransaction(undefined); setIsExpenseFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
          </Button>
           <Button variant="outline" size="icon" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="h-4 w-4" />
            <span className="sr-only">Export Data</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </div>
      </div>

      <ExpenseForm isOpen={isExpenseFormOpen} setIsOpen={handleCloseForms} transaction={editingTransaction?.type === 'expense' ? editingTransaction : undefined} />
      <IncomeForm isOpen={isIncomeFormOpen} setIsOpen={handleCloseForms} transaction={editingTransaction?.type === 'income' ? editingTransaction : undefined} />
      <ExportDialog isOpen={isExportDialogOpen} setIsOpen={setIsExportDialogOpen} allTransactions={transactions} filteredTransactions={filteredTransactions} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FilteredSummary transactions={filteredTransactions} />
        <CategoryChart transactions={filteredTransactions} categories={categories} />
        <InvestmentSummary transactions={filteredTransactions} investmentCategories={investmentCategories} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            {viewMode === 'month'
              ? 'Filtering by category and payment method for the current month.'
              : 'Enter a date range and/or category to filter transactions.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FilterControls
            onApplyFilters={handleApplyFilters}
            categories={categories}
            transactions={transactions}
            disabledDate={viewMode === 'month'}
          />
        </CardContent>
      </Card>


      <ExpenseList 
        expenses={paginatedTransactions} 
        categories={categories} 
        onEdit={handleEdit} 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
