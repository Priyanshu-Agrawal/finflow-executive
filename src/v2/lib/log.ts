// Pure logic for the Log sheet: keypad, usual descriptions, and the API request it builds.
import type { ExpenseEntry } from '../../lib/types';
import { SET_ASIDE_RE } from './today';

export const DEFAULT_DESCRIPTION = 'General Expenses';
const MAX_DIGITS = 7;

export function pressKey(amount: string, key: string): string {
  if (key === 'del') return amount.slice(0, -1);
  if (amount === '' && key.startsWith('0')) return amount;
  const next = amount + key;
  return next.length > MAX_DIGITS ? amount : next;
}

function isoAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, m - 1, d + days);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** "General Expenses" first, then the most frequent small debits of the last 120 days (ties: most recent). */
export function usualDescriptions(rows: ExpenseEntry[], today: string, limit = 7): string[] {
  const since = isoAddDays(today, -120);
  const seen = new Map<string, { n: number; last: string }>();
  for (const r of rows) {
    const d = r.description.trim();
    if (r.type !== 'DEBIT' || r.date < since || r.date > today || r.amount >= 5000) continue;
    if (!d || SET_ASIDE_RE.test(d) || d.toLowerCase() === DEFAULT_DESCRIPTION.toLowerCase()) continue;
    const cur = seen.get(d) ?? { n: 0, last: '' };
    seen.set(d, { n: cur.n + 1, last: r.date > cur.last ? r.date : cur.last });
  }
  const top = [...seen.entries()]
    .sort((a, b) => b[1].n - a[1].n || (a[1].last < b[1].last ? 1 : -1))
    .slice(0, Math.max(0, limit - 1))
    .map(([d]) => d);
  return [DEFAULT_DESCRIPTION, ...top];
}

export type LogType = 'DEBIT' | 'CREDIT' | 'SETTLEMENT';
export interface LogForm {
  amount: string;
  description: string;
  dateChoice: 'today' | 'yesterday' | { custom: string };
  type: 'Spent' | 'Received' | 'Settled';
  repeatMonthly: boolean;
}
export type LogRequest =
  | { ok: false; reason: string }
  | { ok: true; kind: 'single'; body: { date: string; description: string; amount: number; type: LogType } }
  | { ok: true; kind: 'emi'; body: { title: string; monthlyAmount: number; months: 6; startDate: string; type: LogType } };

const TYPE_MAP: Record<LogForm['type'], LogType> = { Spent: 'DEBIT', Received: 'CREDIT', Settled: 'SETTLEMENT' };

export function buildLogRequest(form: LogForm, today: string): LogRequest {
  const amount = Number(form.amount);
  if (!form.amount || !Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'Enter an amount.' };
  const date =
    form.dateChoice === 'today' ? today
    : form.dateChoice === 'yesterday' ? isoAddDays(today, -1)
    : form.dateChoice.custom;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: 'Pick a valid date.' };
  const description = form.description.trim() || DEFAULT_DESCRIPTION;
  const type = TYPE_MAP[form.type];
  if (form.repeatMonthly) {
    return { ok: true, kind: 'emi', body: { title: description, monthlyAmount: amount, months: 6, startDate: date, type } };
  }
  return { ok: true, kind: 'single', body: { date, description, amount, type } };
}
