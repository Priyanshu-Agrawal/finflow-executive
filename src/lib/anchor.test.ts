import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorRowFor } from './anchor';

const rows = [
  { rowIndex: 3, date: '2026-11-09' },
  { rowIndex: 4, date: '2026-11-11' },
  { rowIndex: 5, date: '2026-11-11' },
  { rowIndex: 6, date: '2026-11-14' },
];

test('anchor is the last row dated on or before the reference date', () => {
  assert.equal(anchorRowFor(rows, '2026-11-12')?.rowIndex, 5);
  assert.equal(anchorRowFor(rows, '2026-11-11')?.rowIndex, 5);
  assert.equal(anchorRowFor(rows, '2026-12-01')?.rowIndex, 6);
});

test('a reference date before every row anchors on the first row', () => {
  assert.equal(anchorRowFor(rows, '2026-01-01')?.rowIndex, 3);
});

test('no rows means no anchor', () => {
  assert.equal(anchorRowFor([], '2026-11-12'), null);
});

test('rows out of date order still give the last one in list order that is not later than the date', () => {
  const messy = [
    { rowIndex: 3, date: '2026-11-10' },
    { rowIndex: 4, date: '2026-11-20' },
    { rowIndex: 5, date: '2026-11-09' },
  ];
  assert.equal(anchorRowFor(messy, '2026-11-12')?.rowIndex, 5);
});
