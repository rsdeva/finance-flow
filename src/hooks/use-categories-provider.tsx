'use client';

import { useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import type { ExpenseCategory } from '@/lib/types';
import { defaultCategories } from '@/lib/categories';
import { CategoriesContext } from './use-categories';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const investmentCategory = defaultCategories.find(c => c.value === 'investment')!;

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isSeeding = useRef(false);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'categories');
  }, [firestore, user?.uid]);

  const { data: rawCategories, isLoading: isFirestoreLoading } = useCollection<Omit<ExpenseCategory, 'value' | 'id'>>(categoriesQuery);

  const [hasCheckedDefaults, setHasCheckedDefaults] = useState(false);

  const isCategoriesLoading = isUserLoading || isFirestoreLoading || !hasCheckedDefaults;

  const categories = useMemo(() => {
    if (isUserLoading || !user) return [];
    
    const firestoreCategories = rawCategories
      ? rawCategories
          .filter(c => c.label !== 'Investment')
          .map(c => ({ ...c, value: (c as any).id, id: (c as any).id }))
      : [];

    const allCategories = [investmentCategory, ...firestoreCategories];
    
    // De-duplicate by label
    const uniqueCategories = Array.from(new Map(allCategories.map(c => [c.label.toLowerCase(), c])).values());

    return uniqueCategories;
  }, [rawCategories, isUserLoading, user]);


  const seedDefaultCategories = useCallback(async () => {
    if (!firestore || !user?.uid || !categoriesQuery || isSeeding.current || hasCheckedDefaults) return;

    isSeeding.current = true;
    try {
      const existingCategoriesSnap = await getDocs(categoriesQuery);
      if (!existingCategoriesSnap.empty) {
        setHasCheckedDefaults(true);
        return;
      }

      const categoriesToSeed = defaultCategories.filter(c => c.value !== 'investment');
      const batch = writeBatch(firestore);

      for (const category of categoriesToSeed) {
        const { value, id, ...categoryData } = category;
        // Use a deterministic ID based on the label to prevent duplicates if seeding runs twice
        const seedId = category.label.toLowerCase().replace(/\s+/g, '_');
        const docRef = doc(firestore, 'users', user.uid, 'categories', seedId);
        batch.set(docRef, categoryData);
      }
      
      await batch.commit();
      setHasCheckedDefaults(true);
    } catch (error) {
      console.error('Error seeding categories:', error);
    } finally {
      isSeeding.current = false;
    }
  }, [firestore, user?.uid, categoriesQuery, hasCheckedDefaults]);


  useEffect(() => {
    if (user && firestore && !isFirestoreLoading && !hasCheckedDefaults) {
        seedDefaultCategories();
    }
  }, [user, firestore, isFirestoreLoading, seedDefaultCategories, hasCheckedDefaults]);


  const addCategory = useCallback(async (newCategory: { label: string; icon: string }) => {
    if (!firestore || !user?.uid || !categoriesQuery) {
        throw new Error('User is not authenticated.');
    }
    if (categories.some(c => c.label.toLowerCase() === newCategory.label.toLowerCase())) {
        throw new Error('A category with this name already exists.');
    }
    
    const batch = writeBatch(firestore);
    const newDocRef = doc(collection(firestore, 'users', user.uid, 'categories'));
    batch.set(newDocRef, newCategory);
    await batch.commit();

  }, [firestore, user?.uid, categories]);

  const updateCategory = useCallback(async (id: string, updatedCategory: { label: string; icon: string }) => {
    if (!firestore || !user?.uid) throw new Error('User not authenticated.');
    if (id === 'investment') return;

    if (categories.some(c => c.label.toLowerCase() === updatedCategory.label.toLowerCase() && c.id !== id)) {
        throw new Error('A category with this name already exists.');
    }

    const categoryDoc = doc(firestore, 'users', user.uid, 'categories', id);
    await updateDoc(categoryDoc, updatedCategory);
  }, [firestore, user?.uid, categories]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!firestore || !user?.uid) throw new Error('User not authenticated.');
    if (id === 'investment') return;
    const categoryDoc = doc(firestore, 'users', user.uid, 'categories', id);
    await deleteDoc(categoryDoc);
  }, [firestore, user?.uid]);

  const value = {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    isCategoriesLoading,
  };

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}