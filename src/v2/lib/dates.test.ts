import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, dayMonth, weekdayShort, longDate, localToday } from './dates';

test('daysBetween counts calendar days', () => {
  assert.equal(daysBetween('2026-11-07', '2026-12-07'), 30);
  assert.equal(daysBetween('2026-11-12', '2026-11-12'), 0);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
});

test('date labels', () => {
  assert.equal(dayMonth('2026-11-07'), '7 Nov');
  assert.equal(weekdayShort('2026-11-12'), 'Thu');
  assert.equal(longDate('2026-11-12'), 'Thursday, 12 Nov');
});

test('localToday is a YYYY-MM-DD string', () => {
  assert.match(localToday(), /^\d{4}-\d{2}-\d{2}$/);
});
