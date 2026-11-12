import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRows, type RowSpec } from './testing';
import { findOutOfOrder, balanceBoundary, dateSlot } from './order';
import { FX_ORDERED } from './testing';
import { findChronologicalInsertRow } from '../../lib/sheets';
import { computeKPIs } from '../../lib/computations';

/** An opening row dated 2026-11-01, then one DEBIT per given date ('' = cleared row). */
const withDates = (dates: string[]) =>
  makeRows([
    ['2026-11-01', 'Opening', 0, 'DEBIT'],
    ...dates.map((d): RowSpec => [d, 'x', 10, 'DEBIT']),
  ]);
const d = (day: string) => `2026-11-${day}`;

test('rows already in date order are all in place', () => {
  assert.deepEqual(findOutOfOrder(withDates([d('05'), d('06'), d('12'), d('13')])), []);
});

test('one future-dated row sitting early is flagged by itself', () => {
  assert.deepEqual(findOutOfOrder(withDates([d('05'), d('20'), d('06'), d('07')])), [
    { rowIndex: 4, date: d('20'), sitsAmong: d('05') },
  ]);
});

test('one past-dated row sitting late is flagged by itself', () => {
  assert.deepEqual(findOutOfOrder(withDates([d('05'), d('06'), d('02'), d('07')])), [
    { rowIndex: 5, date: d('02'), sitsAmong: d('06') },
  ]);
});

test('equal dates are in order', () => {
  assert.deepEqual(findOutOfOrder(withDates([d('05'), d('05'), d('05')])), []);
});

test('rows with an empty date are ignored', () => {
  assert.deepEqual(findOutOfOrder(withDates([d('05'), '', d('06')])), []);
});

test('on a tie the later-dated row is the one flagged', () => {
  assert.deepEqual(findOutOfOrder(withDates([d('09'), d('03')])), [
    { rowIndex: 3, date: d('09'), sitsAmong: d('01') },
  ]);
});

test('balanceBoundary reads down to the last row dated on or before today', () => {
  assert.deepEqual(balanceBoundary(FX_ORDERED, d('12')), { lastCountedIndex: 3, firstLaterIndex: 4, currentBalance: 75700 });
});

test('balanceBoundary before the first row falls back to the first balance', () => {
  assert.deepEqual(balanceBoundary(FX_ORDERED, '2026-10-31'), { lastCountedIndex: -1, firstLaterIndex: 0, currentBalance: 75000 });
});

test('balanceBoundary after every row counts them all', () => {
  assert.deepEqual(balanceBoundary(FX_ORDERED, '2026-12-31'), { lastCountedIndex: 4, firstLaterIndex: null, currentBalance: 75200 });
});

test('position beats date: a future-dated row sitting early stops the reading', () => {
  const rows = withDates([d('05'), d('20'), d('06')]);
  const b = balanceBoundary(rows, d('10'));
  assert.equal(b.firstLaterIndex, 2);
  assert.equal(b.currentBalance, rows[1].balance);
});

test('balanceBoundary agrees with computeKPIs', () => {
  for (const t of ['2026-10-31', d('05'), d('12'), d('13'), '2026-12-31']) {
    assert.equal(balanceBoundary(FX_ORDERED, t).currentBalance, computeKPIs(FX_ORDERED, t, 7).currentBalance);
  }
});

test('dateSlot puts a new row before the first later-dated row', () => {
  assert.deepEqual(dateSlot(FX_ORDERED, d('06')), { position: 3, rowNumber: 5 });
  assert.deepEqual(dateSlot(FX_ORDERED, '2026-10-01'), { position: 1, rowNumber: 3 });
});

test('dateSlot puts a row after the last row when none is later', () => {
  assert.deepEqual(dateSlot(FX_ORDERED, d('14')), { position: 5, rowNumber: 7 });
});

test('dateSlot keeps a same-day cycle summary row below the new entry', () => {
  const rows = makeRows([
    ['2026-11-01', 'Opening', 0, 'DEBIT'],
    ['2026-11-13', 'Rent', 500, 'DEBIT'],
    ['2026-11-13', 'Total General Expenses', 0, 'DEBIT'],
  ]);
  assert.deepEqual(dateSlot(rows, d('13')), { position: 2, rowNumber: 4 });
});

test('dateSlot matches the server rule (findChronologicalInsertRow)', () => {
  const rows = makeRows([
    ['2026-11-01', 'Opening', 0, 'DEBIT'],
    ['2026-11-05', 'Salary', 1000, 'CREDIT'],
    ['2026-11-06', 'Milk', 100, 'DEBIT'],
    ['2026-11-12', 'Groceries', 200, 'DEBIT'],
    ['2026-11-13', 'Rent', 500, 'DEBIT'],
    ['2026-11-13', 'Total General Expenses', 0, 'DEBIT'],
  ]);
  const colAB: unknown[][] = [['Date', 'Description']];
  rows.forEach((r) => { colAB[r.rowIndex - 1] = [r.date, r.description]; });
  for (const date of ['2026-10-01', '2026-11-05', '2026-11-06', '2026-11-13', '2026-12-01']) {
    assert.equal(dateSlot(rows, date).rowNumber, findChronologicalInsertRow(colAB, date), date);
  }
});
