import type { ExpenseEntry } from '@/lib/types';
import { daysBetween, dayMonth } from '../lib/dates';
import { rupees } from '../lib/format';

/** Balance from the cycle start to the next salary: past muted, future ink, today ringed, lowest dashed. */
export function PathChart({ rows, from, until, today, lowest }: {
  rows: ExpenseEntry[]; from: string; until: string; today: string; lowest: { date: string | null; balance: number };
}) {
  const pts = rows.filter((r) => r.date && r.date >= from && r.date <= until && r.type);
  if (pts.length === 0) return null;
  const W = 342, H = 140, L = 8, R = 334, T = 16, B = 112;
  const span = Math.max(1, daysBetween(from, until));
  const vals = pts.map((r) => r.balance).concat(lowest.balance);
  const hi = Math.max(...vals), lo = Math.min(0, ...vals);
  const x = (d: string) => L + ((R - L) * Math.max(0, daysBetween(from, d))) / span;
  const y = (v: number) => B - ((B - T) * (v - lo)) / Math.max(1, hi - lo);

  const past: string[] = [], future: string[] = [];
  let prev: { x: number; y: number } | null = null;
  for (const r of pts) {
    const p = { x: x(r.date), y: y(r.balance) };
    const arr = r.date <= today ? past : future;
    if (prev) {
      if (arr === future && future.length === 0) future.push(`${prev.x.toFixed(1)},${prev.y.toFixed(1)}`);
      arr.push(`${p.x.toFixed(1)},${prev.y.toFixed(1)}`); // step: the balance holds until the next row
    }
    arr.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    prev = p;
  }
  const last = [...pts].reverse().find((r) => r.date <= today);
  const tx = x(today), ty = last ? y(last.balance) : null;
  const lx = lowest.date ? x(lowest.date) : R, ly = y(lowest.balance);

  return (
    <svg className="t-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Balance from ${dayMonth(from)} to ${dayMonth(until)}. Lowest ${rupees(lowest.balance)}${lowest.date ? ` on ${dayMonth(lowest.date)}` : ''}.`}>
      <line x1={L} y1={ly} x2={R} y2={ly} stroke="var(--blue)" strokeDasharray="3 4" />
      <polyline points={past.join(' ')} fill="none" stroke="var(--ink2)" strokeWidth="2.5" strokeLinejoin="round" opacity="0.55" />
      <polyline points={future.join(' ')} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
      {ty !== null && <>
        <circle cx={tx} cy={ty} r="6" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
        <text x={tx} y={Math.max(10, ty - 11)} fontSize="11" fill="var(--ink2)" textAnchor="middle">today</text>
      </>}
      <circle cx={lx} cy={ly} r="5" fill="var(--blue)" />
      <text x={Math.min(R, lx + 4)} y={ly + 18} fontSize="11" fill="var(--blue)" textAnchor="end">lowest</text>
      <line x1={L} y1={H - 6} x2={R} y2={H - 6} stroke="var(--line)" />
      <text x={L} y={H - 10} fontSize="10" fill="var(--ink2)">{dayMonth(from)}</text>
      <text x={R} y={H - 10} fontSize="10" fill="var(--ink2)" textAnchor="end">{dayMonth(until)}, salary</text>
    </svg>
  );
}
