'use client';

import { ReactNode, useCallback, useMemo } from 'react';
import type { Loan } from '@/lib/types';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { LoansContext } from './use-loans';

export function LoansProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'loans'), orderBy('createdAt', 'desc'));
  }, [firestore, user?.uid]);

  const { data: rawLoans, isLoading: isLoansLoading } = useCollection<any>(loansQuery);

  const loans = useMemo(() => {
    if (isUserLoading || !user) return [];
    if (!rawLoans) return [];
    
    const parseDate = (val: any) => {
        if (!val) return new Date();
        if (typeof val.toDate === 'function') return val.toDate();
        if (val instanceof Date) return val;
        return new Date(val);
    };
    
    return rawLoans.map((l: any) => ({
      ...l,
      startDate: parseDate(l.startDate),
      createdAt: parseDate(l.createdAt),
      updatedAt: parseDate(l.updatedAt),
      interestRateHistory: (l.interestRateHistory || []).map((rev: any) => ({
          ...rev,
          effectiveDate: parseDate(rev.effectiveDate)
      }))
    })) as Loan[];
  }, [rawLoans, isUserLoading, user]);

  const isLoading = isUserLoading || (!!user && isLoansLoading);

  const addLoan = useCallback(
    async (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const loansCol = collection(firestore, 'users', user.uid, 'loans');
      
      const dataToSave: any = {
        ...loan,
        startDate: Timestamp.fromDate(new Date(loan.startDate)),
        interestRateHistory: (loan.interestRateHistory || []).map(rev => ({
            ...rev,
            effectiveDate: Timestamp.fromDate(new Date(rev.effectiveDate))
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(loansCol, dataToSave);
    },
    [firestore, user?.uid]
  );

  const updateLoan = useCallback(
    async (id: string, loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const loanDoc = doc(firestore, 'users', user.uid, 'loans', id);

      const dataToUpdate: any = {
        ...loan,
        startDate: Timestamp.fromDate(new Date(loan.startDate)),
        interestRateHistory: (loan.interestRateHistory || []).map(rev => ({
            ...rev,
            effectiveDate: Timestamp.fromDate(new Date(rev.effectiveDate))
        })),
        updatedAt: serverTimestamp()
      };

      await updateDoc(loanDoc, dataToUpdate);
    },
    [firestore, user?.uid]
  );

  const deleteLoan = useCallback(
    async (id: string) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const loanDoc = doc(firestore, 'users', user.uid, 'loans', id);
      await deleteDoc(loanDoc);
    },
    [firestore, user?.uid]
  );

  const deleteRateRevision = useCallback(
    async (loanId: string, revisionId: string) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const loan = loans.find(l => l.id === loanId);
      if (!loan) throw new Error('Loan not found');

      const updatedHistory = (loan.interestRateHistory || []).filter(r => r.id !== revisionId);
      const loanDoc = doc(firestore, 'users', user.uid, 'loans', loanId);
      await updateDoc(loanDoc, {
        interestRateHistory: updatedHistory.map(rev => ({
          ...rev,
          effectiveDate: Timestamp.fromDate(new Date(rev.effectiveDate))
        })),
        updatedAt: serverTimestamp()
      });
    },
    [firestore, user?.uid, loans]
  );

  const value = {
    loans,
    isLoading,
    addLoan,
    updateLoan,
    deleteLoan,
    deleteRateRevision,
  };

  return (
    <LoansContext.Provider value={value}>
      {children}
    </LoansContext.Provider>
  );
}
