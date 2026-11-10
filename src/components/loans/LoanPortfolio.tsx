'use client';

import React from 'react';
import { LoanStatus } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { CheckCircle2, Clock, CreditCard, ShieldCheck } from 'lucide-react';

interface LoanPortfolioProps {
  loans: LoanStatus[];
}

export function LoanPortfolio({ loans }: LoanPortfolioProps) {
  const activeLoans = loans.filter((l) => !l.isPaidOff);
  const settledLoans = loans.filter((l) => l.isPaidOff);

  const totalCurrentDue = activeLoans.reduce((sum, l) => sum + l.currentDue, 0);
  const totalPrincipal = loans.reduce((sum, l) => sum + l.initialPrincipal, 0);
  const totalPaid = loans.reduce((sum, l) => sum + l.paidToDate, 0);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-400" />
            Complete Liabilities Portfolio (7 Loan Columns)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tracking multi-column debt amortization timeline from Loans sheet (A1:H306+)
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Total Active Liabilities</span>
            <span className="font-mono text-base font-bold text-rose-400">
              {formatINR(totalCurrentDue)}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-400 block">Total Retired Debt</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {formatINR(totalPaid)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Loans Grid */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Active Amortizing Liabilities ({activeLoans.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeLoans.map((loan) => (
            <div
              key={loan.id}
              className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">{loan.name}</span>
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                  Col {loan.columnLetter}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 my-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Initial Principal</span>
                  <span className="font-mono font-bold text-slate-300">
                    {formatINR(loan.initialPrincipal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Paid to Date</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatINR(loan.paidToDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Balance</span>
                  <span className="font-mono font-bold text-rose-400">
                    {formatINR(loan.currentDue)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Liquidation Progress</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {loan.progressPercent}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${loan.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Footer info */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                {loan.monthlyEmi && (
                  <span>
                    Monthly EMI: <strong className="text-white font-mono">{formatINR(loan.monthlyEmi)}</strong>
                  </span>
                )}
                {loan.targetPayoffDate && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Clears {loan.targetPayoffDate}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settled Loans Grid */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Fully Settled & Cleared Liabilities ({settledLoans.length})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {settledLoans.map((loan) => (
            <div
              key={loan.id}
              className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-200">{loan.name}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Principal: <span className="font-mono">{formatINR(loan.initialPrincipal)}</span> ➔ <strong className="text-emerald-400 font-mono">₹0</strong>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">{loan.notes}</div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                100% PAID
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
