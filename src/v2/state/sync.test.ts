import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSync, ConflictError, type SyncStatus } from './sync';

function job(log: string[], label: string, fail?: Error) {
  return {
    label,
    run: async () => {
      log.push(`run ${label}`);
      if (fail) throw fail;
    },
    rollback: () => { log.push(`rollback ${label}`); },
  };
}
const online = () => true;

test('jobs run one at a time in order, then the status is synced', async () => {
  const log: string[] = [];
  const s = createSync({ isOnline: online, now: () => 1000 });
  const seen: SyncStatus[] = [];
  s.subscribe(() => seen.push(s.getState()));
  const a = s.enqueue(job(log, 'A'));
  const b = s.enqueue(job(log, 'B'));
  assert.deepEqual(await Promise.all([a, b]), [true, true]);
  assert.deepEqual(log, ['run A', 'run B']);
  assert.deepEqual(
    seen.filter((x) => x.kind === 'saving').map((x) => (x as { pending: number }).pending),
    [1, 2, 1],
  );
  assert.deepEqual(s.getState(), { kind: 'synced', at: 1000 });
});

test('offline refuses a write with the reason and does not run it', async () => {
  const log: string[] = [];
  const s = createSync({ isOnline: () => false, now: () => 1 });
  assert.equal(await s.enqueue(job(log, 'A')), false);
  assert.deepEqual(log, []);
  assert.deepEqual(s.getState(), { kind: 'offline', reason: "You're offline. Changes can't be saved until you're back online." });
});

test('a conflict rolls back every unsaved change, newest first, and runs nothing behind it', async () => {
  const log: string[] = [];
  const s = createSync({ isOnline: online, now: () => 1 });
  const results = await Promise.all([
    s.enqueue(job(log, 'A', new ConflictError('Row 241 changed in the sheet.'))),
    s.enqueue(job(log, 'B')),
    s.enqueue(job(log, 'C')),
  ]);
  assert.deepEqual(results, [false, false, false]);
  assert.deepEqual(log, ['run A', 'rollback C', 'rollback B', 'rollback A']);
  assert.deepEqual(s.getState(), { kind: 'conflict', message: 'Row 241 changed in the sheet.' });
});

test('any other failure is an error, not a conflict', async () => {
  const s = createSync({ isOnline: online, now: () => 1 });
  assert.equal(await s.enqueue(job([], 'A', new Error('Sheets said no'))), false);
  assert.deepEqual(s.getState(), { kind: 'error', message: 'Sheets said no' });
});

test('refreshed() marks the data synced again', async () => {
  const s = createSync({ isOnline: online, now: () => 5 });
  await s.enqueue(job([], 'A', new Error('x')));
  s.refreshed();
  assert.deepEqual(s.getState(), { kind: 'synced', at: 5 });
});
