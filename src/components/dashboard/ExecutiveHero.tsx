'use client';

import React from 'react';
import { KPIs } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileSpreadsheet,
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
  referenceDate: string;
  onOpenQuickLog: () => void;
  onOpenEmiScheduler: () => void;
  onSelectTab: (tab: string) => void;
}

export function ExecutiveHero({
  kpis,
  referenceDate,
  onOpenQuickLog,
  onOpenEmiScheduler,
  onSelectTab,
}: ExecutiveHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#131722]/90 via-[#0e111a]/95 to-[#0a0c12] p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Top Meta Header: Status & Audit Baseline */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Executive Balance Portfolio
            </span>
            <span className="text-[10px] text-slate-500 block sm:hidden">
              Anchor: {formatDisplayDate(referenceDate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Row 239 Intact</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-white/[0.06]">
            <Calendar className="h-3 w-3 text-indigo-400" />
            <span>Anchor: {formatDisplayDate(referenceDate)}</span>
          </div>
        </div>
      </div>

      {/* Hero Liquid Balance Main Row */}
      <div className="my-5 sm:my-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-1">
            Current Liquid Operating Balance
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
              {formatINR(kpis.currentBalance)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Authoritative available bank balance bound to Google Sheets</span>
          </p>
        </div>

        {/* Quick Action Button Group */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <button
            onClick={onOpenQuickLog}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Log Expense</span>
          </button>

          <button
            onClick={() => onSelectTab('excel')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500/30 transition-all"
          >
            <TableProperties className="h-4 w-4 text-emerald-400" />
            <span>Excel View</span>
          </button>

          <button
            onClick={() => onSelectTab('budget')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 hover:border-amber-500/30 transition-all"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Budget Burn</span>
          </button>
        </div>
      </div>

      {/* 3 Core Runway Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
        {/* Pillar 1: Upcoming Obligations */}
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3.5 sm:p-4 hover:border-amber-500/20 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Upcoming Bills (5d)
            </span>
            <span className="text-[10px] text-slate-500">By 15 Nov</span>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-amber-400">
            {formatINR(kpis.upcomingBills)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
            Phone (₹58k) + Electricity (₹2.4k) + Rent (₹15k)
          </p>
        </div>

        {/* Pillar 2: Real Post-November Buffer */}
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3.5 sm:p-4 hover:border-blue-500/20 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium flex items-center gap-1.5 text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Post-Nov Buffer
            </span>
            <span className="text-[10px] text-blue-400/80 font-semibold">Real Cushion</span>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-blue-400">
            {formatINR(kpis.postNovBalance)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
            Safe operating margin after Nov 15 obligations clear
          </p>
        </div>

        {/* Pillar 3: Projected Conclusion */}
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3.5 sm:p-4 hover:border-indigo-500/20 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium flex items-center gap-1.5 text-indigo-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Projected End Balance
            </span>
            <span className="text-[10px] text-indigo-300 font-semibold">Late 2027</span>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-indigo-300">
            {formatINR(kpis.projectedEndBalance)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
            +100.7% growth at conclusion of late-2027 projection
          </p>
        </div>
      </div>

      {/* Bottom Lifetime Flows Strip */}
      <div className="mt-4 pt-3 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
            <span>Lifetime Inflow:</span>
            <strong className="font-mono text-slate-200">{formatINR(kpis.totalCredit)}</strong>
          </span>
          <span className="flex items-center gap-1">
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
            <span>Lifetime Outflow:</span>
            <strong className="font-mono text-slate-200">{formatINR(kpis.totalDebit)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            <Sparkles className="h-3 w-3" />
            Debt-Free by August 2027 (+₹14,771/mo unlocked)
          </span>
        </div>
      </div>
    </div>
  );
}
