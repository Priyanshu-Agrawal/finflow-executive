// Test fixtures for the v2 pure logic. Not imported by app code.
import type { ExpenseEntry, TransactionType } from '../../lib/types';
import { nextBalance } from '../../lib/row-move';

export type RowSpec = [date: string, description: string, amount: number, type: TransactionType];

/** First spec is the opening row (row 2, balance = opening); later rows run on from it. */
export function makeRows(specs: RowSpec[], opening = 75000): ExpenseEntry[] {
  const rows: ExpenseEntry[] = [];
  specs.forEach(([date, description, amount, type], i) => {
    const prev = rows[i - 1]?.balance ?? opening;
    const entry: ExpenseEntry = {
      rowIndex: 2 + i,
      date,
      rawDate: date,
      description,
      amount,
      type,
      balance: 0,
      isFormulaBacked: true,
    };
    entry.balance = i === 0 ? opening : nextBalance(prev, entry);
    rows.push(entry);
  });
  return rows;
}

export const FX_ORDERED = makeRows([
  ['2026-11-01', 'Opening', 0, 'DEBIT'],
  ['2026-11-05', 'Salary', 1000, 'CREDIT'],
  ['2026-11-06', 'Milk', 100, 'DEBIT'],
  ['2026-11-12', 'Groceries', 200, 'DEBIT'],
  ['2026-11-13', 'Rent', 500, 'DEBIT'],
]);
