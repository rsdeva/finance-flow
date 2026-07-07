import { createContext, useContext } from 'react';
import type { GoldLoan, GoldLoanPayment } from '@/lib/types';

interface GoldLoansContextType {
  goldLoans: GoldLoan[];
  goldLoanPayments: GoldLoanPayment[];
  isLoading: boolean;
  addGoldLoan: (loan: Omit<GoldLoan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoldLoan: (id: string, loan: Omit<GoldLoan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteGoldLoan: (id: string) => Promise<void>;
  addGoldLoanPayment: (payment: Omit<GoldLoanPayment, 'id' | 'createdAt'>) => Promise<void>;
  deleteGoldLoanPayment: (id: string) => Promise<void>;
}

export const GoldLoansContext = createContext<GoldLoansContextType>({
  goldLoans: [],
  goldLoanPayments: [],
  isLoading: true,
  addGoldLoan: async () => {},
  updateGoldLoan: async () => {},
  deleteGoldLoan: async () => {},
  addGoldLoanPayment: async () => {},
  deleteGoldLoanPayment: async () => {},
});

export function useGoldLoans() {
  return useContext(GoldLoansContext);
}
