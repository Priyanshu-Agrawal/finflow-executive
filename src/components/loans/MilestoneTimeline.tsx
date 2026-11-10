'use client';

import React from 'react';
import { Flag, Sparkles, Zap } from 'lucide-react';

export function MilestoneTimeline() {
  const milestones = [
    {
      id: 'm1',
      date: '5 March 2027',
      title: 'BCA Education Loan Cleared',
      description: 'Final installment of ₹3,000 cleared in the 6-month cycle.',
      impact: 'Frees +₹3,000/mo cash flow',
      status: 'pending',
    },
    {
      id: 'm2',
      date: '2 August 2027',
      title: 'Royal Enfield Meteor Cleared',
      description: 'Principal amortizes to ₹0 after 13+ monthly ₹11,771 payments.',
      impact: 'Frees +₹11,771/mo cash flow',
      status: 'pending',
    },
    {
      id: 'm3',
      date: 'August 2027+',
      title: '100% Total Debt-Free Status',
      description: 'All 7 historical liabilities transitioned to zero balance.',
      impact: '+₹14,771/mo Total Wealth Capacity',
      status: 'ultimate',
    },
  ];

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-[#121214] p-5 sm:p-7 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/[0.06]">
        <div>
          <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
            <Flag className="h-4 w-4 text-amber-400" />
            <span>Automated Loan Payoff Milestones & Deleveraging Trajectory</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Chronological roadmap tracking the exact liquidation date for all remaining liabilities
          </p>
        </div>
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-mono font-semibold text-amber-400 border border-amber-500/20 flex items-center gap-1.5 self-start sm:self-auto">
          <Sparkles className="h-3.5 w-3.5" />
          Zero Debt by August 2027
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {milestones.map((m, idx) => (
          <div
            key={m.id}
            className="rounded-2xl border border-white/[0.07] bg-[#18181B] p-5 flex flex-col justify-between hover:border-white/[0.15] transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 text-xs font-mono font-bold text-zinc-200">
                  {m.date}
                </span>
                <span className="text-xs font-mono text-zinc-500">Milestone {idx + 1}</span>
              </div>

              <h4 className="text-sm font-semibold text-white">
                {m.title}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {m.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
                <Zap className="h-3.5 w-3.5" />
                <span>{m.impact}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
