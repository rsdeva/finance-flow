'use client';

import { ReactNode, useCallback, useMemo } from 'react';
import type { GoldLoan, GoldLoanPayment } from '@/lib/types';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, serverTimestamp, query, orderBy, writeBatch } from 'firebase/firestore';
import { GoldLoansContext } from './use-gold-loans';

export function GoldLoansProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'goldLoans'), orderBy('createdAt', 'desc'));
  }, [firestore, user?.uid]);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'goldLoanPayments'), orderBy('date', 'desc'));
  }, [firestore, user?.uid]);

  const { data: rawLoans, isLoading: isLoansLoading } = useCollection<any>(loansQuery);
  const { data: rawPayments, isLoading: isPaymentsLoading } = useCollection<any>(paymentsQuery);

  const goldLoans = useMemo(() => {
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
      maturityDate: l.maturityDate ? parseDate(l.maturityDate) : undefined,
      createdAt: parseDate(l.createdAt),
      updatedAt: parseDate(l.updatedAt),
    })) as GoldLoan[];
  }, [rawLoans, isUserLoading, user]);

  const goldLoanPayments = useMemo(() => {
    if (isUserLoading || !user) return [];
    if (!rawPayments) return [];
    
    const parseDate = (val: any) => {
        if (!val) return new Date();
        if (typeof val.toDate === 'function') return val.toDate();
        if (val instanceof Date) return val;
        return new Date(val);
    };
    
    return rawPayments.map((p: any) => ({
      ...p,
      date: parseDate(p.date),
      createdAt: parseDate(p.createdAt),
    })) as GoldLoanPayment[];
  }, [rawPayments, isUserLoading, user]);

  const isLoading = isUserLoading || (!!user && (isLoansLoading || isPaymentsLoading));

  const addGoldLoan = useCallback(
    async (loan: Omit<GoldLoan, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const loansCol = collection(firestore, 'users', user.uid, 'goldLoans');
      
      const dataToSave: any = {
        ...loan,
        startDate: Timestamp.fromDate(new Date(loan.startDate)),
        maturityDate: loan.maturityDate ? Timestamp.fromDate(new Date(loan.maturityDate)) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const cleanData = Object.fromEntries(Object.entries(dataToSave).filter(([_, v]) => v !== undefined));

      await addDoc(loansCol, cleanData);
    },
    [firestore, user?.uid]
  );

  const updateGoldLoan = useCallback(
    async (id: string, loan: Omit<GoldLoan, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const loanDoc = doc(firestore, 'users', user.uid, 'goldLoans', id);

      const dataToUpdate: any = {
        ...loan,
        startDate: Timestamp.fromDate(new Date(loan.startDate)),
        maturityDate: loan.maturityDate ? Timestamp.fromDate(new Date(loan.maturityDate)) : null,
        updatedAt: serverTimestamp()
      };

      const cleanData = Object.fromEntries(Object.entries(dataToUpdate).filter(([_, v]) => v !== undefined));

      await updateDoc(loanDoc, cleanData);
    },
    [firestore, user?.uid]
  );

  const deleteGoldLoan = useCallback(
    async (id: string) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const loanDoc = doc(firestore, 'users', user.uid, 'goldLoans', id);
      
      // Delete the loan and all associated payments in a batch
      const batch = writeBatch(firestore);
      batch.delete(loanDoc);
      
      const paymentsToDelete = goldLoanPayments.filter(p => p.loanId === id);
      paymentsToDelete.forEach(p => {
        const pDoc = doc(firestore, 'users', user.uid, 'goldLoanPayments', p.id);
        batch.delete(pDoc);
      });

      await batch.commit();
    },
    [firestore, user?.uid, goldLoanPayments]
  );

  const addGoldLoanPayment = useCallback(
    async (payment: Omit<GoldLoanPayment, 'id' | 'createdAt'>) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const paymentsCol = collection(firestore, 'users', user.uid, 'goldLoanPayments');
      
      const dataToSave: any = {
        ...payment,
        date: Timestamp.fromDate(new Date(payment.date)),
        createdAt: serverTimestamp(),
      };

      const cleanData = Object.fromEntries(Object.entries(dataToSave).filter(([_, v]) => v !== undefined));

      await addDoc(paymentsCol, cleanData);
    },
    [firestore, user?.uid]
  );

  const deleteGoldLoanPayment = useCallback(
    async (id: string) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const pDoc = doc(firestore, 'users', user.uid, 'goldLoanPayments', id);
      await deleteDoc(pDoc);
    },
    [firestore, user?.uid]
  );

  const value = {
    goldLoans,
    goldLoanPayments,
    isLoading,
    addGoldLoan,
    updateGoldLoan,
    deleteGoldLoan,
    addGoldLoanPayment,
    deleteGoldLoanPayment
  };

  return (
    <GoldLoansContext.Provider value={value}>
      {children}
    </GoldLoansContext.Provider>
  );
}
