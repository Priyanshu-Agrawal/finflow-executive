// Sentences on the Home hero, built from the sheet data (polish rule 10: no hard-coded money text).
import type { ExpenseEntry, LoanStatus } from './types';
import { formatDateShort, formatMoney, formatMonthYear } from './format';

const BILL_DAYS = 5;

/** Same calendar arithmetic as the dashboard figures: pure date parts, no time zone. */
function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

type BillRow = Pick<ExpenseEntry, 'date' | 'description' | 'amount' | 'type'>;

/** DEBIT rows dated tomorrow through five days ahead: the rows `kpis.upcomingBills` adds up (today is already paid). */
export function upcomingBills<T extends BillRow>(expenses: readonly T[], referenceDate: string): T[] {
  const from = addDaysIso(referenceDate, 1);
  const to = addDaysIso(referenceDate, BILL_DAYS);
  return expenses.filter((e) => e.type === 'DEBIT' && e.date >= from && e.date <= to);
}

/** `Rent ₹15,000 + SBI Card Payment ₹61,465`, or a plain sentence when nothing is due. */
export function upcomingBillsCaption(expenses: readonly BillRow[], referenceDate: string): string {
  const bills = upcomingBills(expenses, referenceDate);
  if (bills.length === 0) return `No bills in the next ${BILL_DAYS} days`;
  return bills.map((b) => `${b.description} ${formatMoney(b.amount)}`).join(' + ');
}

/** `By 17 Nov`: the last day the upcoming-bills window covers. */
export function billsDeadline(referenceDate: string): string {
  return `By ${formatDateShort(addDaysIso(referenceDate, BILL_DAYS))}`;
}

/** Growth of the balance from now to the projected end, or null when there is no sensible base. */
export function growthCaption(current: number, projectedEnd: number): string | null {
  if (!Number.isFinite(current) || !Number.isFinite(projectedEnd) || current <= 0) return null;
  const pct = ((projectedEnd - current) / current) * 100;
  const rounded = Math.abs(pct).toFixed(1);
  return `${pct < 0 ? '−' : '+'}${rounded}% by the end of the projection`;
}

type LoanRow = Pick<LoanStatus, 'isPaidOff' | 'monthlyEmi' | 'targetPayoffDate'>;

/** `Debt-free by Aug 2027, freeing ₹14,771 a month` from the loans that are still open; null when none is. */
export function debtFreeLine(loans: readonly LoanRow[]): string | null {
  const open = loans.filter((l) => !l.isPaidOff && l.targetPayoffDate);
  if (open.length === 0) return null;
  const last = open.map((l) => l.targetPayoffDate as string).sort().at(-1) as string;
  const emi = Math.round(open.reduce((sum, l) => sum + (l.monthlyEmi ?? 0), 0));
  return `Debt-free by ${formatMonthYear(last)}${emi > 0 ? `, freeing ${formatMoney(emi)} a month` : ''}`;
}
