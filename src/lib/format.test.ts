import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatDateShort, formatWeekdayDate, formatMoney, formatMoneySigned } from './format';

test('formatDate gives day, short month and year', () => {
  assert.equal(formatDate('2026-11-12'), '12 Nov 2026');
  assert.equal(formatDate('2027-03-05'), '5 Mar 2027');
});

test('formatDateShort drops the year', () => {
  assert.equal(formatDateShort('2026-11-12'), '12 Nov');
});

test('formatWeekdayDate adds the weekday', () => {
  assert.equal(formatWeekdayDate('2026-11-12'), 'Thu 12 Nov');
  assert.equal(formatWeekdayDate('2026-11-15'), 'Sun 15 Nov');
});

test('date helpers hand back anything that is not an ISO date untouched', () => {
  assert.equal(formatDate(''), '');
  assert.equal(formatDateShort('not a date'), 'not a date');
});

test('formatMoney uses Indian grouping with the rupee sign', () => {
  assert.equal(formatMoney(114021), '₹1,14,021');
  assert.equal(formatMoney(0), '₹0');
  assert.equal(formatMoney(1234567), '₹12,34,567');
});

test('formatMoney writes negatives with a real minus', () => {
  assert.equal(formatMoney(-5000), '−₹5,000');
});

test('formatMoney treats non-finite numbers as zero', () => {
  assert.equal(formatMoney(NaN), '₹0');
  assert.equal(formatMoney(Infinity), '₹0');
});

test('formatMoney does not print a minus for values that round to zero', () => {
  assert.equal(formatMoney(-0.2), '₹0');
});

test('formatMoneySigned always shows the direction', () => {
  assert.equal(formatMoneySigned(9200), '+₹9,200');
  assert.equal(formatMoneySigned(-9200), '−₹9,200');
  assert.equal(formatMoneySigned(0), '₹0');
});
