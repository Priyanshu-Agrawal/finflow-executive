// Pure helpers for Expenses row moves and Column E balances. No server imports, so the
// client can use them to show a drag-reorder instantly, before Google Sheets confirms.
import { ExpenseEntry } from './types';

/**
 * Generates the continuation formula for Column E.
 * The Time Lapse boundary rows (currently Rows 38 & 39) are recognised by their
 * description, not their row number, so the rule follows them if rows shift and can
 * never be applied to an unrelated transaction that lands on Row 38 or 39.
 * Always pass the row's description.
 */
export function buildBalanceFormula(row: number, description?: string): string {
  const desc = (description || '').toLowerCase();
  if (desc.includes('time lapse clear balance')) {
    return '=0';
  }
  if (desc.includes('time lapse start balance')) {
    return `=C${row}`;
  }
  const prev = row - 1;
  return `=IF(OR(D${row}="", D${row}="ADJUSTMENT", D${row}="SETTLEMENT", D${row}="OTHER", D${row}="DIRECT"), E${prev}, IF(D${row}="DEBIT", E${prev}-C${row}, IF(D${row}="CREDIT", E${prev}+C${row}, "")))`;
}

/** Evaluates the Column E rule for one row, given the balance of the row above. */
export function nextBalance(prev: number, entry: Pick<ExpenseEntry, 'description' | 'amount' | 'type'>): number {
  const desc = entry.description.toLowerCase();
  if (desc.includes('time lapse clear balance')) return 0;
  if (desc.includes('time lapse start balance')) return entry.amount;
  if (entry.type === 'DEBIT') return prev - entry.amount;
  if (entry.type === 'CREDIT') return prev + entry.amount;
  return prev; // '', ADJUSTMENT, SETTLEMENT, OTHER, DIRECT carry the balance forward
}

/** Where row `row` ends up after moving row `from` to row `to` (whole-row move). */
export function movedRowNumber(row: number, from: number, to: number): number {
  if (row === from) return to;
  if (from < to && row > from && row <= to) return row - 1;
  if (to < from && row >= to && row < from) return row + 1;
  return row;
}

/**
 * What the Expenses list looks like after reorderExpenseRows(from, to): rows renumbered,
 * Column E balances and formulas recomputed from the first affected row. Cleared rows
 * (not in the list) carry the balance forward, so skipping them is exact.
 */
export function previewRowMove(expenses: ExpenseEntry[], from: number, to: number): ExpenseEntry[] {
  if (from === to) return expenses;
  const moved = expenses
    .map((e) => ({ ...e, rowIndex: movedRowNumber(e.rowIndex, from, to) }))
    .sort((a, b) => a.rowIndex - b.rowIndex);
  const first = Math.min(from, to);
  for (let i = 0; i < moved.length; i++) {
    const e = moved[i];
    if (e.rowIndex < first) continue;
    const prev = i > 0 ? moved[i - 1].balance : 0;
    e.balance = nextBalance(prev, e);
    e.formula = buildBalanceFormula(e.rowIndex, e.description);
    e.isFormulaBacked = true;
  }
  return moved;
}
