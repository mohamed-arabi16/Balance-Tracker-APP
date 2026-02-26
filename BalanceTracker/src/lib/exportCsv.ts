import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Income } from '@/hooks/useIncomes';
import type { Expense } from '@/hooks/useExpenses';
import type { Debt } from '@/hooks/useDebts';
import type { Asset } from '@/hooks/useAssets';

/**
 * Escapes a value for safe inclusion in a CSV field.
 * Handles commas, double-quotes, and newlines per RFC 4180.
 */
const escapeCsv = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const escaped = str.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

/**
 * Exports all financial data as a CSV file and triggers the iOS native share sheet.
 *
 * Column schema matches the web app's Settings.tsx handleExportData function:
 * Date | Record Type | Title/Name | Amount | Currency | Category/Details | Status
 */
export async function exportCsv(
  incomes: Income[],
  expenses: Expense[],
  debts: Debt[],
  assets: Asset[]
): Promise<void> {
  const headers = [
    'Date',
    'Record Type',
    'Title/Name',
    'Amount',
    'Currency',
    'Category/Details',
    'Status',
  ];

  const rows: string[][] = [headers];

  incomes.forEach(i =>
    rows.push([
      escapeCsv(i.date),
      'Income',
      escapeCsv(i.title),
      escapeCsv(i.amount),
      escapeCsv(i.currency),
      escapeCsv(i.category),
      escapeCsv(i.status),
    ])
  );

  expenses.forEach(e =>
    rows.push([
      escapeCsv(e.date),
      'Expense',
      escapeCsv(e.title),
      escapeCsv(e.amount),
      escapeCsv(e.currency),
      escapeCsv(`${e.category} (${e.type})`),
      escapeCsv(e.status),
    ])
  );

  debts.forEach(d =>
    rows.push([
      escapeCsv(d.due_date ?? 'N/A'),
      d.is_receivable ? 'Debt (Expected Income)' : 'Debt (Payment Owed)',
      escapeCsv(d.title),
      escapeCsv(d.amount),
      escapeCsv(d.currency),
      escapeCsv(`Creditor: ${d.creditor}`),
      escapeCsv(d.status),
    ])
  );

  assets.forEach(a =>
    rows.push([
      escapeCsv(a.created_at ?? 'N/A'),
      'Asset',
      escapeCsv(a.type),
      escapeCsv(a.quantity * a.price_per_unit),
      escapeCsv(a.currency),
      escapeCsv(`Qty: ${a.quantity} ${a.unit} @ ${a.price_per_unit}`),
      escapeCsv(a.auto_update ? 'Auto-updating' : 'Manual'),
    ])
  );

  // Build the CSV string
  const csvContent = rows.map(r => r.join(',')).join('\n');

  // Write to the cache directory using the new expo-file-system v19 API
  const fileName = `financial-data-${new Date().toISOString().split('T')[0]}.csv`;
  const file = new File(Paths.cache, fileName);

  // Write synchronously — File.write() is synchronous in expo-file-system v19
  file.write(csvContent);

  // Trigger iOS native share sheet
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Financial Data',
    UTI: 'public.comma-separated-values-text',
  });
}
