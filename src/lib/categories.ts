import type { ExpenseCategory } from '@/lib/types';
import type { IconName } from '@/components/icons';

export const defaultCategories: ExpenseCategory[] = [
  { id: 'housing', value: 'housing', label: 'Housing', icon: 'home' as IconName },
  { id: 'food', value: 'food', label: 'Food', icon: 'food' as IconName },
  { id: 'transport', value: 'transport', label: 'Transport', icon: 'transport' as IconName },
  { id: 'entertainment', value: 'entertainment', label: 'Entertainment', icon: 'entertainment' as IconName },
  { id: 'health', value: 'health', label: 'Health', icon: 'health' as IconName },
  { id: 'shopping', value: 'shopping', label: 'Shopping', icon: 'shopping' as IconName },
  { id: 'bills', value: 'bills', label: 'Bills & Utilities', icon: 'bills' as IconName },
  { id: 'travel', value: 'travel', label: 'Travel', icon: 'travel' as IconName },
  { id: 'investment', value: 'investment', label: 'Investment', icon: 'trending-up' as IconName },
  { id: 'other', value: 'other', label: 'Other', icon: 'other' as IconName },
];
