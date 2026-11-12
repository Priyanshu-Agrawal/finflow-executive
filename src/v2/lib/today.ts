// Pure helpers for the Today screen. All budget numbers come from the API; these only
// select and label rows.
import type { ExpenseEntry } from '../../lib/types';
import { isGeneralExpense } from '../../lib/computations';
import { formatINR } from '../../lib/date-utils';

/** Rows the sheet keeps as budget placeholders; shown as "set aside", never as bills. */
export const SET_ASIDE_RE = /remaining .*budget|total general/i;

export function generalSpentOn(rows: ExpenseEntry[], date: string): number {
  return rows
    .filter((r) => r.date === date && r.type === 'DEBIT' && isGeneralExpense(r.description))
    .reduce((sum, r) => sum + r.amount, 0);
}

export function billsBefore(rows: ExpenseEntry[], today: string, until: string) {
  const ahead = rows.filter((r) => r.type === 'DEBIT' && r.date > today && r.date < until);
  const bills = ahead.filter((r) => !SET_ASIDE_RE.test(r.description));
  const setAside = ahead.filter((r) => SET_ASIDE_RE.test(r.description));
  return { bills, setAside, billsTotal: bills.reduce((sum, r) => sum + r.amount, 0) };
}

/** Same rule as postNovBalance in computeKPIs, plus the date it happens. */
export function lowestPointBefore(rows: ExpenseEntry[], today: string, until: string, currentBalance: number) {
  let date: string | null = null;
  let balance = currentBalance;
  for (const r of rows) {
    if (r.date > today && r.date < until && r.balance < balance) {
      balance = r.balance;
      date = r.date;
    }
  }
  return { date, balance };
}

export function loggedOn(rows: ExpenseEntry[], date: string): ExpenseEntry[] {
  return rows.filter((r) => r.date === date && r.type);
}

export function todayNote(spentToday: number, safePerDay: number): { kind: 'none' | 'within' | 'over'; text: string } {
  if (spentToday <= 0) return { kind: 'none', text: 'No general spending logged today yet.' };
  if (spentToday > safePerDay) {
    return { kind: 'over', text: `${formatINR(spentToday)} of general spending logged today, more than a day's share.` };
  }
  return { kind: 'within', text: `${formatINR(spentToday)} of general spending logged today.` };
}
