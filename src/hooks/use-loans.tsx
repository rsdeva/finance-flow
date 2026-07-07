import { createContext, useContext } from 'react';
import type { Loan } from '@/lib/types';

export type LoansContextType = {
  loans: Loan[];
  isLoading: boolean;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLoan: (id: string, loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  deleteRateRevision: (loanId: string, revisionId: string) => Promise<void>;
};

export const LoansContext = createContext<LoansContextType | undefined>(undefined);

export function useLoans() {
  const context = useContext(LoansContext);
  if (context === undefined) {
    throw new Error('useLoans must be used within a LoansProvider');
  }
  return context;
}
