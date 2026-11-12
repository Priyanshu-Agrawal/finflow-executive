'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { BcaCycle } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { useResetBCA } from '@/hooks/useFinancials';

interface BcaCyclePanelProps {
  bcaCycle: BcaCycle;
}

export function BcaCyclePanel({ bcaCycle }: BcaCyclePanelProps) {
  const resetMutation = useResetBCA();

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-6 shadow-xl">
      {/* Header with Title and Reset Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs tabular-nums font-medium text-amber-400 border border-amber-500/20">
              ACTIVE LIABILITY CYCLE
            </span>
            <span className="text-xs tabular-nums text-zinc-400">October 2026 – March 2027</span>
          </div>
          <h2 className="text-lg font-medium text-white mt-1">
            BCA Education Loan Amortization Tracker
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Fixed baseline total of <span className="tabular-nums text-white font-semibold">₹18,000</span> across 6 monthly ₹3,000 installments. Reaches ₹0 on <span className="text-amber-400 font-semibold">2027-03-05</span>.
          </p>
        </div>

        {/* Status / Reset Indicator */}
        <div className="flex items-center gap-2">
          {bcaCycle.needsReset ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  Loans!B2 is <strong className="tabular-nums">{formatINR(bcaCycle.b2Value)}</strong> (Accumulated)
                </span>
              </div>
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 transition-colors shadow-sm disabled:opacity-50"
                title="Reset Loans!B2 cell to true baseline ₹18,000"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
                <span>Reset to ₹18,000</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-credit/30 bg-credit/10 px-3 py-1.5 text-xs text-credit">
              <CheckCircle className="h-4 w-4 text-credit shrink-0" />
              <span>Loans!B2 True Baseline Intact (₹18,000)</span>
            </div>
          )}
        </div>
      </div>

      {/* Metric Breakdown Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
        <div className="p-3.5 rounded-xl border border-white/[0.07] bg-[#18181B]">
          <span className="text-xs tabular-nums text-zinc-400 block">Total Cycle Due</span>
          <span className="tabular-nums text-xl font-bold text-white block mt-1">
            {formatINR(bcaCycle.totalCycleDue)}
          </span>
          <span className="text-xs tabular-nums text-zinc-500">6 EMIs × ₹3,000</span>
        </div>

        <div className="p-3.5 rounded-xl border border-white/[0.07] bg-[#18181B]">
          <span className="text-xs tabular-nums text-zinc-400 block">Paid to Date</span>
          <span className="tabular-nums text-xl font-bold text-credit block mt-1">
            {formatINR(bcaCycle.paidToDate)}
          </span>
          <span className="text-xs text-zinc-400">{bcaCycle.emisPaid} of 6 EMIs Cleared</span>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <span className="text-xs tabular-nums text-amber-400 block">Remaining Due</span>
          <span className="tabular-nums text-xl font-bold text-white block mt-1">
            {formatINR(bcaCycle.remainingDue)}
          </span>
          <span className="text-xs text-amber-400/80">{bcaCycle.emisRemaining} of 6 EMIs Remaining</span>
        </div>

        <div className="p-3.5 rounded-xl border border-white/[0.07] bg-[#18181B]">
          <span className="text-xs tabular-nums text-zinc-400 block">Debt Payoff Milestone</span>
          <span className="tabular-nums text-xl font-bold text-white block mt-1">
            5 Mar 2027
          </span>
          <span className="text-xs text-credit font-medium">+₹3,000/mo Unlocked</span>
        </div>
      </div>

      {/* 6-Month Visual Installment Tracker */}
      <div>
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span className="font-medium text-white">Installment Schedule (Oct 2026 – Mar 2027)</span>
          <span className="tabular-nums text-amber-400">
            {Math.round((bcaCycle.paidToDate / bcaCycle.totalCycleDue) * 100)}% Complete
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          {bcaCycle.schedule.map((item, idx) => (
            <div
              key={item.month}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                item.isPaid
                  ? 'border-credit/30 bg-credit/5 text-credit'
                  : 'border-white/[0.07] bg-[#18181B] text-zinc-400 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold">{item.month}</span>
                {item.isPaid ? (
                  <CheckCircle className="h-4 w-4 text-credit" />
                ) : (
                  <Clock className="h-4 w-4 text-zinc-500" />
                )}
              </div>
              <div className="tabular-nums text-xs font-semibold text-white">
                {formatINR(item.amount)}
              </div>
              <div className="text-xs mt-1.5 font-medium">
                {item.isPaid ? (
                  <span className="text-credit">PAID (EMI {idx + 1}/6)</span>
                ) : (
                  <span className="text-zinc-500">DUE (EMI {idx + 1}/6)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
