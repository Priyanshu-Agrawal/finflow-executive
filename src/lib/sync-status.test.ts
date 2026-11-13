import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSyncedAgo } from './sync-status';

test('formatSyncedAgo says "just now" for anything under a minute', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatSyncedAgo(now, now), 'just now');
  assert.equal(formatSyncedAgo(now - 30_000, now), 'just now');
});

test('formatSyncedAgo counts minutes under an hour', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatSyncedAgo(now - 90_000, now), '1 min ago');
  assert.equal(formatSyncedAgo(now - 5 * 60_000, now), '5 min ago');
});

test('formatSyncedAgo counts hours under a day', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatSyncedAgo(now - 60 * 60_000, now), '1 hr ago');
  assert.equal(formatSyncedAgo(now - 3 * 60 * 60_000, now), '3 hr ago');
});

test('formatSyncedAgo says yesterday or more at a day or beyond', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatSyncedAgo(now - 25 * 60 * 60_000, now), 'yesterday');
  assert.equal(formatSyncedAgo(now - 3 * 24 * 60 * 60_000, now), '3 days ago');
});

test('formatSyncedAgo handles a missing timestamp', () => {
  assert.equal(formatSyncedAgo(null, 1_700_000_000_000), 'never');
});
