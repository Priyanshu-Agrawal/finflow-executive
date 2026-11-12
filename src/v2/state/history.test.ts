import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from './history';

/** An entry that records its forward/inverse calls in `log`. */
function entry(log: string[], label: string, opts: { failInverse?: boolean; delay?: boolean } = {}) {
  return {
    label,
    forward: async () => { log.push(`forward ${label}`); },
    inverse: async () => {
      if (opts.delay) await new Promise((r) => setTimeout(r, 10));
      if (opts.failInverse) throw new Error('boom');
      log.push(`inverse ${label}`);
    },
  };
}

test('undo runs the latest inverse and redo runs its forward', async () => {
  const log: string[] = [];
  const h = createHistory();
  h.push(entry(log, 'A'));
  h.push(entry(log, 'B'));
  assert.equal(await h.undo(), true);
  assert.deepEqual(log, ['inverse B']);
  assert.equal(h.getState().cursor, 1);
  assert.equal(await h.redo(), true);
  assert.deepEqual(log, ['inverse B', 'forward B']);
  assert.equal(h.getState().cursor, 2);
});

test('a new change after an undo clears the redo stack', async () => {
  const log: string[] = [];
  const h = createHistory();
  h.push(entry(log, 'A'));
  h.push(entry(log, 'B'));
  await h.undo();
  h.push(entry(log, 'C'));
  assert.deepEqual(h.getState().entries.map((e) => e.label), ['A', 'C']);
  assert.equal(h.getState().cursor, 2);
  assert.equal(await h.redo(), false);
});

test('the limit drops the oldest entries', () => {
  const h = createHistory({ limit: 2 });
  for (const l of ['A', 'B', 'C']) h.push(entry([], l));
  assert.deepEqual(h.getState().entries.map((e) => e.label), ['B', 'C']);
  assert.equal(h.getState().cursor, 2);
});

test('an inverse that fails leaves the history unchanged and records why', async () => {
  const h = createHistory();
  h.push(entry([], 'A'));
  h.push(entry([], 'B', { failInverse: true }));
  assert.equal(await h.undo(), false);
  assert.equal(h.getState().cursor, 2);
  assert.equal(h.getState().error, 'boom');
});

test('jumpTo undoes newest first down to the target', async () => {
  const log: string[] = [];
  const h = createHistory();
  for (const l of ['A', 'B', 'C']) h.push(entry(log, l));
  assert.equal(await h.jumpTo(0), true);
  assert.deepEqual(log, ['inverse C', 'inverse B', 'inverse A']);
  assert.equal(h.getState().cursor, 0);
});

test('a second undo while one is running is refused', async () => {
  const h = createHistory();
  h.push(entry([], 'A', { delay: true }));
  h.push(entry([], 'B', { delay: true }));
  const [first, second] = await Promise.all([h.undo(), h.undo()]);
  assert.deepEqual([first, second], [true, false]);
  assert.equal(h.getState().cursor, 1);
});
