import type { PaymentMethod } from '@/lib/types';

export const defaultPaymentMethods: PaymentMethod[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'credit-card', label: 'Credit Card' },
    { value: 'debit-card', label: 'Debit Card' },
    { value: 'bank-transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' },
];
