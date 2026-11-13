import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryForDescription, categorizeExpenses } from './spending-category';
import { computeSpendingCategories } from './computations';
import type { ExpenseEntry, TransactionType } from './types';

test('matches each category keyword, in the same priority order as the breakdown', () => {
  assert.equal(categoryForDescription('Rent'), 'Housing & Utilities');
  assert.equal(categoryForDescription('Electricity Recharge'), 'Housing & Utilities');
  assert.equal(categoryForDescription('Bike EMI'), 'Loan EMIs');
  assert.equal(categoryForDescription('SBI Card Payment'), 'Loan EMIs'); // on its own, without pairing context
  assert.equal(categoryForDescription('Total Electricity Recharge Settlement'), 'Housing & Utilities'); // Housing is checked before Loan EMIs, same order as computations.ts
  assert.equal(categoryForDescription('Cursor and other subscription'), 'Tech & Subscriptions');
  assert.equal(categoryForDescription('Mummy gift'), 'Family & Gifts');
  assert.equal(categoryForDescription('Bhaiya (Ledger)'), 'Bhaiya Udhar');
  assert.equal(categoryForDescription('General Expenses'), 'General & Ad-Hoc');
  assert.equal(categoryForDescription('Something unrelated'), 'Other Expenses');
});

test('matching is case-insensitive', () => {
  assert.equal(categoryForDescription('RENT'), 'Housing & Utilities');
});

const row = (rowIndex: number, date: string, description: string, amount: number, type: TransactionType = 'DEBIT'): ExpenseEntry => ({
  rowIndex,
  date,
  rawDate: date,
  description,
  amount,
  type,
  balance: 0,
  isFormulaBacked: false,
});

test('categorizeExpenses links the non-worded leg of a same-day, same-amount Bhaiya pair, same as the server', () => {
  const expenses = [
    row(53, '2026-04-30', 'SBI Card From bhaiya', 9000, 'CREDIT'),
    row(54, '2026-04-30', 'SBI Card Payment', 9000, 'DEBIT'),
    row(244, '2026-11-16', 'SBI Card Payment', 61465, 'DEBIT'), // unrelated, different date/amount
  ];
  const byRow = categorizeExpenses(expenses);
  assert.equal(byRow.get(54), 'Bhaiya Udhar');
  assert.equal(byRow.get(244), 'Loan EMIs');
});

// Parity: this mirror must agree with computeSpendingCategories (the canonical rule,
// src/lib/computations.ts) on how many DEBIT rows land in each category.
test('agrees with computeSpendingCategories on a mixed set of real-looking rows, including the Bhaiya pairing', () => {
  const expenses = [
    row(1, '2026-11-01', 'Rent', 100),
    row(2, '2026-11-01', 'Electricity Recharge', 100),
    row(3, '2026-11-01', 'Bike EMI', 100),
    row(4, '2026-11-01', 'SBI Card Payment', 100),
    row(5, '2026-11-01', 'Cursor and other subscription', 100),
    row(6, '2026-11-01', 'Mummy gift', 100),
    row(7, '2026-11-01', 'General Expenses', 100),
    row(8, '2026-11-01', 'Petrol', 100),
    row(9, '2026-11-01', 'Random thing', 100),
    row(10, '2026-11-01', 'A credit that should not count', 100, 'CREDIT'),
    row(11, '2026-04-30', 'SBI Card From bhaiya', 9000, 'CREDIT'),
    row(12, '2026-04-30', 'SBI Card Payment', 9000, 'DEBIT'),
    row(13, '2026-10-12', 'Bhaiya (Ledger)', 9200, 'DEBIT'),
  ];
  const summary = computeSpendingCategories(expenses);
  const byRow = categorizeExpenses(expenses);
  for (const c of summary) {
    const mirrored = expenses.filter((e) => e.type === 'DEBIT' && byRow.get(e.rowIndex) === c.category).length;
    assert.equal(mirrored, c.count, `category "${c.category}": mirror counted ${mirrored}, computeSpendingCategories counted ${c.count}`);
  }
});
