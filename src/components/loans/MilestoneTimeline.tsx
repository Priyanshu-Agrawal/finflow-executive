'use client';

import React from 'react';
import { Award, CheckCircle2, Flag, Sparkles, TrendingUp, Zap } from 'lucide-react';

export function MilestoneTimeline() {
  const milestones = [
    {
      id: 'm1',
      date: '5 March 2027',
      title: 'BCA Education Loan Cleared',
      description: 'Final installment of ₹3,000 cleared in the 6-month cycle.',
      impact: 'Frees +₹3,000/mo cash flow',
      color: 'from-blue-500 to-indigo-600',
      badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
      status: 'pending',
    },
    {
      id: 'm2',
      date: '2 August 2027',
      title: 'Royal Enfield Meteor Cleared',
      description: 'Principal amortizes to ₹0 after 13+ monthly ₹11,771 payments.',
      impact: 'Frees +₹11,771/mo cash flow',
      color: 'from-indigo-500 to-purple-600',
      badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
      status: 'pending',
    },
    {
      id: 'm3',
      date: 'August 2027+',
      title: '100% Total Debt-Free Status',
      description: 'All 7 historical liabilities transitioned to zero balance.',
      impact: '+₹14,771/mo Total Wealth-Building Capacity',
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      status: 'ultimate',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flag className="h-4 w-4 text-emerald-400" />
            Automated Loan Payoff Milestones & Deleveraging Trajectory
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Chronological roadmap tracking the exact liquidation date for all remaining liabilities
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Zero Debt in August 2027
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
        {milestones.map((m, idx) => (
          <div
            key={m.id}
            className="relative rounded-2xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col justify-between hover:border-slate-700 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${m.badgeColor}`}>
                  {m.date}
                </span>
                <span className="text-xs font-mono text-slate-500">Milestone {idx + 1}</span>
              </div>

              <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                {m.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {m.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
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
