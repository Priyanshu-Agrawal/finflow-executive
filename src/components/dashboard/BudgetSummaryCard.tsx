'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import { BudgetPacing } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { SectionLink } from '@/components/ui/SectionLink';

/**
 * One compact card: what you can spend today, and how this cycle's budget is tracking.
 * The full breakdown (electricity, rent, Hard month, the config drawer) lives on /budget.
 */
export function BudgetSummaryCard({ pacing }: { pacing: BudgetPacing }) {
  const spentPct = Math.min(100, pacing.generalSpentPercent);
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Gauge className="h-4 w-4 text-amber-400" aria-hidden="true" />
          Budget
        </h3>
        <span className="text-xs text-zinc-400">{pacing.daysRemainingInCycle} days left</span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums text-white">{formatMoney(pacing.generalPerDayLimit)}</span>
        <span className="text-xs text-zinc-400">safe to spend / day</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${spentPct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-zinc-400">
        {formatMoney(pacing.generalSpentSoFar)} spent of {formatMoney(pacing.generalBudget)} this cycle ({pacing.generalSpentPercent}%)
      </p>

      <div className="mt-3 border-t border-white/[0.06] pt-2">
        <SectionLink href="/budget">Open Budget</SectionLink>
      </div>
    </div>
  );
}
