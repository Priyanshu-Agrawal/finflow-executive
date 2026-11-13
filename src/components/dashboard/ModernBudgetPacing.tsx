'use client';

import React, { useState } from 'react';
import { BudgetPacing } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Gauge,
  Home,
  Lightbulb,
  Plus,
  ShieldCheck,
  Sliders,
  Wallet,
  Zap,
} from 'lucide-react';

interface ModernBudgetPacingProps {
  pacing: BudgetPacing;
  onUpdateGeneralBudget: (val: number) => void;
  onUpdateElectricityBudget: (val: number) => void;
  onUpdateBudgetRecurringDay?: (val: number) => void;
  onUpdateRentRecurringDay?: (val: number) => void;
  onUpdateRentAmount?: (val: number) => void;
  onUpdateElectricityRemaining?: (val: number) => void;
  onOpenQuickLog?: () => void;
}

export function ModernBudgetPacing({
  pacing,
  onUpdateGeneralBudget,
  onUpdateElectricityBudget,
  onUpdateBudgetRecurringDay,
  onUpdateRentRecurringDay,
  onUpdateRentAmount,
  onUpdateElectricityRemaining,
  onOpenQuickLog,
}: ModernBudgetPacingProps) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [tempGeneral, setTempGeneral] = useState(pacing.generalBudget);
  const [tempElecBudget, setTempElecBudget] = useState(pacing.electricityTotalBudget || pacing.electricityBudget || 3200);
  const [tempResetDay, setTempResetDay] = useState(pacing.budgetRecurringDay || 7);
  const [tempRentDay, setTempRentDay] = useState(pacing.rentRecurringDay || 15);
  const [tempRentAmt, setTempRentAmt] = useState(pacing.rentAmount || 15000);

  const [showTxList, setShowTxList] = useState(false);
  // Hard month: shows the worst-case ceiling (budget + this cycle's projected saving)
  // instead of the normal budget-only figure. Off on every load.
  const [hardMonth, setHardMonth] = useState(false);

  const handleApply = () => {
    onUpdateGeneralBudget(tempGeneral);
    onUpdateElectricityBudget(tempElecBudget);
    if (onUpdateBudgetRecurringDay) onUpdateBudgetRecurringDay(tempResetDay);
    if (onUpdateRentRecurringDay) onUpdateRentRecurringDay(tempRentDay);
    if (onUpdateRentAmount) onUpdateRentAmount(tempRentAmt);
    setIsConfiguring(false);
  };

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-[#121214] p-5 sm:p-7 shadow-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs tabular-nums font-medium text-zinc-300 border border-white/[0.06]">
              Cycle: {pacing.cycleLabel || `${pacing.budgetRecurringDay}th reset`}
            </span>
            <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs tabular-nums font-medium text-zinc-300 border border-white/[0.06]">
              Rent on {pacing.rentRecurringDay}th ({pacing.daysUntilRent}d left)
            </span>
          </div>
          <h2 className="text-lg tabular-nums font-bold text-white tracking-tight mt-1.5 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-amber-400" />
            <span>Budget this cycle</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Budget recurring on <strong className="text-zinc-200">{pacing.budgetRecurringDay}th</strong> • Rent recurring on <strong className="text-zinc-200">{pacing.rentRecurringDay}th</strong> • Remaining electricity balance factor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs tabular-nums text-zinc-400 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>{pacing.daysRemainingInCycle} days left in cycle</span>
          </div>

          <button
            onClick={() => setIsConfiguring(!isConfiguring)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.07] hover:border-white/[0.15] transition-all"
          >
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <span>{isConfiguring ? 'Close Settings' : 'Configure Dates & Meter'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Configuration Drawer (Clean Unified Styling) */}
      {isConfiguring && (
        <div className="rounded-2xl border border-amber-500/30 bg-[#18181B] p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <h3 className="text-xs tabular-nums font-bold text-zinc-200">
                Recurring Cycles & Balance Configuration
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Custom dates and meter balances are saved automatically to your device.
              </p>
            </div>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs tabular-nums font-semibold text-amber-400 border border-amber-500/20">
              Live Recalculation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* 1. General Expenses Recurring Reset Day */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 space-y-2">
              <label className="text-zinc-300 font-semibold block">
                General Expenses Recurring Date
              </label>
              <div className="flex gap-1.5">
                {[6, 7].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setTempResetDay(day)}
                    className={`flex-1 py-1.5 rounded-lg text-xs tabular-nums font-bold transition-all ${
                      tempResetDay === day
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    {day}th of Month
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-zinc-400">Custom Day:</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={tempResetDay}
                  onChange={(e) => setTempResetDay(Number(e.target.value))}
                  className="w-20 rounded-lg border border-white/[0.1] bg-black/60 px-2 py-1 text-xs tabular-nums text-white text-right focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 2. Room Rent Recurring Due Day & Amount */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 space-y-2">
              <label className="text-zinc-300 font-semibold block">
                Room Rent Recurring Date
              </label>
              <div className="flex gap-1.5">
                {[15, 1, 5, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTempRentDay(d)}
                    className={`flex-1 py-1 rounded-lg text-xs tabular-nums font-bold transition-all ${
                      tempRentDay === d
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    {d}th
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-zinc-400">Rent Amount (₹):</span>
                <input
                  type="number"
                  value={tempRentAmt}
                  onChange={(e) => setTempRentAmt(Number(e.target.value))}
                  className="w-28 rounded-lg border border-white/[0.1] bg-black/60 px-2 py-1 text-xs tabular-nums text-white text-right focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 3. Total Electricity Budget */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 space-y-2">
              <label className="text-zinc-300 font-semibold block">
                Total Electricity Budget (₹)
              </label>
              <input
                type="number"
                step="1"
                value={tempElecBudget}
                onChange={(e) => setTempElecBudget(Number(e.target.value))}
                placeholder="3200"
                className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3 py-1.5 text-xs tabular-nums font-bold text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-1.5 pt-1">
                {[3000, 3200, 3500].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempElecBudget(b)}
                    className="flex-1 rounded-lg bg-white/[0.04] py-1 text-xs tabular-nums text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                  >
                    ₹{b}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. General Expenses Monthly Target */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 space-y-2">
              <label className="text-zinc-300 font-semibold block">
                General Expenses Budget (₹)
              </label>
              <input
                type="number"
                value={tempGeneral}
                onChange={(e) => setTempGeneral(Number(e.target.value))}
                className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3 py-1.5 text-xs tabular-nums text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-1.5 pt-1">
                {[10000, 12000, 15000, 18000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempGeneral(b)}
                    className="flex-1 rounded-lg bg-white/[0.04] py-1 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                  >
                    ₹{(b / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Electricity Monthly Target */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 space-y-2">
              <label className="text-zinc-300 font-semibold block">
                Electricity Total Target (₹)
              </label>
              <input
                type="number"
                value={tempElecBudget}
                onChange={(e) => setTempElecBudget(Number(e.target.value))}
                className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3 py-1.5 text-xs tabular-nums text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-1.5 pt-1">
                {[2000, 2400, 3000, 3200].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempElecBudget(b)}
                    className="flex-1 rounded-lg bg-white/[0.04] py-1 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                  >
                    ₹{b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => setIsConfiguring(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm transition-all"
            >
              Apply & Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Three cards: what you can spend, electricity, rent. One number lives in one place. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Factor 1: General Discretionary Expenses */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#18181B] p-4 sm:p-5 flex flex-col justify-between hover:border-white/[0.14] transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tabular-nums font-semibold text-zinc-300 flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-amber-400" />
                General Budget ({pacing.budgetRecurringDay}th)
              </span>
              <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs font-bold text-zinc-300 border border-white/[0.06] tabular-nums">
                {formatINR(pacing.generalBudget)}
              </span>
            </div>

            {/* Safe daily spend (the one place it is shown), with the Hard month switch */}
            <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40 mb-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400 font-medium">
                  {hardMonth ? 'Hard month ceiling' : 'Safe daily spend'}
                </span>
                <button
                  type="button"
                  onClick={() => setHardMonth((v) => !v)}
                  aria-pressed={hardMonth}
                  className={`min-h-11 sm:min-h-0 rounded-md px-3 sm:px-2 py-0.5 text-xs tabular-nums font-semibold border transition-colors ${
                    hardMonth
                      ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                      : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
                  }`}
                >
                  {hardMonth ? 'Hard month: on' : 'Hard month'}
                </button>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`tabular-nums text-3xl font-bold ${hardMonth ? 'text-orange-300' : 'text-white'}`}>
                  {formatINR(hardMonth ? pacing.worstCaseDailyBurn : pacing.generalPerDayLimit)}
                </span>
                <span className="text-xs tabular-nums text-zinc-400">/ day</span>
              </div>
              <span className="text-xs text-zinc-500 block mt-1">
                {hardMonth
                  ? pacing.projectedCycleSavings <= 0
                    ? `No extra room this cycle: projected saving is ${formatINR(pacing.projectedCycleSavings)}, so the ceiling is the normal budget.`
                    : `Most you can spend without touching savings: budget left + this cycle's projected saving (${formatINR(pacing.projectedCycleSavings)}). Normal: ${formatINR(pacing.generalPerDayLimit)}/day.`
                  : `From the budget only, never from savings, for the remaining ${pacing.daysRemainingInCycle} days`}
              </span>
            </div>

            {/* Spent vs Remaining breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Spent since the {pacing.budgetRecurringDay}th</span>
                <span className="tabular-nums font-bold text-zinc-200">
                  {formatINR(pacing.generalSpentSoFar)} ({pacing.generalSpentPercent}%)
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Left in the budget</span>
                <span className="tabular-nums font-bold text-white">
                  {formatINR(pacing.generalRemaining)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, pacing.generalSpentPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span>{pacing.generalExpensesList.length} spends this cycle</span>
            <button
              onClick={() => setShowTxList(!showTxList)}
              className="min-h-11 sm:min-h-0 px-2 text-amber-400 hover:text-amber-300 font-semibold"
            >
              {showTxList ? 'Hide entries' : 'View entries'}
            </button>
          </div>
        </div>

        {/* Factor 2: Electricity Budget (Cycle Allocation & Recharge Tracking) */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#18181B] p-4 sm:p-5 flex flex-col justify-between hover:border-white/[0.14] transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tabular-nums font-semibold text-zinc-300 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-400" />
                Electricity Budget
              </span>
              <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs tabular-nums text-zinc-300 border border-white/[0.06]">
                Target: {formatINR(pacing.electricityTotalBudget || pacing.electricityBudget || 3200)}
              </span>
            </div>

            {/* Big Remaining Recharge Metric */}
            <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium block">
                  Remaining Recharge Budget:
                </span>
                <span className="text-xs tabular-nums text-zinc-400">
                  {formatINR(pacing.electricityTotalBudget || 3200)} pool ({formatINR(pacing.electricityBaseBudget || 3000)} + {formatINR(pacing.electricitySurplus || 200)} surplus)
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="tabular-nums text-3xl font-bold text-white">
                  {formatINR(pacing.electricityRemainingBudget ?? pacing.electricityRemaining ?? 2400)}
                </span>
                <span className="text-xs tabular-nums text-credit font-semibold">in reserve</span>
              </div>
              <span className="text-xs text-zinc-400 block mt-1.5 pt-1.5 border-t border-white/[0.04]">
                Available capital reserved to perform future meter recharges
              </span>
            </div>

            {/* Recharges vs Allowance breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Recharges Done:</span>
                <span className="tabular-nums font-bold text-zinc-200">
                  {formatINR(pacing.electricityRechargedSoFar ?? pacing.electricitySpentSoFar ?? 800)} ({pacing.electricitySpentPercent}%)
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Safe Power Allowance:</span>
                <span className="tabular-nums font-bold text-white">
                  {formatINR(pacing.electricityPerDayLimit)} / day
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, pacing.electricitySpentPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span>{pacing.electricityList.length} recharge events</span>
            {onOpenQuickLog && (
              <button
                onClick={onOpenQuickLog}
                className="min-h-11 sm:min-h-0 px-2 text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>+ Recharge</span>
              </button>
            )}
          </div>
        </div>

        {/* Factor 3: Rent Recurring Milestone */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#18181B] p-4 sm:p-5 flex flex-col justify-between hover:border-white/[0.14] transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tabular-nums font-semibold text-zinc-300 flex items-center gap-1.5">
                <Home className="h-4 w-4 text-amber-400" />
                Room Rent ({pacing.rentRecurringDay}th)
              </span>
              <button
                onClick={() => setIsConfiguring(true)}
                className="min-h-11 sm:min-h-0 rounded-md bg-white/[0.04] px-3 sm:px-2 py-0.5 text-xs font-bold text-zinc-300 border border-white/[0.06] tabular-nums hover:bg-white/[0.08] transition-colors"
                title="Configure rent recurring date & amount"
              >
                Set Date
              </button>
            </div>

            {/* Rent Countdown Card */}
            <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40 mb-3">
              <span className="text-xs text-zinc-400 font-medium block">
                Rent
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="tabular-nums text-3xl font-bold text-white">
                  {formatINR(pacing.rentAmount)}
                </span>
                <span className="text-xs tabular-nums text-zinc-400">/ mo</span>
              </div>
              <span className="text-xs text-zinc-500 block mt-1">
                Clears on the {pacing.rentRecurringDay}th ({pacing.daysUntilRent} days remaining)
              </span>
            </div>

            {/* Rent buffer breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Due date</span>
                <span className="tabular-nums font-bold text-zinc-200">
                  {formatDisplayDate(pacing.nextRentDate)}
                </span>
              </div>
              <div className="flex justify-between gap-2 text-zinc-400">
                <span>After rent and every bill (cycle cushion on Home)</span>
                <span className={`font-semibold ${pacing.postRentBuffer < 0 ? 'text-orange-400' : 'text-credit'}`}>
                  {pacing.postRentBuffer < 0 ? 'Short' : 'Covered'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 tabular-nums">
            <span>Every month on the {pacing.rentRecurringDay}th</span>
          </div>
        </div>
      </div>

      {/* Expandable Active Cycle General Expenses Entries */}
      {showTxList && (
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-black/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              Cycle Expenses ({pacing.cycleLabel || `${pacing.budgetRecurringDay}th reset`}) Deducted from Target
            </span>
            <span className="text-xs tabular-nums font-bold text-amber-400">
              Total Spent: {formatINR(pacing.generalSpentSoFar)}
            </span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {pacing.generalExpensesList.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">
                No general ad-hoc expenses logged yet in this {pacing.budgetRecurringDay}th cycle!
              </p>
            ) : (
              pacing.generalExpensesList.map((tx) => (
                <div
                  key={tx.rowIndex}
                  className="py-2.5 flex items-center justify-between text-xs tabular-nums"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">#{tx.rowIndex}</span>
                    <span className="text-zinc-400">{formatDisplayDate(tx.date)}</span>
                    <span className="font-sans font-medium text-white">{tx.description}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-zinc-200">-{formatINR(tx.amount)}</span>
                    <span className="text-zinc-500 text-xs">Bal: {formatINR(tx.balance)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
