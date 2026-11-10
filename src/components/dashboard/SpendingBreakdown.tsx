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
      <div className="lg:col-span-2 obsidian-card rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#161310] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-serif font-bold text-[#e9e1db] flex items-center gap-2">
              <PieChart className="h-4 w-4 text-[#f0a93c]" />
              Outflow Distribution & Structural Allocations
            </h3>
            <p className="text-xs font-mono text-[#9e8e7c] mt-0.5">
              Cumulative lifetime category breakdown across all recorded transactions
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-[#9e8e7c] block">Total Outflow</span>
            <span className="font-serif text-base font-bold text-[#e9e1db]">
              {formatINR(totalOutflow)}
            </span>
          </div>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="h-2.5 w-full rounded-full bg-[#110e0b] border border-[#514535]/20 flex overflow-hidden">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {categories.map((c) => (
            <div
              key={c.category}
              className="flex items-center justify-between p-3 rounded-xl border border-[#514535]/30 bg-[#1e1b18] hover:border-[#f0a93c]/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-md shrink-0 shadow-xs"
                  style={{ backgroundColor: c.color }}
                />
                <div>
                  <span className="text-xs font-semibold text-[#e9e1db] block">
                    {c.category}
                  </span>
                  <span className="text-[10px] font-mono text-[#9e8e7c]">
                    {c.count} transactions recorded
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-serif text-xs font-bold text-[#e9e1db] block">
                  {formatINR(c.amount)}
                </span>
                <span className="text-[10px] font-mono text-[#9e8e7c]">
                  {c.percentage}% of outflows
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spending Leaks & Intelligence Insights */}
      <div className="obsidian-card rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#161310] p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-[#f0a93c]" />
            <h3 className="text-base font-serif font-bold text-[#e9e1db]">Discretionary Leaks & Audit</h3>
          </div>
          <p className="text-xs text-[#9e8e7c] leading-relaxed">
            Automated intelligence audit identifying micro-transactions, subscription friction, and recurring capital drains.
          </p>

          <div className="mt-4 space-y-3">
            {/* Leak 1 */}
            <div className="p-3 rounded-xl border border-[#f0a93c]/30 bg-[#f0a93c]/10 text-xs">
              <div className="flex items-center justify-between text-[#ffc981] font-semibold mb-1">
                <span>General Ad-Hoc Outlays</span>
                <span className="font-serif font-bold">~₹5,47,061</span>
              </div>
              <p className="text-[#d6c4af] text-[11px] leading-relaxed">
                Represents 36.0% of lifetime outflows via daily ₹500–₹2,500 unbudgeted expenses.
              </p>
            </div>

            {/* Leak 2 */}
            <div className="p-3 rounded-xl border border-[#514535]/40 bg-[#1e1b18] text-xs">
              <div className="flex items-center justify-between text-[#d6c4af] font-semibold mb-1">
                <span>Subscriptions & Tech</span>
                <span className="font-serif font-bold text-[#e9e1db]">₹3,000/mo</span>
              </div>
              <p className="text-[#9e8e7c] text-[11px] leading-relaxed">
                Cursor AI & developer tooling compounded annually to ₹36,000/yr.
              </p>
            </div>

            {/* Optimization Opportunity */}
            <div className="p-3 rounded-xl border border-[#edbf70]/30 bg-[#edbf70]/10 text-xs">
              <div className="flex items-center justify-between text-[#edbf70] font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Post-Debt Surplus Capacity
                </span>
                <span className="font-serif font-bold">+₹45,000/mo</span>
              </div>
              <p className="text-[#d6c4af] text-[11px] leading-relaxed">
                Retiring BCA (Mar &apos;27) and Bike (Aug &apos;27) frees ₹14,771/mo to compound into investments.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#514535]/30 text-[11px] text-[#9e8e7c] flex items-center justify-between font-mono">
          <span>Non-destructive pattern synthesis</span>
          <span className="text-[#f0a93c] font-medium">Dashboard Engine Active</span>
        </div>
      </div>
    </div>
  );
}
