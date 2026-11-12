// Logging a spend: optimistic insert, serial save, undoable. Pure apart from the injected deps.
import type { ExpenseEntry, TransactionType } from '../../lib/types';
import type { LogRequest } from '../lib/log';
import { insertByDate } from '../lib/order';
import { ConflictError, type Sync } from './sync';
import type { History } from './history';

type PostResult = { newRow?: number; startRow?: number; count?: number };

export interface LogDeps {
  rows: () => ExpenseEntry[];
  setRows: (rows: ExpenseEntry[]) => void;
  sync: Sync;
  history: History;
  post: (url: string, body: unknown) => Promise<PostResult>;
  del: (row: number) => Promise<void>;
  refetch: () => Promise<void>;
}

const CHANGED = 'The sheet changed since this was logged. Refresh, then delete it from the Passbook.';

/** Runs a write through the serial queue and throws (not returns false) so history can show why. */
function runQueued(deps: LogDeps, label: string, run: () => Promise<void>): Promise<void> {
  let failure: unknown;
  return deps.sync
    .enqueue({
      label,
      run: async () => {
        try { await run(); } catch (e) { failure = e; throw e; }
      },
      rollback: () => {},
    })
    .then((ok) => {
      if (ok) return;
      const st = deps.sync.getState();
      throw failure ?? new Error(st.kind === 'offline' ? st.reason : 'Could not save.');
    });
}

export async function performLog(deps: LogDeps, req: Extract<LogRequest, { ok: true }>, label: string): Promise<boolean> {
  const before = deps.rows();
  const url = req.kind === 'single' ? '/api/expenses/log' : '/api/expenses/schedule-emi';
  let result: PostResult = {};

  // Repeat monthly lands at the end of the sheet on the server, so it has no optimistic rows.
  if (req.kind === 'single') {
    deps.setRows(insertByDate(before, { ...req.body, type: req.body.type as TransactionType }).rows);
  }

  const ok = await deps.sync.enqueue({
    label,
    run: async () => {
      result = await deps.post(url, req.body);
      await deps.refetch();
    },
    rollback: () => deps.setRows(before),
  });
  if (!ok) {
    deps.setRows(before);
    return false;
  }

  if (req.kind === 'single') {
    const { date, description, amount } = req.body;
    let row = result.newRow ?? 0;
    deps.history.push({
      label,
      forward: async () => {
        await runQueued(deps, label, async () => {
          const r = await deps.post(url, req.body);
          row = r.newRow ?? row;
          await deps.refetch();
        });
      },
      inverse: async () => {
        const held = deps.rows().find((r) => r.rowIndex === row);
        if (!held || held.description !== description || held.amount !== amount || held.date !== date) {
          throw new ConflictError(CHANGED);
        }
        await runQueued(deps, `Delete ${description}`, async () => {
          await deps.del(row);
          await deps.refetch();
        });
      },
    });
  } else {
    const { title, months } = req.body;
    let startRow = result.startRow ?? 0;
    let count = result.count ?? months;
    deps.history.push({
      label,
      forward: async () => {
        await runQueued(deps, label, async () => {
          const r = await deps.post(url, req.body);
          startRow = r.startRow ?? startRow;
          count = r.count ?? count;
          await deps.refetch();
        });
      },
      inverse: async () => {
        for (let i = 0; i < count; i++) {
          const held = deps.rows().find((r) => r.rowIndex === startRow + i);
          if (!held || held.description !== `${title} (EMI ${i + 1}/${months})`) throw new ConflictError(CHANGED);
        }
        await runQueued(deps, `Delete ${title} schedule`, async () => {
          for (let i = count - 1; i >= 0; i--) await deps.del(startRow + i);
          await deps.refetch();
        });
      },
    });
  }
  return true;
}
