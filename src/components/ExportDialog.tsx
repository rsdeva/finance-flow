'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Transaction } from '@/lib/types';
import type * as Papa from 'papaparse';

interface ExportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  allTransactions: Transaction[];
  filteredTransactions: Transaction[];
}

export function ExportDialog({
  isOpen,
  setIsOpen,
  allTransactions,
  filteredTransactions,
}: ExportDialogProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [dataSource, setDataSource] = useState<'filtered' | 'all'>('filtered');

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleExport = async () => {
    const transactionsToExport = dataSource === 'all' ? allTransactions : filteredTransactions;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    
    if (transactionsToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no transactions in the selected data set.',
      });
      return;
    }

    if (format === 'json') {
      const jsonContent = JSON.stringify(transactionsToExport, (key, value) => {
        if (key === 'date') return new Date(value).toISOString();
        return value;
      }, 2);
      downloadFile(jsonContent, `transactions-${timestamp}.json`, 'application/json');
    } else { // CSV
      // Dynamically import papaparse only on the client
      const Papa = (await import('papaparse')).default;
      const csvData = transactionsToExport.map(t => ({
        ID: t.id,
        Type: t.type,
        Date: new Date(t.date).toISOString().split('T')[0], // Format as YYYY-MM-DD
        Reason: t.reason,
        Amount: t.amount,
        Category: t.category,
        'Investment Category': t.investmentCategory,
        'Payment Method': t.paymentMethod,
        Notes: t.notes
      }));
      
      const csvContent = Papa.unparse(csvData);
      downloadFile(csvContent, `transactions-${timestamp}.csv`, 'text/csv;charset=utf-s8;');
    }
    
    toast({
      title: 'Export Successful',
      description: `Your transactions have been downloaded as a ${format.toUpperCase()} file.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Transactions</DialogTitle>
          <DialogDescription>
            Choose the format and data set for your export.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label>Data to Export</Label>
                <RadioGroup value={dataSource} onValueChange={(value) => setDataSource(value as 'filtered' | 'all')}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="filtered" id="filtered" />
                        <Label htmlFor="filtered">Filtered Transactions ({filteredTransactions.length})</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all">All Transactions ({allTransactions.length})</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="space-y-2">
                <Label>Export Format</Label>
                <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'csv' | 'json')}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="csv" id="csv" />
                        <Label htmlFor="csv">CSV (for Excel, Google Sheets)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="json" id="json" />
                        <Label htmlFor="json">JSON (for developers)</Label>
                    </div>
                </RadioGroup>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
