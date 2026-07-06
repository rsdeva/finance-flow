import type { InvestmentCategory } from '@/lib/types';

export const defaultInvestmentCategories: InvestmentCategory[] = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'nps', label: 'NPS' },
  { value: 'pf', label: 'PF' },
  { value: 'mutual-funds', label: 'Mutual Funds' },
  { value: 'other', label: 'Other' },
];
