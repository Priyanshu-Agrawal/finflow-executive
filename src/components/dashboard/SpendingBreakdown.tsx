'use client';

import React from 'react';
import { SpendingCategorySummary } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { AlertCircle, PieChart, ShieldAlert, Sparkles, TrendingDown } from 'lucide-react';

interface SpendingBreakdownProps {
  categories: SpendingCategorySummary[];
}

export function SpendingBreakdown({ categories }: SpendingBreakdownProps) {
  const totalOutflow = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Categories Outflow Distribution */}
      <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-400" />
              Outflow Distribution & Structural Allocations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cumulative lifetime category breakdown across all recorded transactions
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Total Outflow</span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {formatINR(totalOutflow)}
            </span>
          </div>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="h-3 w-full rounded-full bg-slate-800 flex overflow-hidden mb-6">
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

        {/* Category List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((c) => (
            <div
              key={c.category}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-md shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    {c.category}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {c.count} transactions recorded
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-slate-200 block">
                  {formatINR(c.amount)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {c.percentage}% of outflows
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spending Leaks & Intelligence Insights */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">Discretionary Leaks & Audit</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automated intelligence audit identifying micro-transactions, subscription friction, and recurring capital drains.
          </p>

          <div className="mt-4 space-y-3">
            {/* Leak 1 */}
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-950/20 text-xs">
              <div className="flex items-center justify-between text-amber-400 font-semibold mb-1">
                <span>General Ad-Hoc Outlays</span>
                <span className="font-mono">~₹5,47,061</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Represents 36.0% of lifetime outflows via daily ₹500–₹2,500 unbudgeted expenses.
              </p>
            </div>

            {/* Leak 2 */}
            <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-950/20 text-xs">
              <div className="flex items-center justify-between text-indigo-400 font-semibold mb-1">
                <span>Subscriptions & Tech</span>
                <span className="font-mono">₹3,000/mo</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Cursor AI & developer tooling compounded annually to ₹36,000/yr.
              </p>
            </div>

            {/* Optimization Opportunity */}
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Post-Debt Surplus Capacity
                </span>
                <span className="font-mono">+₹45,000/mo</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Retiring BCA (Mar &apos;27) and Bike (Aug &apos;27) frees ₹14,771/mo to compound into investments.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Non-destructive pattern synthesis</span>
          <span className="text-indigo-400 font-medium">Dashboard Engine Active</span>
        </div>
      </div>
    </div>
  );
}
