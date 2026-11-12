'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { KPIs } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';

interface KPICardsProps {
  kpis: KPIs;
  referenceDate: string;
}

export function KPICards({ kpis, referenceDate }: KPICardsProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 4 Main Executive Metric Cards: 2x2 Grid on Mobile, 4x1 on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Current Available Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-3.5 sm:p-5 shadow-lg shadow-emerald-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Current Available</span>
              </span>
              <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/20">
                {formatDisplayDate(referenceDate)}
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="font-mono text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                {formatINR(kpis.currentBalance)}
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                Liquid bank reserves
              </p>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">Formula Chain Verified</span>
          </div>
        </div>

        {/* Card 2: Upcoming Immediate Bills (Next 5 Days) */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-3.5 sm:p-5 shadow-lg shadow-amber-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Upcoming Bills</span>
              </span>
              <span className="rounded-full bg-amber-500/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-300 border border-amber-500/20">
                Next 5d
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="font-mono text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-amber-400">
                {formatINR(kpis.upcomingBills)}
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                Phone (₹58k) + Power + Rent
              </p>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-amber-400/90">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">Clears by 15 Nov</span>
          </div>
        </div>

        {/* Card 3: Cycle cushion — lowest balance before the next salary */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 p-3.5 sm:p-5 shadow-lg shadow-blue-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Cycle Cushion</span>
              </span>
              <span className="rounded-full bg-blue-500/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-blue-300 border border-blue-500/20">
                Cushion
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="font-mono text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-blue-400">
                {formatINR(kpis.postNovBalance)}
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                Lowest before {formatDisplayDate(kpis.cushionUntil).split(' ').slice(0, 2).join(' ')} salary
              </p>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-blue-400">
            <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">Safe Operating Margin</span>
          </div>
        </div>

        {/* Card 4: Projected End Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 p-3.5 sm:p-5 shadow-lg shadow-indigo-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Projected End</span>
              </span>
              <span className="rounded-full bg-indigo-500/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-indigo-300 border border-indigo-500/20">
                Late 2027
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="font-mono text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-indigo-300">
                {formatINR(kpis.projectedEndBalance)}
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                Projected cycle end (Row 314)
              </p>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-indigo-400">
            <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">+100.7% growth</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Overview Strip */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] sm:text-xs truncate">Total Inflow</span>
            <span className="font-mono font-semibold text-slate-200 text-xs sm:text-sm truncate block">
              {formatINR(kpis.totalCredit)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
            <ArrowDownRight className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] sm:text-xs truncate">Total Outflow</span>
            <span className="font-mono font-semibold text-slate-200 text-xs sm:text-sm truncate block">
              {formatINR(kpis.totalDebit)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] sm:text-xs truncate">Debt-Free</span>
            <span className="font-semibold text-indigo-300 text-xs sm:text-sm truncate block">
              August 2027
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] sm:text-xs truncate">Unlocked Cash</span>
            <span className="font-semibold text-emerald-400 text-xs sm:text-sm truncate block">
              +₹14,771/mo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
