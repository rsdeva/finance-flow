'use client';

import React, { useRef, ChangeEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface AutoFormatDateInputProps {
  value: string; // DD-MM-YYYY
  onChange: (value: string) => void;
  className?: string;
}

export function AutoFormatDateInput({ value, onChange, className }: AutoFormatDateInputProps) {
  const [day, month, year] = (value || '--').split('-');

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (part: 'day' | 'month' | 'year', val: string) => {
    let newDay = day, newMonth = month, newYear = year;
    
    if (part === 'day') newDay = val;
    if (part === 'month') newMonth = val;
    if (part === 'year') newYear = val;
    
    onChange(`${newDay || ''}-${newMonth || ''}-${newYear || ''}`);
  };

  const handleDayChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    handleInputChange('day', val);
    if (val.length === 2 && monthRef.current) {
      monthRef.current.focus();
    }
  };

  const handleMonthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    handleInputChange('month', val);
    if (val.length === 2 && yearRef.current) {
      yearRef.current.focus();
    }
  };

  const handleYearChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    handleInputChange('year', val);
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, part: 'day' | 'month') => {
      if (e.key === 'Backspace' && e.currentTarget.value === '') {
          if (part === 'month' && dayRef.current) {
              dayRef.current.focus();
          } else if (part === 'year' && monthRef.current) {
              monthRef.current.focus();
          }
      }
  }


  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Input
        ref={dayRef}
        type="text"
        maxLength={2}
        placeholder="DD"
        value={day}
        onChange={handleDayChange}
        className="w-12 text-center"
      />
      <span>-</span>
      <Input
        ref={monthRef}
        type="text"
        maxLength={2}
        placeholder="MM"
        value={month}
        onChange={handleMonthChange}
        onKeyDown={(e) => handleKeyDown(e, 'month')}
        className="w-12 text-center"
      />
      <span>-</span>
      <Input
        ref={yearRef}
        type="text"
        maxLength={4}
        placeholder="YYYY"
        value={year}
        onChange={handleYearChange}
        onKeyDown={(e) => handleKeyDown(e, 'year' as any)}
        className="w-20 text-center"
      />
    </div>
  );
}
