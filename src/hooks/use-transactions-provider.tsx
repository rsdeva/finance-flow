'use client';

import {
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import type { Transaction } from '@/lib/types';
import {
  useFirestore,
  useUser,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { TransactionsContext } from './use-transactions';

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
  }, [firestore, user?.uid]);

  const {
    data: rawTransactions,
    isLoading: isTransactionsLoading,
  } = useCollection<Omit<Transaction, 'id' | 'date'> & { date: Timestamp }>(
    transactionsQuery
  );

  const transactions = useMemo(() => {
    // If the user isn't loaded yet, or we have no user, return an empty array.
    if (isUserLoading || !user) return [];
    if (!rawTransactions) return [];
    
    return rawTransactions.map((t) => ({
      ...t,
      date: t.date.toDate(),
    }));
  }, [rawTransactions, isUserLoading, user]);

  const isLoading = isUserLoading || (!!user && isTransactionsLoading);

  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, 'id'>) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const transactionsCol = collection(
        firestore,
        'users',
        user.uid,
        'transactions'
      );
      
      const dataToSave: any = {
        ...transaction,
        date: Timestamp.fromDate(new Date(transaction.date)),
        createdAt: serverTimestamp()
      };

      // Ensure optional fields are not saved as undefined
      if (transaction.notes) dataToSave.notes = transaction.notes;
      if (transaction.investmentCategory) dataToSave.investmentCategory = transaction.investmentCategory;

      await addDoc(transactionsCol, dataToSave);
    },
    [firestore, user?.uid]
  );

  const updateTransaction = useCallback(
    async (id: string, transaction: Omit<Transaction, 'id'>) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const transactionDoc = doc(
        firestore,
        'users',
        user.uid,
        'transactions',
        id
      );

      const dataToUpdate: any = {
        ...transaction,
        date: Timestamp.fromDate(new Date(transaction.date))
      };

      // Ensure optional fields are not saved as undefined
      if (transaction.notes) dataToUpdate.notes = transaction.notes;
      
      // Explicitly handle investmentCategory clearing
      dataToUpdate.investmentCategory = transaction.investmentCategory || null;


      await updateDoc(transactionDoc, dataToUpdate);
    },
    [firestore, user?.uid]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!firestore || !user?.uid) {
        throw new Error('User is not authenticated.');
      }
      const transactionDoc = doc(
        firestore,
        'users',
        user.uid,
        'transactions',
        id
      );
      await deleteDoc(transactionDoc);
    },
    [firestore, user?.uid]
  );

  const value = {
    transactions,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}
