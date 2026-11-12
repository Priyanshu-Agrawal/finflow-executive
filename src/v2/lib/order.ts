// Pure date-order logic for the Expenses sheet. No server imports.
import type { ExpenseEntry } from '../../lib/types';

export interface OutOfPlace {
  rowIndex: number;
  date: string;
  /** Date of the nearest in-place row above it (or below, if none above). */
  sitsAmong: string;
}

/**
 * Rows that form the longest run already in date order are "in place"; every other dated
 * row is out of place. Rows with no date are ignored. When several longest runs exist, the
 * one with the earliest dates is kept, so the later-dated row is the one flagged.
 */
export function findOutOfOrder(rows: ExpenseEntry[]): OutOfPlace[] {
  const idx = rows.map((_, i) => i).filter((i) => rows[i].date !== '');
  const n = idx.length;
  if (n === 0) return [];
  const date = (k: number) => rows[idx[k]].date;

  // lenFrom[k] = length of the longest non-decreasing run starting at k.
  const lenFrom = new Array<number>(n).fill(1);
  for (let k = n - 1; k >= 0; k--) {
    for (let j = k + 1; j < n; j++) {
      if (date(j) >= date(k) && lenFrom[j] + 1 > lenFrom[k]) lenFrom[k] = lenFrom[j] + 1;
    }
  }

  // Build the run with the earliest dates (then the earliest rows).
  const kept = new Set<number>();
  let remaining = Math.max(...lenFrom);
  let prev = -1;
  while (remaining > 0) {
    let best = -1;
    for (let k = prev + 1; k < n; k++) {
      if (lenFrom[k] !== remaining) continue;
      if (prev >= 0 && date(k) < date(prev)) continue;
      if (best === -1 || date(k) < date(best)) best = k;
    }
    kept.add(best);
    prev = best;
    remaining--;
  }

  const out: OutOfPlace[] = [];
  for (let k = 0; k < n; k++) {
    if (kept.has(k)) continue;
    let ref = -1;
    for (let j = k - 1; j >= 0 && ref === -1; j--) if (kept.has(j)) ref = j;
    for (let j = k + 1; j < n && ref === -1; j++) if (kept.has(j)) ref = j;
    out.push({ rowIndex: rows[idx[k]].rowIndex, date: date(k), sitsAmong: date(ref) });
  }
  return out;
}

export interface BalanceBoundary {
  /** Index of the last row that counts towards today's balance (-1 if none). */
  lastCountedIndex: number;
  /** Index of the first row dated after today, where the reading stops (null if none). */
  firstLaterIndex: number | null;
  currentBalance: number;
}

/** Today's balance rule (same as computeKPIs): read down while date <= today, stop at the first later row. */
export function balanceBoundary(rows: ExpenseEntry[], today: string): BalanceBoundary {
  let lastCountedIndex = -1;
  let firstLaterIndex: number | null = null;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].date <= today) lastCountedIndex = i;
    else {
      firstLaterIndex = i;
      break;
    }
  }
  const currentBalance = lastCountedIndex >= 0 ? rows[lastCountedIndex].balance : (rows[0]?.balance ?? 0);
  return { lastCountedIndex, firstLaterIndex, currentBalance };
}

const CYCLE_SUMMARY_RE = /total general expenses|remaining expenses budget/i;

/**
 * Where a new row dated `date` belongs. Mirrors findChronologicalInsertRow in src/lib/sheets.ts:
 * ignore rows 1-2, the first later-dated row wins, a same-day cycle summary row stays below the
 * new entry, otherwise after the last row.
 */
export function dateSlot(rows: ExpenseEntry[], date: string): { position: number; rowNumber: number } {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.rowIndex < 3 || r.date === '') continue;
    if (r.date > date) return { position: i, rowNumber: r.rowIndex };
    if (r.date === date && CYCLE_SUMMARY_RE.test(r.description)) return { position: i, rowNumber: r.rowIndex };
  }
  const last = rows[rows.length - 1];
  return { position: rows.length, rowNumber: last ? last.rowIndex + 1 : 3 };
}
