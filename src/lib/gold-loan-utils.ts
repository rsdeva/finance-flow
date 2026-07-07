import { differenceInDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { GoldLoan, GoldLoanPayment } from './types';

export type GoldLoanState = {
  currentPrincipal: number;
  totalInterestAccrued: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  outstandingInterest: number; // Interest accrued but not yet paid
  totalOutstanding: number; // currentPrincipal + outstandingInterest
  lastCalculationDate: Date;
};

/**
 * Calculates the interest accrued between two dates.
 */
function calculateInterest(
  principal: number,
  rate: number, // Annual rate
  type: 'simple' | 'compound',
  startDate: Date,
  endDate: Date
): number {
  if (principal <= 0) return 0;
  
  const days = differenceInDays(startOfDay(endDate), startOfDay(startDate));
  if (days <= 0) return 0;

  const dailyRate = rate / 100 / 365;

  if (type === 'simple') {
    return principal * dailyRate * days;
  } else {
    // Monthly compounding with a daily fraction.
    const months = days / 30.4167; // average days in a month
    const monthlyRate = rate / 100 / 12;
    const amount = principal * Math.pow(1 + monthlyRate, months);
    return amount - principal;
  }
}

/**
 * Computes the current state of a Gold Loan up to a target date (default today).
 */
export function calculateGoldLoanState(
  loan: GoldLoan,
  payments: GoldLoanPayment[],
  targetDate: Date = new Date()
): GoldLoanState {
  let currentPrincipal = loan.principal;
  let totalInterestAccrued = 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let outstandingInterest = 0;
  let lastDate = startOfDay(loan.startDate);

  // Sort payments chronologically
  const sortedPayments = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const payment of sortedPayments) {
    if (isAfter(startOfDay(payment.date), startOfDay(targetDate))) {
      break; // Stop if payment is after target date
    }

    // Calculate interest from last date to payment date
    const accrued = calculateInterest(currentPrincipal, loan.interestRate, loan.interestType, lastDate, payment.date);
    totalInterestAccrued += accrued;
    outstandingInterest += accrued;

    // Apply payment
    if (payment.paymentType === 'interest' || payment.paymentType === 'both') {
      const interestPayment = payment.interestComponent || 0;
      totalInterestPaid += interestPayment;
      outstandingInterest = Math.max(0, outstandingInterest - interestPayment);
    }
    
    if (payment.paymentType === 'principal' || payment.paymentType === 'both') {
      const principalPayment = payment.principalComponent || 0;
      totalPrincipalPaid += principalPayment;
      currentPrincipal = Math.max(0, currentPrincipal - principalPayment);
    }

    lastDate = startOfDay(payment.date);
  }

  // Calculate interest from last payment date to target date
  if (isBefore(lastDate, startOfDay(targetDate))) {
    const accrued = calculateInterest(currentPrincipal, loan.interestRate, loan.interestType, lastDate, targetDate);
    totalInterestAccrued += accrued;
    outstandingInterest += accrued;
    lastDate = startOfDay(targetDate);
  }

  return {
    currentPrincipal,
    totalInterestAccrued,
    totalInterestPaid,
    totalPrincipalPaid,
    outstandingInterest,
    totalOutstanding: currentPrincipal + outstandingInterest,
    lastCalculationDate: lastDate,
  };
}
