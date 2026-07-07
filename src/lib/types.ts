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
  loanId?: string;
  emiNumber?: number;
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

export type InterestRateRevision = {
  id: string;
  effectiveDate: Date;
  interestRate: number;
  emiAmount: number;
  remarks?: string;
};

export type Loan = {
  id: string;
  name: string;
  bank: string;
  principal: number;
  interestRate: number;
  interestType: 'fixed' | 'floating';
  startDate: Date;
  tenureMonths: number;
  emiAmount: number;
  emiDueDate: number; // day of the month
  processingFee?: number;
  accountNumber?: string;
  remarks?: string;
  interestRateHistory?: InterestRateRevision[];
  createdAt: Date;
  updatedAt: Date;
};

export type AmortizationScheduleEntry = {
  emiNumber: number;
  dueDate: Date;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  outstandingBalance: number;
};

export type LoanPayment = {
  id: string;
  loanId: string;
  date: Date;
  amount: number;
  type: 'emi' | 'prepayment';
  notes?: string;
};
