'use client';

import React, { useState } from 'react';
import { LoanStatus, ExpenseEntry } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { formatDate } from '@/lib/format';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
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
  const totalPaid = loans.reduce((sum, l) => sum + l.paidToDate, 0);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Header (Unified Styling) */}
      <div className="rounded-3xl border border-white/[0.07] bg-[#121214] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-400" />
            <span>All {loans.length} loans</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tap a loan to log a payment, record a payment by someone else, or settle it.
          </p>
        </div>

        <div className="flex items-center gap-5 text-xs bg-black/40 border border-white/[0.07] p-3 rounded-2xl">
          <div>
            <span className="text-zinc-400 block text-xs tabular-nums">Total Active Liabilities</span>
            <span className="tabular-nums text-base font-bold text-zinc-100">
              {formatINR(totalCurrentDue)}
            </span>
          </div>
          <div className="border-l border-white/[0.08] pl-5">
            <span className="text-zinc-400 block text-xs tabular-nums">Total Retired Debt</span>
            <span className="tabular-nums text-base font-bold text-credit">
              {formatINR(totalPaid)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Loans Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs tabular-nums font-bold text-zinc-400">
            Active Amortizing Liabilities ({activeLoans.length})
          </h4>
          <span className="text-xs tabular-nums text-zinc-500">Tap card to open action drawer</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeLoans.map((loan) => (
            <div
              key={loan.id}
              onClick={() => setSelectedLoan(loan)}
              role="button"
              tabIndex={0}
              className="group rounded-2xl border border-white/[0.07] bg-[#18181B] hover:border-white/[0.18] p-5 shadow-lg relative overflow-hidden transition-all duration-200 cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {/* Top Row: Name, Col, and Quick Pill */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-base tabular-nums font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                    {loan.name}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-400 block capitalize mt-0.5">
                    {loan.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-xs tabular-nums font-bold text-zinc-300 border border-white/[0.07]">
                    Col {loan.columnLetter}
                  </span>
                  <span className="rounded-lg bg-white/[0.04] p-1 text-zinc-400 group-hover:text-zinc-950 group-hover:bg-amber-500 transition-colors">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              {/* 3 Metric Columns */}
              <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs">
                <div>
                  <span className="text-xs tabular-nums text-zinc-400 block">Initial</span>
                  <span className="tabular-nums font-bold text-zinc-200">
                    {formatINR(loan.initialPrincipal)}
                  </span>
                </div>
                <div>
                  <span className="text-xs tabular-nums text-zinc-400 block">Paid</span>
                  <span className="tabular-nums font-bold text-credit">
                    {formatINR(loan.paidToDate)}
                  </span>
                </div>
                <div>
                  <span className="text-xs tabular-nums text-zinc-400 block">Remaining</span>
                  <span className="tabular-nums font-bold text-white">
                    {formatINR(loan.currentDue)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 tabular-nums">Payoff Progress</span>
                  <span className="tabular-nums font-bold text-amber-400">
                    {loan.progressPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${loan.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Footer info & 1-Tap Trigger */}
              <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                {loan.monthlyEmi ? (
                  <span>
                    Monthly EMI: <strong className="text-zinc-200 tabular-nums font-bold">{formatINR(loan.monthlyEmi)}</strong>
                  </span>
                ) : (
                  <span className="text-zinc-500 tabular-nums">Flexible Repayment</span>
                )}
                {loan.targetPayoffDate ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1 tabular-nums text-xs">
                    <Clock className="h-3 w-3" />
                    Clears {formatDate(loan.targetPayoffDate)}
                  </span>
                ) : (
                  <span className="text-amber-400 text-xs font-semibold group-hover:underline flex items-center gap-1">
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
          <h4 className="text-xs tabular-nums font-bold text-zinc-400">
            Fully Settled & Cleared Liabilities ({settledLoans.length})
          </h4>
          <span className="text-xs tabular-nums text-zinc-500">Click to view settlement details or edit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {settledLoans.map((loan) => (
            <div
              key={loan.id}
              onClick={() => setSelectedLoan(loan)}
              role="button"
              tabIndex={0}
              className="group rounded-xl border border-white/[0.07] bg-[#18181B] hover:border-white/[0.18] p-4 flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-credit shrink-0" />
                  <span className="text-xs tabular-nums font-bold text-zinc-200 group-hover:text-amber-300 transition-colors">
                    {loan.name}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  Principal: <span className="tabular-nums font-semibold">{formatINR(loan.initialPrincipal)}</span> ➔{' '}
                  <strong className="text-zinc-200 tabular-nums font-bold">₹0</strong>
                </div>
                <div className="mt-0.5 text-xs tabular-nums text-zinc-500">Col {loan.columnLetter} • {loan.notes || '100% Cleared'}</div>
              </div>
              <span className="rounded-full bg-credit/10 px-2 py-0.5 text-xs tabular-nums font-bold text-credit border border-credit/20 shrink-0">
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
