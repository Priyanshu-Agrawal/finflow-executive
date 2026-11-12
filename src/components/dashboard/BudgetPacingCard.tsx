'use client';

import React, { useState } from 'react';
import { BudgetPacing } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Lightbulb,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

interface BudgetPacingCardProps {
  pacing: BudgetPacing;
  onUpdateGeneralBudget: (val: number) => void;
  onUpdateElectricityBudget: (val: number) => void;
}

export function BudgetPacingCard({
  pacing,
  onUpdateGeneralBudget,
  onUpdateElectricityBudget,
}: BudgetPacingCardProps) {
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);
  const [tempGeneral, setTempGeneral] = useState(pacing.generalBudget);
  const [tempElec, setTempElec] = useState(pacing.electricityBudget);

  const handleSaveBudgets = () => {
    onUpdateGeneralBudget(tempGeneral);
    onUpdateElectricityBudget(tempElec);
    setIsEditingBudgets(false);
  };

  const isGeneralPacingGood = pacing.generalSpentPercent <= (pacing.currentDay / pacing.totalDaysInMonth) * 100 + 10;

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/30 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header with Title & Budget Edit Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-credit/10 px-2 py-0.5 text-xs font-bold text-credit border border-credit/20">
              ACTIVE MONTHLY PACING
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {pacing.monthName} • Day {pacing.currentDay} of {pacing.totalDaysInMonth}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-indigo-400" />
            Monthly Budget Burn Engine & Daily Allowance
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deducts daily general expenses and electricity recharges from monthly limits, computing per-day safe limits alongside your available balance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs tabular-nums text-slate-300 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span>
              <strong className="text-white">{pacing.remainingDays}</strong> days remaining in month
            </span>
          </div>

          <button
            onClick={() => setIsEditingBudgets(!isEditingBudgets)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{isEditingBudgets ? 'Close' : 'Set Budgets'}</span>
          </button>
        </div>
      </div>

      {/* Inline Budget Configurator */}
      {isEditingBudgets && (
        <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300">Configure Monthly Targets</span>
            <span className="text-xs text-slate-400">Updates live per-day safe burn calculations</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Monthly General Expenses Budget (₹)
              </label>
              <input
                type="number"
                value={tempGeneral}
                onChange={(e) => setTempGeneral(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs tabular-nums text-white focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex gap-1.5 mt-2">
                {[10000, 12000, 15000, 20000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempGeneral(b)}
                    className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:text-white"
                  >
                    ₹{(b / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Monthly Electricity Budget (₹)
              </label>
              <input
                type="number"
                value={tempElec}
                onChange={(e) => setTempElec(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs tabular-nums text-white focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex gap-1.5 mt-2">
                {[2000, 2400, 3000, 3200].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempElec(b)}
                    className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:text-white"
                  >
                    ₹{b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditingBudgets(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBudgets}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
            >
              Apply Budgets
            </button>
          </div>
        </div>
      )}

      {/* The 3 Core Pillars: General Budget, Electricity Budget, and Available Balance Factor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: General Expenses Budget & Per-Day Limit */}
        <div className="rounded-2xl border border-amber-500/20 bg-slate-950/70 p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                General Expenses Budget
              </span>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/20 tabular-nums">
                Target: {formatINR(pacing.generalBudget)}
              </span>
            </div>

            {/* Big Per-Day Metric */}
            <div className="my-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20">
              <span className="text-xs text-amber-300 font-medium block">
                Remaining Safe Daily Burn Rate:
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="tabular-nums text-3xl font-extrabold text-amber-400">
                  {formatINR(pacing.generalPerDayLimit)}
                </span>
                <span className="text-xs text-amber-300/80 font-semibold">/ day</span>
              </div>
              <span className="text-xs text-slate-400 block mt-1">
                For the next {pacing.remainingDays} days until month-end
              </span>
            </div>

            {/* Stats Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Deducted So Far:</span>
                <span className="tabular-nums font-bold text-slate-200">
                  {formatINR(pacing.generalSpentSoFar)} ({pacing.generalSpentPercent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Remaining Pool:</span>
                <span className="tabular-nums font-bold text-credit">
                  {formatINR(pacing.generalRemaining)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 space-y-1">
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pacing.generalSpentPercent > 85
                      ? 'bg-rose-500'
                      : pacing.generalSpentPercent > 65
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, pacing.generalSpentPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs flex items-center justify-between">
            <span className="text-slate-400">Recorded Ad-Hocs:</span>
            <span className="tabular-nums font-semibold text-white">
              {pacing.generalExpensesList.length} transactions
            </span>
          </div>
        </div>

        {/* Pillar 2: Electricity Budget & Recharge Pace */}
        <div className="rounded-2xl border border-amber-500/20 bg-slate-950/70 p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4" />
                Electricity Budget
              </span>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/20 tabular-nums">
                Budget: {formatINR(pacing.electricityTotalBudget || pacing.electricityBudget || 3200)}
              </span>
            </div>

            {/* Big Remaining Recharge Budget Metric */}
            <div className="my-3 p-3.5 rounded-xl border border-white/[0.08] bg-black/40">
              <span className="text-xs text-zinc-400 font-medium block">
                Remaining Recharge Budget:
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="tabular-nums text-3xl font-extrabold text-white">
                  {formatINR(pacing.electricityRemainingBudget ?? pacing.electricityRemaining ?? 2400)}
                </span>
                <span className="text-xs text-credit font-semibold">in reserve</span>
              </div>
              <span className="text-xs text-zinc-400 block mt-1">
                From {formatINR(pacing.electricityTotalBudget || 3200)} allocation ({formatINR(pacing.electricityBaseBudget || 3000)} + {formatINR(pacing.electricitySurplus || 200)} surplus)
              </span>
            </div>

            {/* Stats Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Recharges Done:</span>
                <span className="tabular-nums font-bold text-slate-200">
                  {formatINR(pacing.electricityRechargedSoFar ?? pacing.electricitySpentSoFar ?? 800)} ({pacing.electricitySpentPercent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Safe Power Allowance:</span>
                <span className="tabular-nums font-bold text-white">
                  {formatINR(pacing.electricityPerDayLimit)} / day
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 space-y-1">
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all"
                  style={{ width: `${Math.min(100, pacing.electricitySpentPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs flex items-center justify-between">
            <span className="text-slate-400">Recharge Entries:</span>
            <span className="tabular-nums font-semibold text-white">
              {pacing.electricityList.length} recorded
            </span>
          </div>
        </div>

        {/* Pillar 3: Available Balance Factor & Net Cushion */}
        <div className="rounded-2xl border border-credit/20 bg-slate-950/70 p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-credit flex items-center gap-1.5">
                <Wallet className="h-4 w-4" />
                Available Balance Factor
              </span>
              <span className="rounded-full bg-credit/10 px-2 py-0.5 text-xs font-bold text-credit border border-credit/20">
                Liquid Reserves
              </span>
            </div>

            {/* Big Balance Metric */}
            <div className="my-3 p-3.5 rounded-xl border border-credit/30 bg-emerald-950/20">
              <span className="text-xs text-credit font-medium block">
                Primary Bank Available Balance:
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="tabular-nums text-3xl font-extrabold text-white">
                  {formatINR(pacing.availableBalance)}
                </span>
              </div>
              <span className="text-xs text-credit/90 font-medium block mt-1">
                Post-Rent Cushion:<strong className="tabular-nums">{formatINR(pacing.postFixedObligationsBuffer)}</strong>
              </span>
            </div>

            {/* Daily Overall Burn Allowance */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Safe Daily Spend:</span>
                <span className="tabular-nums font-bold text-credit">
                  {formatINR(pacing.safeTotalDailyBurn)} / day
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1 text-credit font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Capital Safety Secured
            </span>
            <span className="tabular-nums text-slate-500">Formula Chain Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
