import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSpendingCategories } from './computations';
import type { ExpenseEntry } from './types';

const row = (rowIndex: number, date: string, description: string, amount: number, type: ExpenseEntry['type'] = 'DEBIT'): ExpenseEntry => ({
  rowIndex,
  date,
  rawDate: date,
  description,
  amount,
  type,
  balance: 0,
  isFormulaBacked: false,
});

function find(summary: ReturnType<typeof computeSpendingCategories>, category: string) {
  return summary.find((c) => c.category === category);
}

test('a "Bhaiya (Ledger)" row is its own category, not Family & Gifts', () => {
  const expenses = [row(1, '2026-10-12', 'Bhaiya (Ledger)', 9200, 'DEBIT')];
  const summary = computeSpendingCategories(expenses);
  assert.equal(find(summary, 'Bhaiya Udhar')?.count, 1);
  assert.equal(find(summary, 'Bhaiya Udhar')?.amount, 9200);
  assert.equal(find(summary, 'Family & Gifts')?.count, 0);
});

test('a same-day, same-amount, opposite-type leg of a bhaiya transaction is linked even without the word "bhaiya" in its own text', () => {
  const expenses = [
    row(53, '2026-04-30', 'SBI Card From bhaiya', 9000, 'CREDIT'),
    row(54, '2026-04-30', 'SBI Card Payment', 9000, 'DEBIT'),
  ];
  const summary = computeSpendingCategories(expenses);
  assert.equal(find(summary, 'Bhaiya Udhar')?.count, 1); // only the DEBIT counts (the function only sums DEBITs)
  assert.equal(find(summary, 'Bhaiya Udhar')?.amount, 9000);
  assert.equal(find(summary, 'Loan EMIs')?.count, 0);
});

test('an unrelated "SBI Card Payment" on a different date is not swept into Bhaiya Udhar', () => {
  const expenses = [
    row(53, '2026-04-30', 'SBI Card From bhaiya', 9000, 'CREDIT'),
    row(244, '2026-11-16', 'SBI Card Payment', 61465, 'DEBIT'), // different date and amount
  ];
  const summary = computeSpendingCategories(expenses);
  assert.equal(find(summary, 'Loan EMIs')?.count, 1);
  assert.equal(find(summary, 'Loan EMIs')?.amount, 61465);
  assert.equal(find(summary, 'Bhaiya Udhar')?.count, 0);
});

test('an unrelated same-day, same-amount pair with no "bhaiya" anywhere is left alone', () => {
  const expenses = [
    row(1, '2026-05-01', 'Salary', 5000, 'CREDIT'),
    row(2, '2026-05-01', 'General Expenses', 5000, 'DEBIT'),
  ];
  const summary = computeSpendingCategories(expenses);
  assert.equal(find(summary, 'Bhaiya Udhar')?.count, 0);
  assert.equal(find(summary, 'General & Ad-Hoc')?.count, 1);
});

test('other categories still classify normally (regression)', () => {
  const expenses = [row(1, '2026-01-01', 'Mummy gift', 2000, 'DEBIT')];
  const summary = computeSpendingCategories(expenses);
  assert.equal(find(summary, 'Family & Gifts')?.count, 1);
});

test('percentages still sum against the same grand total, just reassigned to the new bucket', () => {
  const expenses = [
    row(1, '2026-10-12', 'Bhaiya (Ledger)', 9200, 'DEBIT'),
    row(2, '2026-01-01', 'Mummy gift', 800, 'DEBIT'),
  ];
  const summary = computeSpendingCategories(expenses);
  const total = summary.reduce((s, c) => s + c.amount, 0);
  assert.equal(total, 10000);
  const pctTotal = summary.reduce((s, c) => s + c.percentage, 0);
  assert.ok(pctTotal >= 99 && pctTotal <= 101, `percentages should sum to ~100 (got ${pctTotal})`);
});
