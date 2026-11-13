'use client';

import React from 'react';
import Link from 'next/link';
import { ExpenseEntry, KPIs, LoanStatus } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { anchorRowFor } from '@/lib/anchor';
import { formatDate, formatDateShort, formatMonthYear } from '@/lib/format';
import { billsDeadline, debtFreeLine, growthCaption, upcomingBillsCaption } from '@/lib/home-text';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Sparkles,
  TableProperties,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

interface ExecutiveHeroProps {
  kpis: KPIs;
  expenses: ExpenseEntry[];
  loans: LoanStatus[];
  referenceDate: string;
  onOpenQuickLog: () => void;
}

export function ExecutiveHero({
  kpis,
  expenses,
  loans,
  referenceDate,
  onOpenQuickLog,
}: ExecutiveHeroProps) {
  // Every sentence below is built from the sheet data.
  const anchor = anchorRowFor(expenses, referenceDate);
  const asOf = anchor ? formatDate(anchor.date) : formatDate(referenceDate);
  const billsCaption = upcomingBillsCaption(expenses, referenceDate);
  const growth = growthCaption(kpis.currentBalance, kpis.projectedEndBalance);
  const debtFree = debtFreeLine(loans);
  const lastRow = expenses[expenses.length - 1];
  const cushionDay = formatDateShort(kpis.cushionUntil);
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#121214] p-5 sm:p-7 shadow-xl">
      {/* Top row: what this card is, and the date the balance is as of */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <span className="text-sm font-semibold text-zinc-300">Overview</span>
            <span className="text-xs text-zinc-500 block sm:hidden">
              Balance as of {asOf}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/[0.03] px-2.5 py-1 text-xs tabular-nums font-medium text-zinc-400 border border-white/[0.06]">
            <Calendar className="h-3 w-3 text-amber-400" />
            <span>Balance as of {asOf}</span>
          </div>
        </div>
      </div>

      {/* Hero Liquid Balance Main Row */}
      <div className="my-5 sm:my-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs tabular-nums font-medium text-zinc-400 block mb-1">
            Balance now
          </span>
          <div className="flex items-baseline gap-2">
            <span data-allow-serif className="font-serif tabular-nums text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              {formatINR(kpis.currentBalance)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Read from your Google Sheet</span>
          </p>
        </div>

        {/* Quick Action Button Group (Clean Unified Styling) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <button
            type="button"
            onClick={onOpenQuickLog}
            className="flex-1 sm:flex-none min-h-11 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-sm transition-all active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Log</span>
          </button>

          <Link
            href="/excel"
            className="flex-1 sm:flex-none min-h-11 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.07] hover:border-white/[0.15] transition-all"
          >
            <TableProperties className="h-4 w-4 text-zinc-400" />
            <span>Excel</span>
          </Link>

          <Link
            href="/budget"
            className="flex-1 sm:flex-none min-h-11 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.07] hover:border-white/[0.15] transition-all"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Budget</span>
          </Link>
        </div>
      </div>

      {/* 3 Core Runway Pillars - Completely Unified Styling (Same card, same font, consistent metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
        {/* Pillar 1: Upcoming Obligations */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#18181B] p-4 hover:border-white/[0.15] transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span className="font-medium flex items-center gap-1.5 text-zinc-300">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Upcoming Bills (5d)
            </span>
            <span className="text-xs tabular-nums text-zinc-500">{billsDeadline(referenceDate)}</span>
          </div>
          <div className="tabular-nums text-2xl font-bold text-white">
            {formatINR(kpis.upcomingBills)}
          </div>
          <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{billsCaption}</p>
        </div>

        {/* Pillar 2: Cycle cushion — lowest balance before the next salary. Shown here only:
            the Budget page's rent card does not repeat it. */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#18181B] p-4 hover:border-white/[0.15] transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span className="font-medium flex items-center gap-1.5 text-zinc-300">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Cycle Cushion
            </span>
            <span className="text-xs tabular-nums rounded bg-white/[0.05] px-1.5 py-0.5 text-zinc-300 font-semibold">
              Before {cushionDay}
            </span>
          </div>
          <div className={`tabular-nums text-2xl font-bold ${kpis.postNovBalance < 0 ? 'text-orange-400' : 'text-white'}`}>
            {formatINR(kpis.postNovBalance)}
          </div>
          <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
            Lowest balance before the {cushionDay} salary, after every bill
          </p>
        </div>

        {/* Pillar 3: Projected Conclusion */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#18181B] p-4 hover:border-white/[0.15] transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span className="font-medium flex items-center gap-1.5 text-zinc-300">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              Projected End Balance
            </span>
            <span className="text-xs tabular-nums text-zinc-500">{lastRow ? `Ends ${formatMonthYear(lastRow.date)}` : ''}</span>
          </div>
          <div className="tabular-nums text-2xl font-bold text-white">
            {formatINR(kpis.projectedEndBalance)}
          </div>
          {growth && <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{growth}</p>}
        </div>
      </div>

      {/* Bottom Lifetime Flows Strip */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-credit" />
            <span>Lifetime Inflow:</span>
            <strong className="tabular-nums text-zinc-200">{formatINR(kpis.totalCredit)}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDownRight className="h-3.5 w-3.5 text-zinc-400" />
            <span>Lifetime Outflow:</span>
            <strong className="tabular-nums text-zinc-200">{formatINR(kpis.totalDebit)}</strong>
          </span>
        </div>

        {debtFree && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium tabular-nums">
              <Sparkles className="h-3 w-3" />
              {debtFree}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
