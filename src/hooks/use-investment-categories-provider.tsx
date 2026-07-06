'use client';

import { useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import type { InvestmentCategory } from '@/lib/types';
import { defaultInvestmentCategories } from '@/lib/investment-categories';
import { InvestmentCategoriesContext } from './use-investment-categories';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export function InvestmentCategoriesProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isSeeding = useRef(false);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'investmentCategories');
  }, [firestore, user?.uid]);

  const { data: rawCategories, isLoading: isFirestoreLoading } = useCollection<Omit<InvestmentCategory, 'value'>>(categoriesQuery);

  const [hasCheckedDefaults, setHasCheckedDefaults] = useState(false);
  
  const isInvestmentCategoriesLoading = isUserLoading || isFirestoreLoading || !hasCheckedDefaults;

  const investmentCategories = useMemo(() => {
    if (isUserLoading || !user || !rawCategories) return [];
    const firestoreCategories = rawCategories.map(c => ({ ...c, value: c.id, id: c.id }));
    // De-duplicate by label
    return Array.from(new Map(firestoreCategories.map(c => [c.label.toLowerCase(), c])).values());
  }, [rawCategories, isUserLoading, user]);

  const seedDefaultInvestmentCategories = useCallback(async () => {
    if (!categoriesQuery || !firestore || !user?.uid || isSeeding.current || hasCheckedDefaults) return;
    
    isSeeding.current = true;
    try {
      const existingSnap = await getDocs(categoriesQuery);
      if (!existingSnap.empty) {
          setHasCheckedDefaults(true);
          return;
      }

      const batch = writeBatch(firestore);
      for (const category of defaultInvestmentCategories) {
        const seedId = category.label.toLowerCase().replace(/\s+/g, '_');
        const docRef = doc(firestore, 'users', user.uid, 'investmentCategories', seedId);
        batch.set(docRef, { label: category.label });
      }
      await batch.commit();
      setHasCheckedDefaults(true);
    } catch (error) {
      console.error('Error seeding investment categories:', error);
    } finally {
      isSeeding.current = false;
    }
  }, [categoriesQuery, firestore, user?.uid, hasCheckedDefaults]);

  useEffect(() => {
      if (user && firestore && !isFirestoreLoading && !hasCheckedDefaults) {
          seedDefaultInvestmentCategories();
      }
  }, [user, firestore, isFirestoreLoading, seedDefaultInvestmentCategories, hasCheckedDefaults]);

  const addInvestmentCategory = useCallback(async (newCategory: { label: string }) => {
    if (!firestore || !user?.uid) throw new Error('User is not authenticated.');
    if (investmentCategories.some(c => c.label.toLowerCase() === newCategory.label.toLowerCase())) {
        throw new Error('An investment category with this name already exists.');
    }
    const batch = writeBatch(firestore);
    const newDocRef = doc(collection(firestore, 'users', user.uid, 'investmentCategories'));
    batch.set(newDocRef, newCategory);
    await batch.commit();
  }, [firestore, user?.uid, investmentCategories]);

  const updateInvestmentCategory = useCallback(async (id: string, updatedCategory: { label: string }) => {
    if (!firestore || !user?.uid) throw new Error('User not authenticated.');
    if (investmentCategories.some(c => c.label.toLowerCase() === updatedCategory.label.toLowerCase() && c.id !== id)) {
        throw new Error('An investment category with this name already exists.');
    }
    const categoryDoc = doc(firestore, 'users', user.uid, 'investmentCategories', id);
    await updateDoc(categoryDoc, updatedCategory);
  }, [firestore, user?.uid, investmentCategories]);

  const deleteInvestmentCategory = useCallback(async (id: string) => {
    if (!firestore || !user?.uid) throw new Error('User not authenticated.');
    const categoryDoc = doc(firestore, 'users', user.uid, 'investmentCategories', id);
    await deleteDoc(categoryDoc);
  }, [firestore, user?.uid]);

  const getInvestmentCategoryLabel = useCallback((id: string) => {
    return investmentCategories.find(p => p.id === id)?.label || 'N/A';
  }, [investmentCategories]);

  const value = {
    investmentCategories,
    addInvestmentCategory,
    updateInvestmentCategory,
    deleteInvestmentCategory,
    getInvestmentCategoryLabel,
    isInvestmentCategoriesLoading,
  };

  return <InvestmentCategoriesContext.Provider value={value}>{children}</InvestmentCategoriesContext.Provider>;
}