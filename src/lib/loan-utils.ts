import { addMonths, setDate, isAfter, isSameMonth, isBefore, isSameDay, startOfDay } from 'date-fns';
import { AmortizationScheduleEntry, InterestRateRevision } from './types';

export function calculateEMI(principal: number, annualInterestRate: number, tenureMonths: number): number {
  if (annualInterestRate === 0) return principal / tenureMonths;
  if (tenureMonths <= 0) return 0;
  
  const monthlyRate = annualInterestRate / 12 / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

export function calculateNewTenure(principal: number, annualInterestRate: number, emiAmount: number): number {
  if (annualInterestRate === 0) return Math.ceil(principal / emiAmount);
  if (principal <= 0 || emiAmount <= 0) return 0;

  const monthlyRate = annualInterestRate / 12 / 100;
  
  // Logarithmic formula for N: N = -log(1 - (P * r) / E) / log(1 + r)
  const numerator = 1 - (principal * monthlyRate) / emiAmount;
  
  // If numerator <= 0, the EMI doesn't even cover interest. Infinite tenure.
  if (numerator <= 0) return 999; 
  
  const n = -Math.log(numerator) / Math.log(1 + monthlyRate);
  return Math.ceil(n);
}

export function generateAmortizationSchedule(
  principal: number,
  baseAnnualInterestRate: number,
  baseTenureMonths: number,
  startDate: Date,
  emiDueDate: number, // day of the month (1-31)
  baseEmiAmount: number,
  interestRateHistory?: InterestRateRevision[]
): AmortizationScheduleEntry[] {
  let balance = principal;
  const schedule: AmortizationScheduleEntry[] = [];
  
  // Sort history chronologically
  const sortedHistory = [...(interestRateHistory || [])].sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
  
  // Active rate state
  let currentAnnualRate = baseAnnualInterestRate;
  let currentEmi = baseEmiAmount;

  // We need to know how many months to iterate. A floating rate loan might extend beyond baseTenureMonths.
  // We'll iterate up to an arbitrarily large number (e.g., 600 months = 50 years max) and break when balance is 0.
  const MAX_MONTHS = 600;

  for (let i = 1; i <= MAX_MONTHS; i++) {
    // Calculate current due date
    let rawDueDate = addMonths(startDate, i);
    const daysInMonth = new Date(rawDueDate.getFullYear(), rawDueDate.getMonth() + 1, 0).getDate();
    let dueDate = setDate(rawDueDate, Math.min(emiDueDate, daysInMonth));
    const dueDayStart = startOfDay(dueDate);

    // Check if any rate revisions apply to this month
    for (const revision of sortedHistory) {
       // If the revision is effective on or before this due date, apply it.
       // Because it's sorted, the latest applicable one will "win" by the end of the inner loop.
       const revDayStart = startOfDay(revision.effectiveDate);
       if (isBefore(revDayStart, dueDayStart) || isSameDay(revDayStart, dueDayStart)) {
           currentAnnualRate = revision.interestRate;
           currentEmi = revision.emiAmount;
       }
    }

    const monthlyRate = currentAnnualRate / 12 / 100;
    const interestComponent = balance * monthlyRate;
    
    // The actual EMI might be slightly higher/lower on the final payment to clear the exact balance
    let actualEmiForMonth = currentEmi;
    if (balance + interestComponent <= currentEmi) {
      actualEmiForMonth = balance + interestComponent;
    }

    const principalComponent = actualEmiForMonth - interestComponent;
    balance -= principalComponent;
    
    if (balance < 0.01) balance = 0; // handle floating point precision

    schedule.push({
      emiNumber: i,
      dueDate,
      emiAmount: actualEmiForMonth,
      principalComponent,
      interestComponent,
      outstandingBalance: balance,
    });

    if (balance === 0) break;
  }

  return schedule;
}

export function calculateTotalInterest(schedule: AmortizationScheduleEntry[]): number {
  return schedule.reduce((sum, entry) => sum + entry.interestComponent, 0);
}

export function getOutstandingBalance(schedule: AmortizationScheduleEntry[], targetDate: Date = new Date()): number {
  let lastPaidEntry = null;
  for (const entry of schedule) {
    if (isAfter(targetDate, entry.dueDate) || isSameMonth(targetDate, entry.dueDate)) {
      lastPaidEntry = entry;
    } else {
      break;
    }
  }
  if (!lastPaidEntry) return schedule[0]?.outstandingBalance + schedule[0]?.principalComponent || 0; 
  return lastPaidEntry.outstandingBalance;
}
