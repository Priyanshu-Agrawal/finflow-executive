import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRows } from './testing';
import { generalSpentOn, billsBefore, lowestPointBefore, loggedOn, todayNote } from './today';

const TODAY = '2026-11-12';
const UNTIL = '2026-12-07';
const rows = makeRows([
  ['2026-11-01', 'Opening', 0, 'DEBIT'],
  ['2026-11-05', 'Salary', 1000, 'CREDIT'],
  ['2026-11-12', 'Grocery', 200, 'DEBIT'],
  ['2026-11-12', 'General Expenses', 120, 'DEBIT'],
  ['2026-11-13', 'Electricity recharge', 3000, 'DEBIT'],
  ['2026-11-15', 'Rent', 15000, 'DEBIT'],
  ['2026-11-30', 'Remaining Expenses Budget', 11000, 'DEBIT'],
  ['2026-12-07', 'Next cycle bill', 500, 'DEBIT'],
]);

test('generalSpentOn sums general debits on that date only', () => {
  assert.equal(generalSpentOn(rows, TODAY), 320);
  assert.equal(generalSpentOn(rows, '2026-11-13'), 0);
});

test('billsBefore lists future debits before salary and sets budget rows aside', () => {
  const r = billsBefore(rows, TODAY, UNTIL);
  assert.deepEqual(r.bills.map((b) => b.description), ['Electricity recharge', 'Rent']);
  assert.equal(r.billsTotal, 18000);
  assert.deepEqual(r.setAside.map((b) => b.description), ['Remaining Expenses Budget']);
});

test('billsBefore excludes today and the salary day', () => {
  const r = billsBefore(rows, TODAY, UNTIL);
  assert.ok(!r.bills.some((b) => b.date === TODAY || b.date === UNTIL));
});

test('lowestPointBefore finds the lowest balance before salary and its date', () => {
  const r = lowestPointBefore(rows, TODAY, UNTIL, 75680);
  assert.deepEqual(r, { date: '2026-11-30', balance: 46680 });
});

test('lowestPointBefore with nothing ahead is the current balance and no date', () => {
  assert.deepEqual(lowestPointBefore(rows.slice(0, 4), TODAY, UNTIL, 75680), { date: null, balance: 75680 });
});

test('no future rows gives empty bills and a zero total', () => {
  const r = billsBefore(rows.slice(0, 4), TODAY, UNTIL);
  assert.deepEqual(r, { bills: [], setAside: [], billsTotal: 0 });
});

test('loggedOn returns that day\'s typed rows in sheet order and skips cleared rows', () => {
  const withCleared = [...rows, { ...rows[2], rowIndex: 99, type: '' as never, description: '' }];
  assert.deepEqual(loggedOn(withCleared, TODAY).map((r) => r.description), ['Grocery', 'General Expenses']);
});

test('todayNote words the three cases', () => {
  assert.deepEqual(todayNote(0, 440), { kind: 'none', text: 'No general spending logged today yet.' });
  assert.deepEqual(todayNote(320, 440), { kind: 'within', text: '₹320 of general spending logged today.' });
  assert.deepEqual(todayNote(760, 440), { kind: 'over', text: "₹760 of general spending logged today, more than a day's share." });
});
