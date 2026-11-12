import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FX_ORDERED, makeRows } from '../lib/testing';
import { buildLogRequest, type LogForm } from '../lib/log';
import { createHistory } from './history';
import { createSync, ConflictError } from './sync';
import { performLog } from './logEntry';
import type { ExpenseEntry } from '../../lib/types';

const TODAY = '2026-11-06';
const form = (over: Partial<LogForm> = {}): LogForm => ({ amount: '20', description: 'Tea', dateChoice: 'today', type: 'Spent', repeatMonthly: false, ...over });
const req = (f: LogForm) => {
  const r = buildLogRequest(f, TODAY);
  assert.ok(r.ok);
  return r;
};

function setup(opts: { online?: boolean; postImpl?: (url: string, body: unknown) => Promise<Record<string, number>> } = {}) {
  let rows: ExpenseEntry[] = FX_ORDERED.map((r) => ({ ...r }));
  const calls = { post: [] as Array<[string, unknown]>, del: [] as number[], refetch: 0 };
  const sync = createSync({ isOnline: () => opts.online !== false, now: () => 1 });
  const history = createHistory();
  const deps = {
    rows: () => rows,
    setRows: (r: ExpenseEntry[]) => { rows = r; },
    sync, history,
    post: async (url: string, body: unknown) => {
      calls.post.push([url, body]);
      return opts.postImpl ? opts.postImpl(url, body) : { newRow: 5 };
    },
    del: async (row: number) => { calls.del.push(row); },
    refetch: async () => { calls.refetch++; },
  };
  return { deps, calls, getRows: () => rows, setRowsDirect: (r: ExpenseEntry[]) => { rows = r; }, history };
}

test('a logged entry shows at once, is posted once, and is recorded in history', async () => {
  let rowsDuringPost: ExpenseEntry[] = [];
  const s2 = setup({ postImpl: async () => { rowsDuringPost = s2.getRows(); return { newRow: 5 }; } });
  assert.equal(await performLog(s2.deps, req(form()), 'Logged Tea ₹20'), true);
  assert.equal(rowsDuringPost.some((r) => r.description === 'Tea' && r.rowIndex === 5), true, 'visible before the server answered');
  assert.deepEqual(s2.calls.post, [['/api/expenses/log', { date: TODAY, description: 'Tea', amount: 20, type: 'DEBIT' }]]);
  assert.equal(s2.calls.refetch, 1);
  assert.deepEqual(s2.history.getState().entries.map((e) => e.label), ['Logged Tea ₹20']);
});

test('a conflict removes the optimistic row and records nothing', async () => {
  const t = setup({ postImpl: async () => { throw new ConflictError('Row changed'); } });
  assert.equal(await performLog(t.deps, req(form()), 'x'), false);
  assert.deepEqual(t.getRows().map((r) => [r.rowIndex, r.balance]), FX_ORDERED.map((r) => [r.rowIndex, r.balance]));
  assert.equal(t.history.getState().entries.length, 0);
});

test('undo deletes the logged row when the sheet still holds it', async () => {
  const t = setup();
  await performLog(t.deps, req(form()), 'Logged Tea');
  assert.equal(await t.history.undo(), true);
  assert.deepEqual(t.calls.del, [5]);
});

test('undo refuses to delete a row that is no longer the logged entry', async () => {
  const t = setup();
  await performLog(t.deps, req(form()), 'Logged Tea');
  t.setRowsDirect(t.getRows().map((r) => (r.rowIndex === 5 ? { ...r, description: 'Something else' } : r)));
  assert.equal(await t.history.undo(), false);
  assert.deepEqual(t.calls.del, []);
  assert.equal(t.history.getState().cursor, 1);
  assert.match(t.history.getState().error ?? '', /sheet changed/i);
});

test('redo logs the entry again', async () => {
  const t = setup();
  await performLog(t.deps, req(form()), 'Logged Tea');
  await t.history.undo();
  assert.equal(await t.history.redo(), true);
  assert.equal(t.calls.post.length, 2);
});

test('Repeat monthly posts the schedule and undo deletes its rows last first', async () => {
  const t = setup({ postImpl: async () => ({ startRow: 7, count: 6 }) });
  // Simulate the server's appended rows arriving with the refetch.
  const base = FX_ORDERED.map((r) => ({ ...r }));
  const emi = makeRows([
    ['2026-11-01', 'Opening', 0, 'DEBIT'], ['2026-11-05', 'Salary', 1000, 'CREDIT'], ['2026-11-06', 'Milk', 100, 'DEBIT'], ['2026-11-12', 'Groceries', 200, 'DEBIT'], ['2026-11-13', 'Rent', 500, 'DEBIT'],
    ...[1, 2, 3, 4, 5, 6].map((i): [string, string, number, 'DEBIT'] => [`2026-${String(10 + i).slice(-2)}-06`, `Phone EMI (EMI ${i}/6)`, 20, 'DEBIT']),
  ]);
  t.deps.refetch = async () => { t.calls.refetch++; t.setRowsDirect(emi); };
  t.setRowsDirect(base);
  assert.equal(await performLog(t.deps, req(form({ description: 'Phone EMI', repeatMonthly: true })), 'Scheduled Phone EMI'), true);
  assert.equal(t.calls.post[0][0], '/api/expenses/schedule-emi');
  assert.equal(t.history.getState().entries.length, 1);
  assert.equal(await t.history.undo(), true);
  assert.deepEqual(t.calls.del, [12, 11, 10, 9, 8, 7]);
});

test('offline refuses the write and leaves the rows as they were', async () => {
  const t = setup({ online: false });
  assert.equal(await performLog(t.deps, req(form()), 'x'), false);
  assert.equal(t.calls.post.length, 0);
  assert.deepEqual(t.getRows().map((r) => r.rowIndex), FX_ORDERED.map((r) => r.rowIndex));
  assert.equal(t.history.getState().entries.length, 0);
});
