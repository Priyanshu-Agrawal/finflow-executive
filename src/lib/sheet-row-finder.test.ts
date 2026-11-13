import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRowByDateDescription } from './sheet-row-finder';

const rows = [
  { rowIndex: 15, date: '2025-09-08', description: 'BCA EMI' },
  { rowIndex: 235, date: '2026-11-06', description: 'Total General Expenses' },
  { rowIndex: 236, date: '2026-11-06', description: 'Bike EMI' },
  { rowIndex: 247, date: '2026-12-06', description: 'Total General Expenses' },
  { rowIndex: 248, date: '2026-12-06', description: 'Remaining Expenses Budget' },
];

test('finds a row by its exact date and description', () => {
  assert.equal(findRowByDateDescription(rows, '2025-09-08', 'BCA EMI')?.rowIndex, 15);
});

test('disambiguates two rows with the same description on different dates', () => {
  assert.equal(findRowByDateDescription(rows, '2026-11-06', 'Total General Expenses')?.rowIndex, 235);
  assert.equal(findRowByDateDescription(rows, '2026-12-06', 'Total General Expenses')?.rowIndex, 247);
});

test('still finds the row after earlier rows are inserted (the whole point: no row-number assumption)', () => {
  const shifted = [
    { rowIndex: 10, date: '2024-01-01', description: 'An earlier back-dated entry' },
    ...rows.map((r) => ({ ...r, rowIndex: r.rowIndex + 1 })),
  ];
  assert.equal(findRowByDateDescription(shifted, '2026-12-06', 'Remaining Expenses Budget')?.rowIndex, 249);
});

test('returns null when nothing matches', () => {
  assert.equal(findRowByDateDescription(rows, '2099-01-01', 'Nothing here'), null);
});

test('match is exact on description, not a substring (so it does not confuse similarly named rows)', () => {
  assert.equal(findRowByDateDescription(rows, '2026-12-06', 'Total General'), null);
});
