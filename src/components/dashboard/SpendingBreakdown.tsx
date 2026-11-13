'use client';

import React from 'react';
import Link from 'next/link';
import { SpendingCategorySummary } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { ChevronRight, PieChart } from 'lucide-react';

interface SpendingBreakdownProps {
  categories: SpendingCategorySummary[];
}

export function SpendingBreakdown({ categories }: SpendingBreakdownProps) {
  const totalOutflow = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div>
      {/* Categories Outflow Distribution */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-white flex items-center gap-2">
              <PieChart className="h-4 w-4 text-amber-500" />
              Where the money goes
            </h3>
            <p className="text-xs tabular-nums text-zinc-400 mt-0.5">
              Everything recorded in the sheet, by category
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs tabular-nums text-zinc-400 block">Total spent</span>
            <span className="tabular-nums text-base font-bold text-white">
              {formatINR(totalOutflow)}
            </span>
          </div>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="h-2.5 w-full rounded-full bg-[#18181B] border border-white/[0.07] flex overflow-hidden">
          {categories.map((c) => (
            <div
              key={c.category}
              style={{
                width: `${c.percentage}%`,
                backgroundColor: c.color,
              }}
              className="h-full transition-all hover:opacity-80"
              title={`${c.category}: ${c.percentage}% (${formatINR(c.amount)})`}
            />
          ))}
        </div>

        {/* Category List: each one opens the Ledger filtered to its transactions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {categories.map((c) => (
            <Link
              key={c.category}
              href={`/expenses?category=${encodeURIComponent(c.category)}`}
              aria-label={`See the ${c.count} ${c.category} transactions in the Ledger`}
              className="flex min-h-11 items-center justify-between gap-2 p-3 rounded-xl border border-white/[0.07] bg-[#18181B] hover:border-amber-500/30 hover:bg-[#1c1c1f] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-3 w-3 rounded-md shrink-0 shadow-xs"
                  style={{ backgroundColor: c.color }}
                />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-white block truncate">
                    {c.category}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-400">
                    {c.count} transactions
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="text-right">
                  <span className="tabular-nums text-xs font-bold text-white block">
                    {formatINR(c.amount)}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-400">
                    {c.percentage}% of total
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
