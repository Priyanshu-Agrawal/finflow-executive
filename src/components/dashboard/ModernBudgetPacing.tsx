'use client';

import React, { useState } from 'react';
import { BudgetPacing } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Flame,
  Gauge,
  Home,
  Lightbulb,
  Plus,
  RefreshCw,
  Save,
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
  const [tempElecBudget, setTempElecBudget] = useState(pacing.electricityBudget);
  const [tempResetDay, setTempResetDay] = useState(pacing.budgetRecurringDay || 6);
  const [tempRentDay, setTempRentDay] = useState(pacing.rentRecurringDay || 15);
  const [tempRentAmt, setTempRentAmt] = useState(pacing.rentAmount || 15000);
  const [tempElecRemaining, setTempElecRemaining] = useState(pacing.electricityRemaining || 2400);

  // Quick inline edit state for electricity balance
  const [isEditingMeter, setIsEditingMeter] = useState(false);
  const [inlineMeterValue, setInlineMeterValue] = useState<number | string>(pacing.electricityRemaining);
  const [meterSavedMsg, setMeterSavedMsg] = useState(false);

  const [showTxList, setShowTxList] = useState(false);

  const handleApply = () => {
    onUpdateGeneralBudget(tempGeneral);
    onUpdateElectricityBudget(tempElecBudget);
    if (onUpdateBudgetRecurringDay) onUpdateBudgetRecurringDay(tempResetDay);
    if (onUpdateRentRecurringDay) onUpdateRentRecurringDay(tempRentDay);
    if (onUpdateRentAmount) onUpdateRentAmount(tempRentAmt);
    if (onUpdateElectricityRemaining) onUpdateElectricityRemaining(tempElecRemaining);
    setIsConfiguring(false);
  };

  const handleSaveInlineMeter = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(inlineMeterValue);
    if (!isNaN(val) && onUpdateElectricityRemaining) {
      onUpdateElectricityRemaining(val);
      setTempElecRemaining(val);
      setIsEditingMeter(false);
      setMeterSavedMsg(true);
      setTimeout(() => setMeterSavedMsg(false), 2000);
    }
  };

  return (
    <div className="rounded-3xl border border-[rgba(246,239,227,0.08)] bg-gradient-to-b from-[#181411] via-[#14100D] to-[#100D0A] p-4 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[rgba(246,239,227,0.08)]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-md bg-[#F0A93C]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#F0A93C] border border-[#F0A93C]/30 uppercase tracking-wider">
              Budget Burn & Runway Engine
            </span>
            <span className="rounded-md bg-[#EDBF70]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#EDBF70] border border-[#EDBF70]/30">
              Cycle: {pacing.cycleLabel || `${pacing.budgetRecurringDay}th reset`}
            </span>
            <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <Home className="h-3 w-3" />
              Rent on {pacing.rentRecurringDay}th ({pacing.daysUntilRent}d left)
            </span>
          </div>
          <h2 className="text-lg font-serif font-bold text-[#F6EFE3] mt-1.5 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-[#F0A93C]" />
            Configurable Budget & Cycle Pacing
          </h2>
          <p className="text-xs text-[#A89F91] mt-0.5">
            Budget recurring on <strong className="text-[#F0A93C]">{pacing.budgetRecurringDay}th</strong> • Rent recurring on <strong className="text-rose-300">{pacing.rentRecurringDay}th</strong> • Remaining electricity balance factor.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="rounded-xl border border-[rgba(246,239,227,0.08)] bg-[#100D0A] px-3 py-1.5 text-xs font-mono text-[#A89F91] flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#F0A93C]" />
            <span>
              <strong className="text-[#F6EFE3]">{pacing.daysRemainingInCycle}</strong> days left in cycle
            </span>
          </div>

          <button
            onClick={() => setIsConfiguring(!isConfiguring)}
            className="flex items-center gap-1.5 rounded-xl border border-[rgba(246,239,227,0.1)] bg-[#1F1914] px-3 py-1.5 text-xs font-semibold text-[#E9E1DB] hover:bg-[#2B221A] transition-colors shadow-sm"
          >
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <span>{isConfiguring ? 'Close Settings' : 'Configure Dates & Meter'}</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Configurator Drawer */}
      {isConfiguring && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                Recurring Cycles & Balance Configuration
              </span>
              <span className="text-[11px] text-slate-400">
                Custom dates and meter balances are saved automatically to your device.
              </span>
            </div>
            <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30">
              Live Recalculation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* 1. General Budget Recurring Day */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3">
              <label className="text-slate-300 font-semibold block mb-1">
                General Expenses Recurring Date
              </label>
              <div className="flex gap-1.5 mb-2">
                {[6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTempResetDay(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tempResetDay === d
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-white/[0.05] text-slate-300 hover:text-white'
                    }`}
                  >
                    {d}th of Month
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Custom Day:</span>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={tempResetDay}
                  onChange={(e) => setTempResetDay(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 2. Room Rent Recurring Date & Amount */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3">
              <label className="text-slate-300 font-semibold block mb-1">
                Room Rent Recurring Date
              </label>
              <div className="flex gap-1.5 mb-2">
                {[15, 1, 5, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTempRentDay(d)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      tempRentDay === d
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-white/[0.05] text-slate-300 hover:text-white'
                    }`}
                  >
                    {d}th
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <span className="text-[11px] text-slate-400">Rent Amount (₹):</span>
                <input
                  type="number"
                  value={tempRentAmt}
                  onChange={(e) => setTempRentAmt(Number(e.target.value))}
                  className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-mono text-white text-right focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* 3. Remaining Electricity Balance (Live Meter) */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3">
              <label className="text-slate-300 font-semibold block mb-1">
                Remaining Electricity Balance (₹)
              </label>
              <input
                type="number"
                step="1"
                value={tempElecRemaining}
                onChange={(e) => setTempElecRemaining(Number(e.target.value))}
                placeholder="2400"
                className="w-full rounded-xl border border-blue-500/40 bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-400"
              />
              <div className="flex gap-1.5 mt-2">
                {[1500, 2000, 2400, 3000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempElecRemaining(b)}
                    className="flex-1 rounded-lg bg-white/[0.05] py-0.5 text-[10px] font-mono text-blue-300 hover:text-white"
                  >
                    ₹{b}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. General Expenses Monthly Target */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3">
              <label className="text-slate-300 font-semibold block mb-1">
                General Expenses Budget (₹)
              </label>
              <input
                type="number"
                value={tempGeneral}
                onChange={(e) => setTempGeneral(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-1.5 mt-2">
                {[10000, 12000, 15000, 18000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempGeneral(b)}
                    className="flex-1 rounded-lg bg-white/[0.05] py-0.5 text-[10px] text-slate-300 hover:text-white"
                  >
                    ₹{(b / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Electricity Monthly Target */}
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3">
              <label className="text-slate-300 font-semibold block mb-1">
                Electricity Total Target (₹)
              </label>
              <input
                type="number"
                value={tempElecBudget}
                onChange={(e) => setTempElecBudget(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-1.5 mt-2">
                {[2000, 2400, 3000, 3200].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTempElecBudget(b)}
                    className="flex-1 rounded-lg bg-white/[0.05] py-0.5 text-[10px] text-slate-300 hover:text-white"
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
              className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-md flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Apply & Save Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* The 4 Financial Factor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Factor 1: General Expenses Budget (₹15k Pool) */}
        <div className="rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#181411] p-4 sm:p-5 flex flex-col justify-between hover:border-[#F0A93C]/30 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-[#F0A93C] flex items-center gap-1.5 uppercase tracking-wider">
                <ShoppingBag className="h-4 w-4" />
                General Budget ({pacing.budgetRecurringDay}th)
              </span>
              <span className="rounded-md bg-[#F0A93C]/10 px-2 py-0.5 text-[10px] font-bold text-[#F0A93C] border border-[#F0A93C]/20 font-mono">
                {formatINR(pacing.generalBudget)}
              </span>
            </div>

            {/* Daily Burn Rate Card */}
            <div className="p-3.5 rounded-xl border border-[rgba(246,239,227,0.08)] bg-[#100D0A]/90 mb-3">
              <span className="text-[11px] text-[#A89F91] font-medium block">
                Safe Daily Spend:
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-3xl font-bold text-[#F0A93C]">
                  {formatINR(pacing.generalPerDayLimit)}
                </span>
                <span className="text-xs font-bold text-[#F0A93C]/80">/ day</span>
              </div>
              <span className="text-[10px] text-[#665E54] block mt-1">
                For the remaining {pacing.daysRemainingInCycle} days of this cycle
              </span>
            </div>

            {/* Spent vs Remaining breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#A89F91]">
                <span>Spent Since {pacing.budgetRecurringDay}th:</span>
                <span className="font-mono font-bold text-[#F6EFE3]">
                  {formatINR(pacing.generalSpentSoFar)} ({pacing.generalSpentPercent}%)
                </span>
              </div>
              <div className="flex justify-between text-[#A89F91]">
                <span>Remaining Pool:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatINR(pacing.generalRemaining)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-[#1F1914] overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    pacing.generalSpentPercent > 80
                      ? 'bg-rose-500'
                      : pacing.generalSpentPercent > 50
                      ? 'bg-[#F0A93C]'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, pacing.generalSpentPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {pacing.generalExpensesList.length} cycle ad-hocs
            </span>
            <button
              onClick={() => setShowTxList(!showTxList)}
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              {showTxList ? 'Hide entries' : 'View entries'}
            </button>
          </div>
        </div>

        {/* Factor 2: Electricity Balance Factor (Separately Tracked & Updateable) */}
        <div className="rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#181411] p-4 sm:p-5 flex flex-col justify-between hover:border-blue-400/30 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Lightbulb className="h-4 w-4" />
                Electricity Balance
              </span>
              <button
                onClick={() => setIsEditingMeter(!isEditingMeter)}
                className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/20 flex items-center gap-1 hover:bg-blue-500/20 transition-colors"
                title="Click to directly update remaining electricity balance"
              >
                <Edit2 className="h-3 w-3" />
                <span>Update Balance</span>
              </button>
            </div>

            {/* Inline Quick Meter Edit Box */}
            {isEditingMeter ? (
              <form onSubmit={handleSaveInlineMeter} className="p-3 rounded-xl border border-blue-500/40 bg-[#100D0A] mb-3 space-y-2">
                <label className="text-[11px] text-blue-200 block font-semibold font-mono">
                  Update Remaining Electricity (₹):
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    required
                    value={inlineMeterValue}
                    onChange={(e) => setInlineMeterValue(e.target.value)}
                    className="flex-1 rounded-lg border border-blue-500/50 bg-black/60 px-2.5 py-1 text-xs font-mono font-bold text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold transition-colors font-mono"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              /* Remaining Electricity Balance Card */
              <div className="p-3.5 rounded-xl border border-[rgba(246,239,227,0.08)] bg-[#100D0A]/90 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#A89F91] font-medium block">
                    Remaining Power Balance:
                  </span>
                  {meterSavedMsg && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                      <Check className="h-3 w-3" /> Updated!
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-serif text-3xl font-bold text-blue-400">
                    {formatINR(pacing.electricityRemaining)}
                  </span>
                  <span className="text-xs font-bold text-blue-300">pool</span>
                </div>
                <span className="text-[10px] text-[#665E54] block mt-1">
                  {formatINR(pacing.electricityPerDayUntilRent)}/day until {pacing.rentRecurringDay}th rent date
                </span>
              </div>
            )}

            {/* Recharges vs Buffer breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#A89F91]">
                <span>Recharges Done:</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatINR(pacing.electricitySpentSoFar)} ({pacing.electricitySpentPercent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Safe Power Burn:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatINR(pacing.electricityPerDayLimit)} / day
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
            <span>{pacing.electricityList.length} meter events</span>
            {onOpenQuickLog && (
              <button
                onClick={onOpenQuickLog}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>+ Recharge</span>
              </button>
            )}
          </div>
        </div>

        {/* Factor 3: Rent Recurring Milestone (Configurable Date & Amount) */}
        <div className="rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#181411] p-4 sm:p-5 flex flex-col justify-between hover:border-rose-500/30 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Home className="h-4 w-4" />
                Room Rent ({pacing.rentRecurringDay}th)
              </span>
              <button
                onClick={() => setIsConfiguring(true)}
                className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/20 font-mono hover:bg-rose-500/20 transition-colors"
                title="Configure rent recurring date & amount"
              >
                Set Date
              </button>
            </div>

            {/* Rent Countdown Card */}
            <div className="p-3.5 rounded-xl border border-[rgba(246,239,227,0.08)] bg-[#100D0A]/90 mb-3">
              <span className="text-[11px] text-[#A89F91] font-medium block">
                Fixed Rent Commitment:
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-3xl font-bold text-rose-400">
                  {formatINR(pacing.rentAmount)}
                </span>
                <span className="text-xs font-bold text-rose-300">/ mo</span>
              </div>
              <span className="text-[10px] text-[#665E54] block mt-1">
                Clears on the {pacing.rentRecurringDay}th ({pacing.daysUntilRent} days remaining)
              </span>
            </div>

            {/* Rent buffer breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#A89F91]">
                <span>Due Date:</span>
                <span className="font-mono font-bold text-[#F6EFE3]">
                  {formatDisplayDate(pacing.nextRentDate)}
                </span>
              </div>
              <div className="flex justify-between text-[#A89F91]">
                <span>Post-Rent Net Buffer:</span>
                <span className="font-mono font-bold text-blue-400">
                  {formatINR(pacing.postRentBuffer)}
                </span>
              </div>
              <div className="flex justify-between text-[#A89F91]">
                <span>Secured Status:</span>
                <span className="font-mono font-semibold text-emerald-400">
                  Funded in Bank Reserve
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(246,239,227,0.08)] flex items-center justify-between text-[11px] text-rose-300 font-mono">
            <span>Cycle: Every {pacing.rentRecurringDay}th</span>
            <span className="font-bold">100% Guaranteed</span>
          </div>
        </div>

        {/* Factor 4: Available Bank Balance & Total Liquid Runway */}
        <div className="rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#181411] p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                Available Balance Factor
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20 font-mono">
                Liquid Bank
              </span>
            </div>

            {/* Total Safe Daily Spend Card */}
            <div className="p-3.5 rounded-xl border border-[rgba(246,239,227,0.08)] bg-[#100D0A]/90 mb-3">
              <span className="text-[11px] text-[#A89F91] font-medium block">
                Total Safe Daily Runway:
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-3xl font-bold text-emerald-400">
                  {formatINR(pacing.safeTotalDailyBurn)}
                </span>
                <span className="text-xs font-bold text-emerald-300">/ day</span>
              </div>
              <span className="text-[10px] text-[#665E54] block mt-1">
                Spend without eroding savings cushion
              </span>
            </div>

            {/* Buffer stats */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#A89F91]">
                <span>Current Bank Balance:</span>
                <span className="font-mono font-bold text-[#F6EFE3]">
                  {formatINR(pacing.availableBalance)}
                </span>
              </div>
              <div className="flex justify-between text-[#A89F91]">
                <span>Post-Rent Cushion:</span>
                <span className="font-mono font-bold text-blue-400">
                  {formatINR(pacing.postFixedObligationsBuffer)}
                </span>
              </div>
              <div className="flex justify-between text-[#A89F91]">
                <span>General Allowance Share:</span>
                <span className="font-mono font-semibold text-slate-300">
                  {Math.round((pacing.generalPerDayLimit / Math.max(1, pacing.safeTotalDailyBurn)) * 100)}% of daily burn
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(246,239,227,0.08)] flex items-center justify-between text-[11px] text-emerald-400 font-semibold font-mono">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Capital Safety Secured
            </span>
            <span className="text-slate-500 font-mono">Row 239 Intact</span>
          </div>
        </div>
      </div>

      {/* Expandable Active Cycle General Expenses Entries */}
      {showTxList && (
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-black/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Cycle Expenses ({pacing.cycleLabel || `${pacing.budgetRecurringDay}th reset`}) Deducted from Target
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              Total Spent: {formatINR(pacing.generalSpentSoFar)}
            </span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {pacing.generalExpensesList.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">
                No general ad-hoc expenses logged yet in this {pacing.budgetRecurringDay}th cycle!
              </p>
            ) : (
              pacing.generalExpensesList.map((tx) => (
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
