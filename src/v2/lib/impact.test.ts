import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FX_ORDERED } from './testing';
import { moveImpact } from './impact';

const TODAY = '2026-11-12';
const CUSHION_UNTIL = '2026-12-07';

test('moving a past row below a later-dated row stops it counting', () => {
  const r = moveImpact(FX_ORDERED, 4, 6, TODAY, CUSHION_UNTIL); // Milk -> below Rent
  assert.equal(r.balanceBefore, 75700);
  assert.equal(r.balanceAfter, 75800);
  assert.equal(r.lowestBefore, 75200);
  assert.equal(r.lowestAfter, 75300);
  assert.deepEqual(r.crossed, [{ rowIndex: 4, becomes: 'uncounted' }]);
  assert.deepEqual(r.outOfOrderAfter.map((o) => [o.rowIndex, o.date]), [[6, '2026-11-06']]);
});

test('moving a future row above the line stops every row under it counting', () => {
  const r = moveImpact(FX_ORDERED, 6, 3, TODAY, CUSHION_UNTIL); // Rent -> above Salary
  assert.equal(r.balanceAfter, 75000);
  assert.deepEqual(r.crossed, [
    { rowIndex: 3, becomes: 'uncounted' },
    { rowIndex: 4, becomes: 'uncounted' },
    { rowIndex: 5, becomes: 'uncounted' },
  ]);
});

test('moving a row inside the line keeps today and crosses nothing', () => {
  const r = moveImpact(FX_ORDERED, 5, 3, TODAY, CUSHION_UNTIL); // Groceries -> above Salary
  assert.equal(r.balanceAfter, 75700);
  assert.deepEqual(r.crossed, []);
});

test('dropping a row where it already is changes nothing', () => {
  const r = moveImpact(FX_ORDERED, 4, 4, TODAY, CUSHION_UNTIL);
  assert.equal(r.balanceAfter, r.balanceBefore);
  assert.deepEqual(r.crossed, []);
  assert.deepEqual(r.outOfOrderAfter, []);
});
