import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetry } from './retry';

test('a quota error is never retried', () => {
  assert.equal(shouldRetry(0, new Error("Quota exceeded for quota metric 'Read requests'")), false);
  assert.equal(shouldRetry(0, new Error('429 Too Many Requests')), false);
});

test('other errors are retried twice at most', () => {
  assert.equal(shouldRetry(0, new Error('boom')), true);
  assert.equal(shouldRetry(1, new Error('boom')), true);
  assert.equal(shouldRetry(2, new Error('boom')), false);
});

test('a non-Error failure is retried like any other', () => {
  assert.equal(shouldRetry(0, 'network down'), true);
});
