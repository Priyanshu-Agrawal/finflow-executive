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
    // Total Interest = P * rAnnual * tYears
    // Monthly EMI = (P + Total Interest) / n
    const flatTotalInterest = P * rAnnual * tYears;
    const flatTotalPayment = P + flatTotalInterest;
    const flatMonthlyEmi = flatTotalPayment / n;

    // 2. Reducing Balance Model
    // Monthly rate = rAnnual / 12
    // EMI = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-400" />
            Interactive Loan & Interest Simulator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare Flat Rate vs. Reducing Balance models to audit amortization and interest leakage
          </p>
        </div>
        <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/20">
          Financial Intelligence Tool
        </span>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">
            Principal Amount (₹)
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(Math.max(1000, Number(e.target.value)))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
            placeholder="150000"
          />
          <div className="flex gap-1.5 mt-2">
            {[50000, 100000, 150000, 200000].map((p) => (
              <button
                key={p}
                onClick={() => setPrincipal(p)}
                className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white transition-colors"
              >
                ₹{(p / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">
            Annual Interest Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={annualRate}
            onChange={(e) => setAnnualRate(Math.max(0.1, Number(e.target.value)))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
            placeholder="10.5"
          />
          <div className="flex gap-1.5 mt-2">
            {[8.5, 10.5, 12.0, 14.5].map((r) => (
              <button
                key={r}
                onClick={() => setAnnualRate(r)}
                className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white transition-colors"
              >
                {r}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">
            Tenure (Months)
          </label>
          <input
            type="number"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
            placeholder="18"
          />
          <div className="flex gap-1.5 mt-2">
            {[6, 12, 18, 24, 36].map((m) => (
              <button
                key={m}
                onClick={() => setTenureMonths(m)}
                className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white transition-colors"
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Model 1: Flat Rate */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-rose-300">Flat Rate Model</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Common NBFC Trap</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Monthly EMI:</span>
              <span className="font-mono text-sm font-bold text-white">
                {formatINR(simulation.flatMonthlyEmi)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Interest Outflow:</span>
              <span className="font-mono text-sm font-bold text-rose-400">
                {formatINR(simulation.flatTotalInterest)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">Total Repayment:</span>
              <span className="font-mono text-sm font-bold text-slate-200">
                {formatINR(simulation.flatTotalPayment)}
              </span>
            </div>
          </div>
        </div>

        {/* Model 2: Reducing Balance */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Reducing Balance Model
            </span>
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Standard Bank Rate
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Monthly EMI:</span>
              <span className="font-mono text-sm font-bold text-white">
                {formatINR(simulation.reducingMonthlyEmi)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Interest Outflow:</span>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {formatINR(simulation.reducingTotalInterest)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">Total Repayment:</span>
              <span className="font-mono text-sm font-bold text-slate-200">
                {formatINR(simulation.reducingTotalPayment)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Difference / Projected Savings Banner */}
      <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-indigo-300 font-semibold block">
              Reducing Balance Capital Advantage
            </span>
            <span className="text-xs text-slate-300">
              Saves <strong className="font-mono text-emerald-400">{formatINR(simulation.savingsInterest)}</strong> in unneeded interest ({simulation.savingsPercent.toFixed(1)}% interest reduction)
            </span>
          </div>
        </div>

        <div className="text-right sm:text-right">
          <span className="text-[11px] text-slate-400 block">Monthly Cash Free-Up</span>
          <span className="font-mono text-sm font-bold text-indigo-300">
            {formatINR(simulation.flatMonthlyEmi - simulation.reducingMonthlyEmi)}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
