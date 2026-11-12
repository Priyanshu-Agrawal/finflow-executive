'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, CheckCircle2, ChevronRight, HelpCircle, Sparkles } from 'lucide-react';
import { formatINR } from '@/lib/date-utils';

export function LoanSimulator() {
  const [principal, setPrincipal] = useState<number>(150000);
  const [annualRate, setAnnualRate] = useState<number>(10.5);
  const [tenureMonths, setTenureMonths] = useState<number>(18);

  // Calculations
  const simulation = useMemo(() => {
    const P = principal;
    const rAnnual = annualRate / 100;
    const n = tenureMonths;
    const tYears = n / 12;

    // 1. Flat Rate Model
    const flatTotalInterest = P * rAnnual * tYears;
    const flatTotalPayment = P + flatTotalInterest;
    const flatMonthlyEmi = flatTotalPayment / n;

    // 2. Reducing Balance Model
    const rMonthly = rAnnual / 12;
    let reducingMonthlyEmi = 0;
    let reducingTotalPayment = 0;
    let reducingTotalInterest = 0;

    if (rMonthly > 0) {
      const compoundFactor = Math.pow(1 + rMonthly, n);
      reducingMonthlyEmi = (P * rMonthly * compoundFactor) / (compoundFactor - 1);
      reducingTotalPayment = reducingMonthlyEmi * n;
      reducingTotalInterest = reducingTotalPayment - P;
    } else {
      reducingMonthlyEmi = P / n;
      reducingTotalPayment = P;
      reducingTotalInterest = 0;
    }

    const savingsInterest = flatTotalInterest - reducingTotalInterest;
    const savingsPercent = flatTotalInterest > 0 ? (savingsInterest / flatTotalInterest) * 100 : 0;

    return {
      flatMonthlyEmi,
      flatTotalInterest,
      flatTotalPayment,
      reducingMonthlyEmi,
      reducingTotalInterest,
      reducingTotalPayment,
      savingsInterest,
      savingsPercent,
    };
  }, [principal, annualRate, tenureMonths]);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-white flex items-center gap-2">
            <Calculator className="h-4 w-4 text-amber-500" />
            Interactive Loan & Interest Simulator
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Compare Flat Rate vs. Reducing Balance models to audit amortization and interest leakage
          </p>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
          Financial Intelligence Tool
        </span>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-white/[0.07] bg-[#18181B]">
        <div>
          <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
            Principal Amount (₹)
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(Math.max(1000, Number(e.target.value)))}
            className="w-full rounded-xl border border-white/[0.07] bg-[#121214] px-3 py-2 text-sm tabular-nums text-white focus:border-amber-500 focus:outline-none"
            placeholder="150000"
          />
          <div className="flex gap-1.5 mt-2">
            {[50000, 100000, 150000, 200000].map((p) => (
              <button
                key={p}
                onClick={() => setPrincipal(p)}
                className="rounded-lg bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                ₹{(p / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
            Annual Interest Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={annualRate}
            onChange={(e) => setAnnualRate(Math.max(0.1, Number(e.target.value)))}
            className="w-full rounded-xl border border-white/[0.07] bg-[#121214] px-3 py-2 text-sm tabular-nums text-white focus:border-amber-500 focus:outline-none"
            placeholder="10.5"
          />
          <div className="flex gap-1.5 mt-2">
            {[8.5, 10.5, 12.0, 14.5].map((r) => (
              <button
                key={r}
                onClick={() => setAnnualRate(r)}
                className="rounded-lg bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {r}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
            Tenure (Months)
          </label>
          <input
            type="number"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-xl border border-white/[0.07] bg-[#121214] px-3 py-2 text-sm tabular-nums text-white focus:border-amber-500 focus:outline-none"
            placeholder="18"
          />
          <div className="flex gap-1.5 mt-2">
            {[6, 12, 18, 24, 36].map((m) => (
              <button
                key={m}
                onClick={() => setTenureMonths(m)}
                className="rounded-lg bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Model 1: Flat Rate */}
        <div className="rounded-xl border border-white/[0.07] bg-[#18181B] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-300">Flat Rate Model</span>
            <span className="text-xs text-zinc-500 tabular-nums">Common NBFC Model</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Monthly EMI:</span>
              <span className="tabular-nums text-sm font-bold text-white">
                {formatINR(simulation.flatMonthlyEmi)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Total Interest Outflow:</span>
              <span className="tabular-nums text-sm font-bold text-zinc-200">
                {formatINR(simulation.flatTotalInterest)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.07]">
              <span className="text-zinc-400">Total Repayment:</span>
              <span className="tabular-nums text-sm font-bold text-white">
                {formatINR(simulation.flatTotalPayment)}
              </span>
            </div>
          </div>
        </div>

        {/* Model 2: Reducing Balance */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-amber-400 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Reducing Balance Model
            </span>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
              Standard Bank Rate
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Monthly EMI:</span>
              <span className="tabular-nums text-sm font-bold text-white">
                {formatINR(simulation.reducingMonthlyEmi)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Total Interest Outflow:</span>
              <span className="tabular-nums text-sm font-bold text-credit">
                {formatINR(simulation.reducingTotalInterest)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.07]">
              <span className="text-zinc-400">Total Repayment:</span>
              <span className="tabular-nums text-sm font-bold text-white">
                {formatINR(simulation.reducingTotalPayment)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Difference / Projected Savings Banner */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-amber-400 font-medium block">
              Reducing Balance Capital Advantage
            </span>
            <span className="text-xs text-zinc-300">
              Saves <strong className="tabular-nums text-white">{formatINR(simulation.savingsInterest)}</strong> in interest ({simulation.savingsPercent.toFixed(1)}% reduction)
            </span>
          </div>
        </div>

        <div className="text-right sm:text-right">
          <span className="text-xs text-zinc-400 block tabular-nums">Monthly Cash Free-Up</span>
          <span className="tabular-nums text-sm font-bold text-white">
            {formatINR(simulation.flatMonthlyEmi - simulation.reducingMonthlyEmi)}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
