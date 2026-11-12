import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FX_ORDERED } from './testing';

test('makeRows builds sheet-ordered rows with running balances', () => {
  assert.deepEqual(FX_ORDERED.map((r) => r.balance), [75000, 76000, 75900, 75700, 75200]);
  assert.deepEqual(FX_ORDERED.map((r) => r.rowIndex), [2, 3, 4, 5, 6]);
});
