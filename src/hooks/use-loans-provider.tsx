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
    
    return rawLoans.map((l: any) => ({
      ...l,
      startDate: l.startDate?.toDate() || new Date(),
      createdAt: l.createdAt?.toDate() || new Date(),
      updatedAt: l.updatedAt?.toDate() || new Date(),
      interestRateHistory: (l.interestRateHistory || []).map((rev: any) => ({
          ...rev,
          effectiveDate: rev.effectiveDate?.toDate() || new Date()
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

  const value = {
    loans,
    isLoading,
    addLoan,
    updateLoan,
    deleteLoan,
  };

  return (
    <LoansContext.Provider value={value}>
      {children}
    </LoansContext.Provider>
  );
}
