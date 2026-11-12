// What a row move does to today's balance, computed on a preview before anything is saved.
import type { ExpenseEntry } from '../../lib/types';
import { previewRowMove, movedRowNumber } from '../../lib/row-move';
import { balanceBoundary, findOutOfOrder, type BalanceBoundary, type OutOfPlace } from './order';

export interface MoveImpact {
  rows: ExpenseEntry[];
  balanceBefore: number;
  balanceAfter: number;
  lowestBefore: number;
  lowestAfter: number;
  /** Rows whose "counts towards today's balance" status flips; `rowIndex` is the ORIGINAL row number. */
  crossed: Array<{ rowIndex: number; becomes: 'counted' | 'uncounted' }>;
  outOfOrderAfter: OutOfPlace[];
}

const counts = (index: number, b: BalanceBoundary) => b.firstLaterIndex === null || index < b.firstLaterIndex;

/** Lowest balance before the next salary (the postNovBalance rule in computeKPIs). */
function lowest(rows: ExpenseEntry[], b: BalanceBoundary, today: string, cushionUntil: string): number {
  let low = b.currentBalance;
  for (const r of rows) if (r.date > today && r.date < cushionUntil && r.balance < low) low = r.balance;
  return low;
}

/** `from` / `to` are sheet row numbers, as in previewRowMove. */
export function moveImpact(rows: ExpenseEntry[], from: number, to: number, today: string, cushionUntil: string): MoveImpact {
  const before = balanceBoundary(rows, today);
  const preview = previewRowMove(rows, from, to);
  const after = balanceBoundary(preview, today);

  const countedAfter = new Map<number, boolean>();
  preview.forEach((r, i) => countedAfter.set(r.rowIndex, counts(i, after)));

  const crossed: MoveImpact['crossed'] = [];
  rows.forEach((r, i) => {
    const was = counts(i, before);
    const now = countedAfter.get(movedRowNumber(r.rowIndex, from, to));
    if (now !== undefined && now !== was) crossed.push({ rowIndex: r.rowIndex, becomes: now ? 'counted' : 'uncounted' });
  });

  return {
    rows: preview,
    balanceBefore: before.currentBalance,
    balanceAfter: after.currentBalance,
    lowestBefore: lowest(rows, before, today, cushionUntil),
    lowestAfter: lowest(preview, after, today, cushionUntil),
    crossed,
    outOfOrderAfter: findOutOfOrder(preview),
  };
}
