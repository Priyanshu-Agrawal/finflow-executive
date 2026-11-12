// One date and money format for the whole app (polish rule 6).
// Dates are calendar dates: they are split as text and never go through a time zone.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!hit) return null;
  const y = Number(hit[1]);
  const m = Number(hit[2]);
  const d = Number(hit[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** `2026-11-12` becomes `12 Nov 2026`. Anything that is not an ISO date is returned as is. */
export function formatDate(iso: string): string {
  const p = parseIso(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : iso;
}

/** `2026-11-12` becomes `12 Nov`. */
export function formatDateShort(iso: string): string {
  const p = parseIso(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]}` : iso;
}

/** `2027-08-06` becomes `Aug 2027`. */
export function formatMonthYear(iso: string): string {
  const p = parseIso(iso);
  return p ? `${MONTHS[p.m - 1]} ${p.y}` : iso;
}

/** `2026-11-12` becomes `Thu 12 Nov`. */
export function formatWeekdayDate(iso: string): string {
  const p = parseIso(iso);
  if (!p) return iso;
  return `${WEEKDAYS[new Date(p.y, p.m - 1, p.d).getDay()]} ${p.d} ${MONTHS[p.m - 1]}`;
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** `114021` becomes `₹1,14,021`; negatives get a real minus (`−₹5,000`); NaN and Infinity become `₹0`. */
export function formatMoney(v: number): string {
  if (!Number.isFinite(v)) return '₹0';
  const r = Math.round(v);
  if (r === 0) return '₹0';
  return `${r < 0 ? '−' : ''}₹${inr.format(Math.abs(r))}`;
}

/** Like `formatMoney` but always shows the direction: `+₹9,200` or `−₹9,200`. */
export function formatMoneySigned(v: number): string {
  const s = formatMoney(v);
  return s !== '₹0' && !s.startsWith('−') ? `+${s}` : s;
}
