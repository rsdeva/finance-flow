import { IconName } from "@/components/icons";

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  date: Date;
  reason: string;
  notes?: string;
  amount: number;
  category?: string;
  investmentCategory?: string;
  paymentMethod: string;
};

export type ExpenseCategory = {
  id: string; // Document ID from Firestore
  value: string; // Typically same as ID
  label: string;
  icon: IconName | string; // Can be a built-in icon name or a URL to a custom icon
};

export type InvestmentCategory = {
  id: string; // Document ID from Firestore
  value: string; // Typically same as ID
  label: string;
};

export type PaymentMethod = {
  id: string; // Document ID from Firestore
  value: string; // Typically same as ID
  label: string;
};
