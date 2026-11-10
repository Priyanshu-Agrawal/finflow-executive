'use client';

import React, { useState } from 'react';
import { BudgetPacing } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Lightbulb,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

interface ModernBudgetPacingProps {
  pacing: BudgetPacing;
  onUpdateGeneralBudget: (val: number) => void;
  onUpdateElectricityBudget: (val: number) => void;
  onOpenQuickLog?: () => void;
}

export function ModernBudgetPacing({
  pacing,
  onUpdateGeneralBudget,
  onUpdateElectricityBudget,
  onOpenQuickLog,
}: ModernBudgetPacingProps) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [tempGeneral, setTempGeneral] = useState(pacing.generalBudget);
  const [tempElec, setTempElec] = useState(pacing.electricityBudget);
  const [showTxList, setShowTxList] = useState(false);

  const handleApply = () => {
    onUpdateGeneralBudget(tempGeneral);
    onUpdateElectricityBudget(tempElec);
    setIsConfiguring(false);
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#131722]/90 via-[#0e111a]/95 to-[#0a0c12] p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              Monthly Budget Burn Engine
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {pacing.monthName} • Day {pacing.currentDay} of {pacing.totalDaysInMonth}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-amber-400" />
            Daily Allowance & Budget Pacing
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deducts everyday general expenses and power recharges, calculating per-day safe spend alongside your liquid reserves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-white/[0.08] bg-black/40 px-3 py-1.5 text-xs font-mono text-slate-300 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>
              <strong className="text-white">{pacing.remainingDays}</strong> days left in month
            </span>
          </div>

          <button
            onClick={() => setIsConfiguring(!isConfiguring)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{isConfiguring ? 'Close' : 'Set Limits'}</span>
          </button>
        </div>
      </div>

      {/* Inline Configurator */}
      {isConfiguring && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">Adjust Monthly Targets</span>
            <span className="text-[11px] text-slate-400">Recalculates per-day allowance instantly</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                General Expenses Target (₹)
              </label>
              <input
                type="number"
                value={tempGeneral}
                onChange={(e) => setTempGeneral(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-amber-500 focus:outline-none"
              />
              <div className="flex gap-1.5 mt-2">
                {[10000, 12000, 15000, 20000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempGeneral(b)}
                    className="rounded-lg bg-slate-800 px-2.5 py-1 text-[10px] text-slate-300 hover:text-white"
                  >
                    ₹{(b / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Electricity Budget Target (₹)
              </label>
              <input
                type="number"
                value={tempElec}
                onChange={(e) => setTempElec(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-amber-500 focus:outline-none"
              />
              <div className="flex gap-1.5 mt-2">
                {[2000, 2400, 3000, 3200].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempElec(b)}
                    className="rounded-lg bg-slate-800 px-2.5 py-1 text-[10px] text-slate-300 hover:text-white"
                  >
                    ₹{b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/20">
            <button
              onClick={() => setIsConfiguring(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              Apply Limits
            </button>
          </div>
        </div>
      )}

      {/* The 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: General Expenses Budget */}
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-950/20 via-black/40 to-black/60 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <ShoppingBag className="h-4 w-4" />
                General Budget
              </span>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20 font-mono">
                {formatINR(pacing.generalBudget)} / mo
              </span>
            </div>

            {/* Daily Burn Rate Card */}
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/30 mb-3">
              <span className="text-[11px] text-amber-300/90 font-medium block">
                Remaining Safe Daily Burn:
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-mono text-3xl font-extrabold text-amber-400">
                  {formatINR(pacing.generalPerDayLimit)}
                </span>
                <span className="text-xs font-bold text-amber-300">/ day</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                For the next {pacing.remainingDays} days until month-end
              </span>
            </div>

            {/* Spent vs Remaining breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Deducted So Far:</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatINR(pacing.generalSpentSoFar)} ({pacing.generalSpentPercent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Remaining Pool:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatINR(pacing.generalRemaining)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    pacing.generalSpentPercent > 80
                      ? 'bg-rose-500'
                      : pacing.generalSpentPercent > 50
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, pacing.generalSpentPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {pacing.generalExpensesList.length} recorded ad-hocs
            </span>
            <button
              onClick={() => setShowTxList(!showTxList)}
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              {showTxList ? 'Hide entries' : 'View entries'}
            </button>
          </div>
        </div>

        {/* Pillar 2: Electricity & Power Recharge */}
        <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-b from-blue-950/20 via-black/40 to-black/60 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Lightbulb className="h-4 w-4" />
                Electricity Budget
              </span>
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/20 font-mono">
                {formatINR(pacing.electricityBudget)} / mo
              </span>
            </div>

            {/* Daily Power Allowance Card */}
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/30 mb-3">
              <span className="text-[11px] text-blue-300/90 font-medium block">
                Daily Power Allowance:
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-mono text-3xl font-extrabold text-blue-400">
                  {formatINR(pacing.electricityPerDayLimit)}
                </span>
                <span className="text-xs font-bold text-blue-300">/ day</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Meter recharge pacing model
              </span>
            </div>

            {/* Recharges vs Buffer breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Recharges Done:</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatINR(pacing.electricitySpentSoFar)} ({pacing.electricitySpentPercent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Remaining Buffer:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatINR(pacing.electricityRemaining)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    pacing.electricitySpentPercent > 80 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, pacing.electricitySpentPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span>{pacing.electricityList.length} recharge events</span>
            <span className="text-blue-400 font-semibold">Meter Monitored</span>
          </div>
        </div>

        {/* Pillar 3: Available Balance 3rd Factor */}
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/20 via-black/40 to-black/60 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                Available Balance Factor
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">
                Liquid Reserves
              </span>
            </div>

            {/* Total Safe Daily Spend Card */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 mb-3">
              <span className="text-[11px] text-emerald-300/90 font-medium block">
                Safe Total Daily Burn:
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-mono text-3xl font-extrabold text-emerald-400">
                  {formatINR(pacing.safeTotalDailyBurn)}
                </span>
                <span className="text-xs font-bold text-emerald-300">/ day</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Spend without eroding savings cushion
              </span>
            </div>

            {/* Buffer stats */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Primary Bank Available:</span>
                <span className="font-mono font-bold text-white">
                  {formatINR(pacing.availableBalance)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Post-Nov 15 Net Cushion:</span>
                <span className="font-mono font-bold text-blue-400">
                  {formatINR(pacing.postFixedObligationsBuffer)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>General Allowance Share:</span>
                <span className="font-mono font-semibold text-slate-300">
                  {Math.round((pacing.generalPerDayLimit / pacing.safeTotalDailyBurn) * 100)}% of daily burn
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Capital Safety Secured
            </span>
            <span className="text-slate-500 font-mono">Row 239</span>
          </div>
        </div>
      </div>

      {/* Expandable November General Expenses Entries */}
      {showTxList && (
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-black/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              November General Expenses (Deducted from ₹15k Target)
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              Total: {formatINR(pacing.generalSpentSoFar)}
            </span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {pacing.generalExpensesList.map((tx) => (
              <div
                key={tx.rowIndex}
                className="py-2.5 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">#{tx.rowIndex}</span>
                  <span className="text-slate-400">{formatDisplayDate(tx.date)}</span>
                  <span className="font-sans font-medium text-white">{tx.description}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-rose-400">-{formatINR(tx.amount)}</span>
                  <span className="text-slate-500 text-[11px]">Bal: {formatINR(tx.balance)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
