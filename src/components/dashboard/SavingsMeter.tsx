'use client';

import React, { useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { SavingsCycle } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';

// Diverging pair validated with the dataviz palette check on #18181B (CVD-safe, unlike green/red).
const SAVED = '#3b82f6';
const OVERSPENT = '#ea580c';
const CHART_H = 132;

const signed = (n: number) => (n > 0 ? `+${formatINR(n)}` : n < 0 ? `−${formatINR(Math.abs(n))}` : formatINR(0));
const monthOf = (d: string) => formatDisplayDate(d).split(' ')[1] ?? d;
const range = (c: SavingsCycle) => {
  const endDay = new Date(c.end);
  endDay.setDate(endDay.getDate() - 1);
  const e = `${endDay.getFullYear()}-${String(endDay.getMonth() + 1).padStart(2, '0')}-${String(endDay.getDate()).padStart(2, '0')}`;
  return `${formatDisplayDate(c.start).split(' ').slice(0, 2).join(' ')} – ${formatDisplayDate(e)}`;
};
const kindLabel = { past: 'actual', current: 'this cycle, projected', projected: 'projected' } as const;

function Stat({ label, value, sub }: { label: string; value: number | null; sub: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3 min-w-0">
      <span className="text-[11px] text-zinc-400 block truncate">{label}</span>
      <div className="mt-1 flex items-center gap-1.5">
        {value !== null && (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: value < 0 ? OVERSPENT : SAVED }} aria-hidden />
        )}
        <span className="font-mono text-lg sm:text-xl font-bold text-white truncate">
          {value === null ? '—' : signed(value)}
        </span>
      </div>
      <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">{sub}</span>
    </div>
  );
}

export function SavingsMeter({ trend }: { trend: SavingsCycle[] }) {
  const current = trend.find((c) => c.kind === 'current') ?? null;
  const next = trend.find((c) => c.kind === 'projected') ?? null;
  const pastCycles = trend.filter((c) => c.kind === 'past');
  const avgPast = pastCycles.length ? Math.round(pastCycles.reduce((s, c) => s + c.saving, 0) / pastCycles.length) : null;
  const [active, setActive] = useState<number>(Math.max(0, trend.findIndex((c) => c.kind === 'current')));

  if (trend.length === 0) return null;

  const maxPos = Math.max(0, ...trend.map((c) => c.saving));
  const maxNeg = Math.max(0, ...trend.map((c) => -c.saving));
  const span = maxPos + maxNeg || 1;
  const baseline = (maxPos / span) * CHART_H; // px from the top
  const sel = trend[active] ?? trend[0];

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-[#121214] p-4 sm:p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-amber-400" />
            Savings Meter
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Saved per salary cycle: balance before one salary vs before the next</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
        <Stat label="This cycle" value={current?.saving ?? null} sub={current ? `projected · ${range(current)}` : 'no data'} />
        <Stat label="Next cycle" value={next?.saving ?? null} sub={next ? `projected · ${range(next)}` : 'no data'} />
        <Stat label={`Avg last ${pastCycles.length}`} value={avgPast} sub="actual cycles" />
      </div>

      {/* Diverging bars around zero; tap or hover a bar for its detail */}
      <div className="relative" style={{ height: CHART_H }} role="img" aria-label="Saving per cycle, bars above zero saved, below zero overspent">
        <div className="absolute inset-x-0 border-t border-white/[0.18]" style={{ top: baseline }} aria-hidden />
        <div className="absolute inset-0 flex gap-0.5">
          {trend.map((c, i) => {
            const h = Math.max(2, (Math.abs(c.saving) / span) * CHART_H);
            const pos = c.saving >= 0;
            const isSel = i === active;
            return (
              <button
                key={c.start}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={`${range(c)}: ${signed(c.saving)} (${kindLabel[c.kind]})`}
                className={`relative flex-1 min-w-0 rounded-md transition-colors ${isSel ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
              >
                <span
                  className="absolute left-1/2 -translate-x-1/2 w-[62%] max-w-6"
                  style={{
                    top: pos ? baseline - h : baseline,
                    height: h,
                    background: pos ? SAVED : OVERSPENT,
                    opacity: c.kind === 'projected' ? 0.45 : 1,
                    borderRadius: pos ? '4px 4px 0 0' : '0 0 4px 4px',
                    boxShadow: c.kind === 'current' ? '0 0 0 2px #121214, 0 0 0 3.5px #f4f4f5' : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-0.5 mt-1.5" aria-hidden>
        {trend.map((c, i) => (
          <span key={c.start} className={`flex-1 min-w-0 text-center text-[10px] font-mono truncate ${i === active ? 'text-white' : 'text-zinc-500'}`}>
            {monthOf(c.start)}
          </span>
        ))}
      </div>

      {/* Detail line (works for tap on mobile) */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
        <span className="text-xs text-zinc-400">
          {range(sel)} · <span className="text-zinc-300">{kindLabel[sel.kind]}</span>
        </span>
        <span className="font-mono text-sm font-bold text-white">{signed(sel.saving)}</span>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SAVED }} />Saved</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: OVERSPENT }} />Overspent</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-zinc-400 opacity-45" />Projected</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm ring-[1.5px] ring-zinc-100 ring-offset-1 ring-offset-[#121214]" />This cycle</span>
      </div>

      <table className="sr-only">
        <caption>Saving per salary cycle</caption>
        <thead><tr><th>Cycle</th><th>Saving</th><th>Kind</th></tr></thead>
        <tbody>
          {trend.map((c) => (
            <tr key={c.start}><td>{range(c)}</td><td>{signed(c.saving)}</td><td>{kindLabel[c.kind]}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
