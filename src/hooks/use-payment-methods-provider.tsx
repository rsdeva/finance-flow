'use client';

import { useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import type { PaymentMethod } from '@/lib/types';
import { defaultPaymentMethods } from '@/lib/payment-methods';
import { PaymentMethodsContext } from './use-payment-methods';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export function PaymentMethodsProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isSeeding = useRef(false);

  const methodsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'paymentMethods');
  }, [firestore, user?.uid]);
  
  const { data: rawMethods, isLoading: isFirestoreLoading } = useCollection<Omit<PaymentMethod, 'value'>>(methodsQuery);

  const [hasCheckedDefaults, setHasCheckedDefaults] = useState(false);
  
  const isPaymentMethodsLoading = isUserLoading || isFirestoreLoading || !hasCheckedDefaults;

  const paymentMethods = useMemo(() => {
     if (isUserLoading || !user || !rawMethods) return [];
     const firestoreMethods = rawMethods.map(m => ({ ...m, value: m.id, id: m.id }));
     // De-duplicate by label
     return Array.from(new Map(firestoreMethods.map(m => [m.label.toLowerCase(), m])).values());
  }, [rawMethods, isUserLoading, user]);

  const seedDefaultPaymentMethods = useCallback(async () => {
    if (!methodsQuery || !firestore || !user?.uid || isSeeding.current || hasCheckedDefaults) return;
    
    isSeeding.current = true;
    try {
      const existingSnap = await getDocs(methodsQuery);
      if (!existingSnap.empty) {
          setHasCheckedDefaults(true);
          return;
      }

      const batch = writeBatch(firestore);
      for (const method of defaultPaymentMethods) {
        const seedId = method.label.toLowerCase().replace(/\s+/g, '_');
        const docRef = doc(firestore, 'users', user.uid, 'paymentMethods', seedId);
        batch.set(docRef, { label: method.label });
      }
      await batch.commit();
      setHasCheckedDefaults(true);
    } catch (error) {
      console.error('Error seeding payment methods:', error);
    } finally {
      isSeeding.current = false;
    }
  }, [methodsQuery, firestore, user?.uid, hasCheckedDefaults]);

  useEffect(() => {
      if (user && firestore && !isFirestoreLoading && !hasCheckedDefaults) {
          seedDefaultPaymentMethods();
      }
  }, [user, firestore, isFirestoreLoading, seedDefaultPaymentMethods, hasCheckedDefaults]);


  const addPaymentMethod = useCallback(async (newMethod: { label: string }) => {
    if (!firestore || !user?.uid) throw new Error('User is not authenticated.');
    if (paymentMethods.some(m => m.label.toLowerCase() === newMethod.label.toLowerCase())) {
        throw new Error('A payment method with this name already exists.');
    }
    const methodsCol = collection(firestore, 'users', user.uid, 'paymentMethods');
    const batch = writeBatch(firestore);
    const newDocRef = doc(methodsCol);
    batch.set(newDocRef, newMethod);
    await batch.commit();
  }, [firestore, user?.uid, paymentMethods]);

  const updatePaymentMethod = useCallback(async (id: string, updatedMethod: { label: string }) => {
    if (!firestore || !user?.uid) throw new Error('User not authenticated.');
    if (paymentMethods.some(m => m.label.toLowerCase() === updatedMethod.label.toLowerCase() && m.id !== id)) {
      throw new Error('A payment method with this name already exists.');
    }
    const methodDoc = doc(firestore, 'users', user.uid, 'paymentMethods', id);
    await updateDoc(methodDoc, updatedMethod);
  }, [firestore, user?.uid, paymentMethods]);

  const deletePaymentMethod = useCallback(async (id: string) => {
    if (!firestore || !user?.uid) throw new Error('User not authenticated.');
    const methodDoc = doc(firestore, 'users', user.uid, 'paymentMethods', id);
    await deleteDoc(methodDoc);
  }, [firestore, user?.uid]);

  const getPaymentMethodLabel = useCallback((id: string) => {
    return paymentMethods.find(p => p.id === id)?.label || 'N/A';
  }, [paymentMethods]);

  const value = {
    paymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    getPaymentMethodLabel,
    isPaymentMethodsLoading,
  };

  return <PaymentMethodsContext.Provider value={value}>{children}</PaymentMethodsContext.Provider>;
}