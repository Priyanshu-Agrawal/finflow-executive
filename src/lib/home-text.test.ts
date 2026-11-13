import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upcomingBills, upcomingBillsCaption, billsDeadline, growthCaption, debtFreeLine, homeSpendingCategories } from './home-text';
import { formatMonthYear } from './format';

const rows = [
  { date: '2026-11-12', description: 'General Expenses', amount: 500, type: 'DEBIT' as const },
  { date: '2026-11-15', description: 'Total Electricity Recharge', amount: 800, type: 'SETTLEMENT' as const },
  { date: '2026-11-15', description: 'Remaining Electricity Budget', amount: 2400, type: 'DEBIT' as const },
  { date: '2026-11-15', description: 'Rent', amount: 15000, type: 'DEBIT' as const },
  { date: '2026-11-16', description: 'SBI Card Payment', amount: 61465, type: 'DEBIT' as const },
  { date: '2026-11-18', description: 'Too late', amount: 100, type: 'DEBIT' as const },
  { date: '2026-11-14', description: 'Salary', amount: 9000, type: 'CREDIT' as const },
];

test('upcoming bills are DEBIT rows from tomorrow to five days ahead (today is already paid)', () => {
  assert.deepEqual(upcomingBills(rows, '2026-11-12').map((r) => r.description), ['Remaining Electricity Budget', 'Rent', 'SBI Card Payment']);
});

test('the caption names every real bill with its amount', () => {
  assert.equal(upcomingBillsCaption(rows, '2026-11-12'), 'Remaining Electricity Budget ₹2,400 + Rent ₹15,000 + SBI Card Payment ₹61,465');
});

test('the caption says so when no bill is due', () => {
  assert.equal(upcomingBillsCaption([], '2026-11-12'), 'No bills in the next 5 days');
});

test('the deadline is five days after the reference date, across month ends', () => {
  assert.equal(billsDeadline('2026-11-12'), 'By 17 Nov');
  assert.equal(billsDeadline('2026-11-28'), 'By 3 Dec');
  assert.equal(billsDeadline('2026-12-30'), 'By 4 Jan');
});

test('growth is computed from the balance now and the projected end', () => {
  assert.equal(growthCaption(114021, 255989), '+124.5% by the end of the projection');
  assert.equal(growthCaption(200000, 150000), '−25.0% by the end of the projection');
});

test('growth is left out when there is nothing to compare with', () => {
  assert.equal(growthCaption(0, 100000), null);
  assert.equal(growthCaption(-5, 100000), null);
  assert.equal(growthCaption(NaN, 1), null);
});

const loans = [
  { isPaidOff: false, monthlyEmi: 11770.92, targetPayoffDate: '2027-08-06' },
  { isPaidOff: false, monthlyEmi: 3000, targetPayoffDate: '2027-03-05' },
  { isPaidOff: false, targetPayoffDate: '2026-11-16' },
  { isPaidOff: true, monthlyEmi: 5000, targetPayoffDate: '2028-01-01' },
];

test('debt-free line uses the latest payoff date of active loans and the EMIs they free up', () => {
  assert.equal(debtFreeLine(loans), 'Debt-free by Aug 2027, freeing ₹14,771 a month');
});

test('debt-free line leaves out the EMI part when no active loan has an EMI', () => {
  assert.equal(debtFreeLine([{ isPaidOff: false, targetPayoffDate: '2026-11-16' }]), 'Debt-free by Nov 2026');
});

test('debt-free line is empty when nothing is owed', () => {
  assert.equal(debtFreeLine([{ isPaidOff: true, targetPayoffDate: '2027-01-01' }]), null);
  assert.equal(debtFreeLine([]), null);
  assert.equal(debtFreeLine([{ isPaidOff: false }]), null);
});

test('formatMonthYear gives a short month and the year', () => {
  assert.equal(formatMonthYear('2027-08-06'), 'Aug 2027');
  assert.equal(formatMonthYear('junk'), 'junk');
});

const SPENDING_BHAIYA = { category: 'Bhaiya Udhar', amount: 83289, percentage: 4, count: 9, color: '#3B82F6' };
const SPENDING_HOUSING = { category: 'Housing & Utilities', amount: 446450, percentage: 22, count: 45, color: '#F59E0B' };
const SPENDING_OTHER = { category: 'Other Expenses', amount: 288979, percentage: 14, count: 32, color: '#71717A' };

test('homeSpendingCategories drops Bhaiya Udhar and recomputes percentages against the smaller total', () => {
  const out = homeSpendingCategories([SPENDING_HOUSING, SPENDING_BHAIYA, SPENDING_OTHER]);
  assert.equal(out.length, 2);
  assert.ok(!out.some((c) => c.category === 'Bhaiya Udhar'));
  const newTotal = SPENDING_HOUSING.amount + SPENDING_OTHER.amount;
  assert.equal(out.find((c) => c.category === 'Housing & Utilities')?.percentage, Math.round((SPENDING_HOUSING.amount / newTotal) * 100));
  const pctSum = out.reduce((s, c) => s + c.percentage, 0);
  assert.ok(pctSum >= 99 && pctSum <= 101, `percentages should sum to ~100 (got ${pctSum})`);
});

test('homeSpendingCategories passes everything through when there is no Bhaiya Udhar row', () => {
  const out = homeSpendingCategories([SPENDING_HOUSING, SPENDING_OTHER]);
  assert.equal(out.length, 2);
});

test('homeSpendingCategories handles an all-zero list without dividing by zero', () => {
  const out = homeSpendingCategories([{ category: 'Other Expenses', amount: 0, percentage: 0, count: 0, color: '#71717A' }]);
  assert.equal(out[0].percentage, 0);
});
