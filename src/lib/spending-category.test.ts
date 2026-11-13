import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryForDescription } from './spending-category';
import { computeSpendingCategories } from './computations';
import type { ExpenseEntry } from './types';

test('matches each category keyword, in the same priority order as the breakdown', () => {
  assert.equal(categoryForDescription('Rent'), 'Housing & Utilities');
  assert.equal(categoryForDescription('Electricity Recharge'), 'Housing & Utilities');
  assert.equal(categoryForDescription('Bike EMI'), 'Loan EMIs');
  assert.equal(categoryForDescription('SBI Card Payment'), 'Loan EMIs');
  assert.equal(categoryForDescription('Total Electricity Recharge Settlement'), 'Housing & Utilities'); // Housing is checked before Loan EMIs, same order as computations.ts
  assert.equal(categoryForDescription('Cursor and other subscription'), 'Tech & Subscriptions');
  assert.equal(categoryForDescription('Mummy gift'), 'Family & Gifts');
  assert.equal(categoryForDescription('General Expenses'), 'General & Ad-Hoc');
  assert.equal(categoryForDescription('Something unrelated'), 'Other Expenses');
});

test('matching is case-insensitive', () => {
  assert.equal(categoryForDescription('RENT'), 'Housing & Utilities');
});

// Parity: this mirror must agree with computeSpendingCategories (the canonical rule,
// src/lib/computations.ts) on how many DEBIT rows land in each category.
test('agrees with computeSpendingCategories on a mixed set of real-looking rows', () => {
  const row = (description: string, type: ExpenseEntry['type'] = 'DEBIT'): ExpenseEntry => ({
    rowIndex: 1,
    date: '2026-11-01',
    rawDate: '2026-11-01',
    description,
    amount: 100,
    type,
    balance: 0,
    isFormulaBacked: false,
  });
  const expenses = [
    row('Rent'),
    row('Electricity Recharge'),
    row('Bike EMI'),
    row('SBI Card Payment'),
    row('Cursor and other subscription'),
    row('Mummy gift'),
    row('General Expenses'),
    row('Petrol'),
    row('Random thing'),
    row('A credit that should not count', 'CREDIT'), // not a DEBIT: excluded from both
  ];
  const summary = computeSpendingCategories(expenses);
  for (const c of summary) {
    const mirrored = expenses.filter((e) => e.type === 'DEBIT' && categoryForDescription(e.description) === c.category).length;
    assert.equal(mirrored, c.count, `category "${c.category}": mirror counted ${mirrored}, computeSpendingCategories counted ${c.count}`);
  }
});
