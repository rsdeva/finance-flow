
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import type { ExpenseCategory, Transaction } from '@/lib/types';
import { getIcon } from './icons';
import { BadgeDollarSign, Wallet } from 'lucide-react';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from './ui/multi-select';
import { usePaymentMethods } from '@/hooks/use-payment-methods';

export interface FilterState {
    dateFrom: string;
    dateTo: string;
    month: string;
    year: string;
    categories: string[];
    paymentMethods: string[];
}

interface FilterControlsProps {
  onApplyFilters: (filters: FilterState) => void;
  categories: ExpenseCategory[];
  transactions: Transaction[];
  disabledDate?: boolean;
}

export function FilterControls({
  onApplyFilters,
  categories,
  transactions,
  disabledDate = false,
}: FilterControlsProps) {
  const [filterType, setFilterType] = useState('range');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState('all');
  const { paymentMethods } = usePaymentMethods();

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    return Array.from(years).sort((a,b) => b - a);
  }, [transactions]);

  const months = [
      {value: '0', label: 'January'},
      {value: '1', label: 'February'},
      {value: '2', label: 'March'},
      {value: '3', label: 'April'},
      {value: '4', label: 'May'},
      {value: '5', label: 'June'},
      {value: '6', label: 'July'},
      {value: '7', label: 'August'},
      {value: '8', label: 'September'},
      {value: '9', label: 'October'},
      {value: '10', label: 'November'},
      {value: '11', label: 'December'},
  ]

  const handleApply = () => {
    onApplyFilters({
      dateFrom: filterType === 'range' ? dateFrom : '',
      dateTo: filterType === 'range' ? dateTo : '',
      month: filterType === 'month' ? month : 'all',
      year: filterType === 'month' ? year : 'all',
      categories: selectedCategories,
      paymentMethods: selectedPaymentMethods,
    });
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setMonth('all');
    setYear('all');
    setSelectedCategories([]);
    setSelectedPaymentMethods([]);
    onApplyFilters({
        dateFrom: '',
        dateTo: '',
        month: 'all',
        year: 'all',
        categories: [],
        paymentMethods: []
    });
  }

  const categoryOptions = useMemo(() => {
    const options = [
      {
        value: 'income',
        label: 'Income',
        icon: BadgeDollarSign,
      },
      ...categories.map(cat => ({
        value: cat.value,
        label: cat.label,
        icon: getIcon(cat.icon),
      }))
    ];
    return options;
  }, [categories]);

  const paymentMethodOptions = useMemo(() => {
    return paymentMethods.map(pm => ({
        value: pm.id,
        label: pm.label,
        icon: Wallet,
    }));
  }, [paymentMethods]);

  return (
    <div className="space-y-4">
        <fieldset disabled={disabledDate}>
            <Tabs value={filterType} onValueChange={setFilterType}>
                <TabsList>
                    <TabsTrigger value="range">Date Range</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
                <TabsContent value="range">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end mt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date-from">Start Date</Label>
                            <Input 
                                id="date-from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date-to">End Date</Label>
                            <Input 
                                id="date-to"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="month">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end mt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="month">Month</Label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger id="month">
                                    <SelectValue placeholder="Select a month" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Months</SelectItem>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="year">Year</Label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger id="year">
                                    <SelectValue placeholder="Select a year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {availableYears.map(y => (
                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </fieldset>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2">
            <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <MultiSelect
                    options={categoryOptions}
                    selected={selectedCategories}
                    onChange={setSelectedCategories}
                    placeholder="Select categories..."
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <MultiSelect
                    options={paymentMethodOptions}
                    selected={selectedPaymentMethods}
                    onChange={setSelectedPaymentMethods}
                    placeholder="Select methods..."
                />
            </div>
        </div>
        
        <div className="flex gap-2 lg:col-span-1">
            <Button onClick={handleApply} className="w-full">
            Apply Filters
            </Button>
            <Button variant="ghost" onClick={clearFilters} className="w-full">
            Clear
            </Button>
        </div>

      </div>
    </div>
  );
}
