import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeDebtTotal, retiredDebtTotal, nextLoanMilestone } from './debt-summary';
import type { LoanStatus } from './types';

const base = { id: '', name: '', columnLetter: '', category: 'bank' as const, initialPrincipal: 0, progressPercent: 0 };
const loans: LoanStatus[] = [
  { ...base, id: 'bike', name: 'Bike', currentDue: 94167, paidToDate: 58855, isPaidOff: false, targetPayoffDate: '2027-08-06' },
  { ...base, id: 'bca', name: 'BCA', currentDue: 12000, paidToDate: 6000, isPaidOff: false, targetPayoffDate: '2027-03-05' },
  { ...base, id: 'sbi', name: 'SBI', currentDue: 61500, paidToDate: 0, isPaidOff: false },
  { ...base, id: 'old', name: 'Old loan', currentDue: 0, paidToDate: 18000, isPaidOff: true },
];

test('active debt totals only what is still owed on open loans', () => {
  assert.equal(activeDebtTotal(loans), 94167 + 12000 + 61500);
});

test('retired debt totals what has been paid across every loan', () => {
  assert.equal(retiredDebtTotal(loans), 58855 + 6000 + 0 + 18000);
});

test('the next milestone is the active loan with the soonest payoff date', () => {
  assert.equal(nextLoanMilestone(loans)?.id, 'bca');
});

test('a loan with no payoff date is not picked as the next milestone', () => {
  assert.equal(nextLoanMilestone([loans[2]]), null);
});

test('no active loans means no next milestone', () => {
  assert.equal(nextLoanMilestone([loans[3]]), null);
});
