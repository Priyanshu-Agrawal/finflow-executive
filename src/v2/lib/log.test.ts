import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRows } from './testing';
import { pressKey, usualDescriptions, buildLogRequest, type LogForm } from './log';

const TODAY = '2026-11-12';
const form = (over: Partial<LogForm> = {}): LogForm => ({
  amount: '250', description: '', dateChoice: 'today', type: 'Spent', repeatMonthly: false, ...over,
});

test('pressKey builds an amount digit by digit', () => {
  assert.equal(pressKey('', '0'), '');
  assert.equal(pressKey('25', '0'), '250');
  assert.equal(pressKey('5', '00'), '500');
  assert.equal(pressKey('250', 'del'), '25');
  assert.equal(pressKey('', 'del'), '');
});

test('pressKey stops at 7 digits', () => {
  assert.equal(pressKey('1234567', '8'), '1234567');
  assert.equal(pressKey('123456', '00'), '123456');
});

test('usualDescriptions puts General Expenses first, then the most frequent small debits', () => {
  const rows = makeRows([
    ['2026-09-01', 'Opening', 0, 'DEBIT'],
    ['2026-10-01', 'Petrol', 500, 'DEBIT'],
    ['2026-10-05', 'Petrol', 500, 'DEBIT'],
    ['2026-10-09', 'Petrol', 500, 'DEBIT'],
    ['2026-10-10', 'Milk', 60, 'DEBIT'],
    ['2026-10-11', 'Milk', 60, 'DEBIT'],
    ['2026-10-12', 'Swiggy', 400, 'DEBIT'],
    ['2026-10-13', 'Remaining Expenses Budget', 11000, 'DEBIT'],
    ['2026-10-14', 'Big purchase', 20000, 'DEBIT'],
    ['2026-10-15', 'Salary', 80000, 'CREDIT'],
  ]);
  assert.deepEqual(usualDescriptions(rows, TODAY, 4), ['General Expenses', 'Petrol', 'Milk', 'Swiggy']);
});

test('usualDescriptions ignores rows older than 120 days', () => {
  const rows = makeRows([
    ['2025-01-01', 'Opening', 0, 'DEBIT'],
    ['2025-02-01', 'Old thing', 100, 'DEBIT'],
  ]);
  assert.deepEqual(usualDescriptions(rows, TODAY), ['General Expenses']);
});

test('buildLogRequest makes a single entry with the default description', () => {
  assert.deepEqual(buildLogRequest(form({ dateChoice: 'yesterday' }), TODAY), {
    ok: true, kind: 'single',
    body: { date: '2026-11-11', description: 'General Expenses', amount: 250, type: 'DEBIT' },
  });
});

test('buildLogRequest maps Received and Settled and passes a custom date', () => {
  const r = buildLogRequest(form({ type: 'Received', dateChoice: { custom: '2026-12-01' }, description: 'From Harsh' }), TODAY);
  assert.deepEqual(r, { ok: true, kind: 'single', body: { date: '2026-12-01', description: 'From Harsh', amount: 250, type: 'CREDIT' } });
  const s = buildLogRequest(form({ type: 'Settled' }), TODAY);
  assert.equal(s.ok && s.kind === 'single' && s.body.type, 'SETTLEMENT');
});

test('Repeat monthly builds a 6-month schedule', () => {
  assert.deepEqual(buildLogRequest(form({ repeatMonthly: true, description: 'Phone EMI' }), TODAY), {
    ok: true, kind: 'emi',
    body: { title: 'Phone EMI', monthlyAmount: 250, months: 6, startDate: TODAY, type: 'DEBIT' },
  });
});

test('an empty or zero amount never makes a request', () => {
  assert.deepEqual(buildLogRequest(form({ amount: '' }), TODAY), { ok: false, reason: 'Enter an amount.' });
  assert.deepEqual(buildLogRequest(form({ amount: '0' }), TODAY), { ok: false, reason: 'Enter an amount.' });
});
