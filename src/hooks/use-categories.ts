'use client';

import { createContext, useContext } from 'react';
import type { ExpenseCategory } from '@/lib/types';

interface CategoriesContextType {
  categories: ExpenseCategory[];
  addCategory: (newCategory: { label: string; icon: string }) => Promise<void>;
  updateCategory: (id: string, updatedCategory: { label: string; icon: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  isCategoriesLoading: boolean;
}

export const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
}
