'use client';

import React, { useState } from 'react';
import { LoanStatus, ExpenseEntry } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  HandCoins,
  Settings,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { LoanActionModal } from './LoanActionModal';

interface LoanPortfolioProps {
  loans: LoanStatus[];
  referenceDate?: string;
  recentExpenses?: ExpenseEntry[];
  b2RawValue?: number;
}

export function LoanPortfolio({
  loans,
  referenceDate = '2026-11-10',
  recentExpenses = [],
  b2RawValue,
}: LoanPortfolioProps) {
  const [selectedLoan, setSelectedLoan] = useState<LoanStatus | null>(null);

  const activeLoans = loans.filter((l) => !l.isPaidOff);
  const settledLoans = loans.filter((l) => l.isPaidOff);

  const totalCurrentDue = activeLoans.reduce((sum, l) => sum + l.currentDue, 0);
  const totalPrincipal = loans.reduce((sum, l) => sum + l.initialPrincipal, 0);
  const totalPaid = loans.reduce((sum, l) => sum + l.paidToDate, 0);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Header */}
      <div className="rounded-3xl border border-[rgba(246,239,227,0.08)] bg-[#181411] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#F0A93C]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#F0A93C] border border-[#F0A93C]/30">
              UNIFIED DEBT HUB
            </span>
            <span className="text-xs text-[#A89F91]">All 7 Loans & Liabilities</span>
          </div>
          <h3 className="text-base sm:text-lg font-serif font-bold text-white flex items-center gap-2 mt-1">
            <CreditCard className="h-5 w-5 text-[#F0A93C]" />
            Complete Liabilities Portfolio
          </h3>
          <p className="text-xs text-[#A89F91] mt-0.5">
            Click any loan card below to log payments, record third-party payments (Khushboo/Bhaiya), or settle.
          </p>
        </div>

        <div className="flex items-center gap-5 text-xs bg-[#100D0A] border border-[rgba(246,239,227,0.08)] p-3 rounded-2xl">
          <div>
            <span className="text-[#A89F91] block text-[11px] font-mono">Total Active Liabilities</span>
            <span className="font-mono text-base font-bold text-rose-400">
              {formatINR(totalCurrentDue)}
            </span>
          </div>
          <div className="border-l border-[rgba(246,239,227,0.08)] pl-5">
            <span className="text-[#A89F91] block text-[11px] font-mono">Total Retired Debt</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {formatINR(totalPaid)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Loans Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Amortizing Liabilities ({activeLoans.length})
          </h4>
          <span className="text-[11px] text-slate-500">Tap card to open action drawer</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeLoans.map((loan) => (
            <div
              key={loan.id}
              onClick={() => setSelectedLoan(loan)}
              role="button"
              tabIndex={0}
              className="group rounded-3xl border border-white/[0.08] bg-[#0c0e14] hover:border-indigo-500/50 hover:bg-[#10131c] p-5 shadow-lg relative overflow-hidden transition-all duration-200 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {/* Top Row: Name, Col, and Quick Pill */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {loan.name}
                  </span>
                  <span className="text-[11px] text-slate-400 block capitalize mt-0.5">
                    {loan.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded-lg bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/20">
                    Col {loan.columnLetter}
                  </span>
                  <span className="rounded-lg bg-white/[0.05] p-1 text-slate-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              {/* 3 Metric Columns */}
              <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Initial</span>
                  <span className="font-mono font-bold text-slate-300">
                    {formatINR(loan.initialPrincipal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Paid</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatINR(loan.paidToDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Remaining</span>
                  <span className="font-mono font-bold text-rose-400">
                    {formatINR(loan.currentDue)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Payoff Progress</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {loan.progressPercent}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${loan.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Footer info & 1-Tap Trigger */}
              <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                {loan.monthlyEmi ? (
                  <span>
                    Monthly EMI: <strong className="text-white font-mono">{formatINR(loan.monthlyEmi)}</strong>
                  </span>
                ) : (
                  <span className="text-slate-500">Flexible Repayment</span>
                )}
                {loan.targetPayoffDate ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Clears {loan.targetPayoffDate}
                  </span>
                ) : (
                  <span className="text-indigo-400 text-[11px] font-semibold group-hover:underline flex items-center gap-1">
                    Manage Loan <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settled Loans Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Fully Settled & Cleared Liabilities ({settledLoans.length})
          </h4>
          <span className="text-[11px] text-slate-500">Click to view settlement details or edit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {settledLoans.map((loan) => (
            <div
              key={loan.id}
              onClick={() => setSelectedLoan(loan)}
              role="button"
              tabIndex={0}
              className="group rounded-2xl border border-white/[0.06] bg-[#0c0e14]/60 hover:bg-[#10131c] hover:border-emerald-500/40 p-4 flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                    {loan.name}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Principal: <span className="font-mono">{formatINR(loan.initialPrincipal)}</span> ➔{' '}
                  <strong className="text-emerald-400 font-mono">₹0</strong>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">Col {loan.columnLetter} • {loan.notes || '100% Cleared'}</div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 shrink-0">
                100% PAID
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Loan Action Modal */}
      {selectedLoan && (
        <LoanActionModal
          loan={selectedLoan}
          referenceDate={referenceDate}
          recentExpenses={recentExpenses}
          b2RawValue={b2RawValue}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </div>
  );
}
