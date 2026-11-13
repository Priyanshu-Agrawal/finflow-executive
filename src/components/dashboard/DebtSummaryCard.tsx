'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';
import { LoanStatus } from '@/lib/types';
import { formatMoney, formatDateShort } from '@/lib/format';
import { activeDebtTotal, retiredDebtTotal, nextLoanMilestone } from '@/lib/debt-summary';
import { SectionLink } from '@/components/ui/SectionLink';

/**
 * One compact card: what is still owed, and the next loan due to clear.
 * The full portfolio and the payoff timeline live on /loans.
 */
export function DebtSummaryCard({ loans }: { loans: LoanStatus[] }) {
  const active = activeDebtTotal(loans);
  const retired = retiredDebtTotal(loans);
  const total = active + retired;
  const paidPct = total > 0 ? Math.min(100, Math.round((retired / total) * 100)) : 0;
  const next = nextLoanMilestone(loans);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <CreditCard className="h-4 w-4 text-amber-400" aria-hidden="true" />
          Debt
        </h3>
        <span className="text-xs text-zinc-400">{paidPct}% paid off</span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums text-white">{formatMoney(active)}</span>
        <span className="text-xs text-zinc-400">still owed</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-credit transition-all" style={{ width: `${paidPct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-zinc-400">
        {next ? (
          <>
            {next.name} clears next, {formatDateShort(next.targetPayoffDate as string)}
          </>
        ) : (
          'Everything is paid off.'
        )}
      </p>

      <div className="mt-3 border-t border-white/[0.06] pt-2">
        <SectionLink href="/loans">Open Loans</SectionLink>
      </div>
    </div>
  );
}
