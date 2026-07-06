'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

const defaultCurrency = 'INR';

export function useCurrency() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const preferencesDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid, 'preferences', 'user-preferences');
  }, [firestore, user?.uid]);

  const { data: preferences, isLoading: isPreferencesLoading } = useDoc<{ currency: string }>(preferencesDocRef);

  const [currency, setCurrencyState] = useState(defaultCurrency);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !isPreferencesLoading) {
      if (preferences?.currency) {
        setCurrencyState(preferences.currency);
      } else {
        setCurrencyState(defaultCurrency);
      }
      setIsInitialized(true);
    }
  }, [preferences, isUserLoading, isPreferencesLoading]);

  const saveCurrency = useCallback(
    async (newCurrency: string) => {
      if (!preferencesDocRef) return;
      if (typeof newCurrency === 'string' && newCurrency) {
        setCurrencyState(newCurrency); // Optimistic update
        await setDoc(preferencesDocRef, { currency: newCurrency }, { merge: true });
      }
    },
    [preferencesDocRef]
  );

  const formatCurrency = useCallback(
    (value: number) => {
      if (!isInitialized) {
        return '';
      }
      
      const cleanCurrency = currency.replace(/"/g, '');

      try {
        return new Intl.NumberFormat(cleanCurrency === 'INR' ? 'en-IN' : undefined, {
          style: 'currency',
          currency: cleanCurrency,
        }).format(value);
      } catch (e) {
        console.error(`Error formatting currency with code "${currency}":`, e);
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: defaultCurrency,
        }).format(value);
      }
    },
    [currency, isInitialized]
  );

  return { currency, setCurrency: saveCurrency, formatCurrency, isInitialized };
}
