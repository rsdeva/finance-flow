'use client';

import { createContext, useContext } from 'react';
import type { InvestmentCategory } from '@/lib/types';

interface InvestmentCategoriesContextType {
  investmentCategories: InvestmentCategory[];
  addInvestmentCategory: (newCategory: { label: string }) => Promise<void>;
  updateInvestmentCategory: (id: string, updatedCategory: { label: string }) => Promise<void>;
  deleteInvestmentCategory: (id: string) => Promise<void>;
  getInvestmentCategoryLabel: (id: string) => string;
  isInvestmentCategoriesLoading: boolean;
}

export const InvestmentCategoriesContext = createContext<InvestmentCategoriesContextType | undefined>(undefined);

export function useInvestmentCategories() {
  const context = useContext(InvestmentCategoriesContext);
  if (!context) {
    throw new Error('useInvestmentCategories must be used within an InvestmentCategoriesProvider');
  }
  return context;
}
