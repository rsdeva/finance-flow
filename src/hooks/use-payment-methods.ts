'use client';

import { createContext, useContext } from 'react';
import type { PaymentMethod } from '@/lib/types';

interface PaymentMethodsContextType {
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (newMethod: { label: string }) => Promise<void>;
  updatePaymentMethod: (id: string, updatedMethod: { label: string }) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  getPaymentMethodLabel: (id: string) => string;
  isPaymentMethodsLoading: boolean;
}

export const PaymentMethodsContext = createContext<PaymentMethodsContextType | undefined>(undefined);

export function usePaymentMethods() {
  const context = useContext(PaymentMethodsContext);
  if (!context) {
    throw new Error('usePaymentMethods must be used within a PaymentMethodsProvider');
  }
  return context;
}
