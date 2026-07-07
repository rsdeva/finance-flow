'use client';

import { useEffect, useRef } from 'react';
import { useLoans } from '@/hooks/use-loans';
import { useTransactions } from '@/hooks/use-transactions';
import { generateAmortizationSchedule } from '@/lib/loan-utils';
import { isBefore, isSameDay, startOfDay, startOfMonth } from 'date-fns';

export function LoanTransactionSync() {
  const { loans, isLoading: isLoansLoading } = useLoans();
  const { transactions, addTransaction, isLoading: isTransactionsLoading } = useTransactions();
  const hasSynced = useRef(false);

  useEffect(() => {
    // Only run sync once when both loans and transactions are fully loaded
    if (isLoansLoading || isTransactionsLoading || hasSynced.current) return;
    hasSynced.current = true;

    const syncMissedEMIs = async () => {
      const today = startOfDay(new Date());

      for (const loan of loans) {
        // Generate schedule
        const schedule = generateAmortizationSchedule(
          loan.principal,
          loan.interestRate,
          loan.tenureMonths,
          loan.startDate,
          loan.emiDueDate,
          loan.emiAmount
        );

        // Determine from when to start syncing
        const syncStart = loan.expenseSyncStartDate 
          ? startOfMonth(new Date(loan.expenseSyncStartDate)) 
          : startOfDay(new Date(loan.startDate));

        // Find EMIs that are due today or in the past, BUT on or after syncStart
        const dueEMIs = schedule.filter(
          (entry) => {
            const dueDate = startOfDay(entry.dueDate);
            const isPastOrToday = isBefore(dueDate, today) || isSameDay(dueDate, today);
            const isAfterSyncStart = !isBefore(dueDate, syncStart);
            return isPastOrToday && isAfterSyncStart;
          }
        );

        for (const emi of dueEMIs) {
          // Check if transaction already exists for this loan and EMI number
          const exists = transactions.some(
            (t) => t.loanId === loan.id && t.emiNumber === emi.emiNumber
          );

          if (!exists) {
            // Auto-create expense
            try {
              await addTransaction({
                type: 'expense',
                amount: emi.emiAmount,
                date: emi.dueDate,
                category: 'loan_repayment',
                paymentMethod: 'bank_transfer', // Default or could be a new 'auto_debit' method
                reason: `EMI Payment: ${loan.name}`,
                notes: `Auto-generated EMI ${emi.emiNumber} for ${loan.name}`,
                loanId: loan.id,
                emiNumber: emi.emiNumber,
              });
              console.log(`Auto-created EMI ${emi.emiNumber} for loan ${loan.name}`);
            } catch (error) {
              console.error('Failed to sync loan EMI:', error);
            }
          }
        }
      }
    };

    syncMissedEMIs();
  }, [loans, transactions, isLoansLoading, isTransactionsLoading, addTransaction]);

  return null; // This is a headless component for syncing
}
