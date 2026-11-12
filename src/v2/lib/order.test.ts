import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRows, type RowSpec } from './testing';
import { findOutOfOrder } from './order';

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
