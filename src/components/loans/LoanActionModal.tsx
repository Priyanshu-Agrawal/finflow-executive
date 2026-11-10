'use client';

import React, { useState } from 'react';
import { LoanStatus, ExpenseEntry } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import { useLoanAction } from '@/hooks/useFinancials';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  HandCoins,
  History,
  Layers,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';

interface LoanActionModalProps {
  loan: LoanStatus;
  referenceDate: string;
  recentExpenses?: ExpenseEntry[];
  b2RawValue?: number;
  onClose: () => void;
}

type ActionTab = 'pay' | 'external' | 'settle' | 'link' | 'edit';

export function LoanActionModal({
  loan,
  referenceDate,
  recentExpenses = [],
  b2RawValue,
  onClose,
}: LoanActionModalProps) {
  const [activeTab, setActiveTab] = useState<ActionTab>('pay');
  const [amount, setAmount] = useState<number | string>(
    loan.monthlyEmi ? Math.round(loan.monthlyEmi) : loan.currentDue > 0 ? loan.currentDue : ''
  );
  const [date, setDate] = useState(referenceDate);
  const [payer, setPayer] = useState('Khushboo');
  const [notes, setNotes] = useState('');
  const [customBaseline, setCustomBaseline] = useState<number | string>(loan.currentDue);
  const [selectedExpenseRow, setSelectedExpenseRow] = useState<number | ''>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loanActionMutation = useLoanAction();

  const isBca = loan.id === 'bca' || loan.name.toLowerCase().includes('bca');
  const bcaNeedsReset = isBca && b2RawValue !== undefined && Math.round(b2RawValue) !== 18000;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    try {
      const res = await loanActionMutation.mutateAsync({
        action: 'log_payment',
        loanId: loan.id,
        loanName: loan.name,
        amount: Number(amount),
        date,
        notes: notes.trim() || undefined,
      });
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {}
  };

  const handleExternalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    try {
      const res = await loanActionMutation.mutateAsync({
        action: 'external_payment',
        loanId: loan.id,
        loanName: loan.name,
        columnLetter: loan.columnLetter,
        amount: Number(amount),
        date,
        payer: payer.trim() || 'External Person',
        notes: notes.trim() || undefined,
      });
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch {}
  };

  const handleSettleFull = async () => {
    if (
      !confirm(
        `Are you sure you want to mark ${loan.name} as fully settled? This sets Loans!${loan.columnLetter}2 to ₹0.`
      )
    ) {
      return;
    }
    try {
      const res = await loanActionMutation.mutateAsync({
        action: 'settle_loan',
        loanId: loan.id,
        loanName: loan.name,
        columnLetter: loan.columnLetter,
        amount: loan.currentDue,
        date,
      });
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {}
  };

  const handleSettleFromExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseRow) return;
    try {
      const res = await loanActionMutation.mutateAsync({
        action: 'settle_from_expense',
        loanId: loan.id,
        loanName: loan.name,
        columnLetter: loan.columnLetter,
        expenseRowIndex: Number(selectedExpenseRow),
      });
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {}
  };

  const handleUpdateBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customBaseline === '' || isNaN(Number(customBaseline))) return;
    try {
      const res = await loanActionMutation.mutateAsync({
        action: 'update_due',
        columnLetter: loan.columnLetter,
        value: Number(customBaseline),
      });
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {}
  };

  const handleResetBca = async () => {
    try {
      const res = await loanActionMutation.mutateAsync({
        action: 'reset_bca',
      });
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl border border-white/[0.1] bg-[#0c0e14] p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Loan Header Card */}
        <div className="pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/30">
              Loans Col {loan.columnLetter}
            </span>
            <span className="rounded-lg bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-slate-300 capitalize">
              {loan.category.replace('_', ' ')}
            </span>
            {loan.isPaidOff ? (
              <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Settled & Clear
              </span>
            ) : (
              <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Active Liability
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-400" />
            {loan.name}
          </h2>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.05] text-xs">
            <div className="rounded-xl bg-white/[0.03] p-2.5">
              <span className="text-[11px] text-slate-400 block">Current Balance</span>
              <span
                className={`font-mono text-sm sm:text-base font-bold ${
                  loan.currentDue > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formatINR(loan.currentDue)}
              </span>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-2.5">
              <span className="text-[11px] text-slate-400 block">Paid to Date</span>
              <span className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                {formatINR(loan.paidToDate)}
              </span>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-2.5">
              <span className="text-[11px] text-slate-400 block">Initial Principal</span>
              <span className="font-mono text-sm sm:text-base font-bold text-slate-300">
                {formatINR(loan.initialPrincipal)}
              </span>
            </div>
          </div>

          {/* BCA Baseline Alert if needed */}
          {bcaNeedsReset && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Loans!B2 is accumulated ({formatINR(b2RawValue!)}). Expected ₹18,000.</span>
              </div>
              <button
                onClick={handleResetBca}
                disabled={loanActionMutation.isPending}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors"
              >
                Reset B2
              </button>
            </div>
          )}
        </div>

        {/* Action Switcher Tabs */}
        <div className="grid grid-cols-5 gap-1 my-4 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-semibold">
          <button
            onClick={() => {
              setActiveTab('pay');
              setSuccessMessage(null);
            }}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'pay'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pay EMI
          </button>
          <button
            onClick={() => {
              setActiveTab('external');
              setSuccessMessage(null);
            }}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'external'
                ? 'bg-purple-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            External
          </button>
          <button
            onClick={() => {
              setActiveTab('settle');
              setSuccessMessage(null);
            }}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'settle'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Settle
          </button>
          <button
            onClick={() => {
              setActiveTab('link');
              setSuccessMessage(null);
            }}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'link'
                ? 'bg-amber-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Link Exp
          </button>
          <button
            onClick={() => {
              setActiveTab('edit');
              setSuccessMessage(null);
            }}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'edit'
                ? 'bg-slate-700 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Edit Due
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Mutation Error */}
        {loanActionMutation.isError && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{(loanActionMutation.error as Error)?.message || 'Action failed.'}</span>
          </div>
        )}

        {/* Mode 1: Log Payment (Direct from Bank Account) */}
        {activeTab === 'pay' && (
          <form onSubmit={handlePay} className="space-y-4">
            <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/20 p-3 text-xs text-indigo-300">
              <span className="font-semibold block text-indigo-200">Personal Outlay (DEBIT)</span>
              This deducts directly from your bank balance in Column E and logs a payment row into Expenses.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="3000"
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Notes / Description</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Monthly EMI / Installment for ${loan.name}`}
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loanActionMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {loanActionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Log Direct Payment to Expenses (DEBIT)</span>
            </button>
          </form>
        )}

        {/* Mode 2: External Person Pays (Crucial Feature!) */}
        {activeTab === 'external' && (
          <form onSubmit={handleExternalPayment} className="space-y-4">
            <div className="rounded-xl bg-purple-950/20 border border-purple-500/20 p-3 text-xs text-purple-300">
              <span className="font-semibold block text-purple-200">
                Third-Party Settlement (No Bank Debit!)
              </span>
              Use this when someone else (e.g. Khushboo or Bhaiya) pays this bill directly (like your SBI Credit Card).
              It is recorded as <strong className="font-mono text-purple-100">SETTLEMENT</strong> in Expenses,
              so your bank balance in Column E is <strong className="text-emerald-300">preserved intact</strong>!
            </div>

            {/* Quick Payer Select */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Who Paid this Bill?</label>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {['Khushboo', 'Bhaiya', 'Papa', 'Friend', 'Company'].map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPayer(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      payer === p
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                placeholder="Payer Name"
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Date Paid</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Notes / Transaction Reference</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paid via UPI / Credit Card payment app"
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loanActionMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50"
            >
              {loanActionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              <span>Record External Payment (Bank Balance Preserved)</span>
            </button>
          </form>
        )}

        {/* Mode 3: Settle Loan in Full */}
        {activeTab === 'settle' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/20 p-3 text-xs text-emerald-300">
              <span className="font-semibold block text-emerald-200">Complete Settlement</span>
              Mark {loan.name} as fully paid off (₹0 remaining). This writes directly to cell{' '}
              <strong className="font-mono text-white">Loans!{loan.columnLetter}2</strong>.
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Current Remaining Due:</span>
                <strong className="font-mono text-rose-400 font-bold">{formatINR(loan.currentDue)}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>New Balance after Settlement:</span>
                <strong className="font-mono text-emerald-400 font-bold">₹0 (100% Cleared)</strong>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Settlement Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSettleFull}
              disabled={loanActionMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              {loanActionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              <span>Mark Fully Settled (Loans!{loan.columnLetter}2 ➔ 0)</span>
            </button>
          </div>
        )}

        {/* Mode 4: Settle from Existing Expense */}
        {activeTab === 'link' && (
          <form onSubmit={handleSettleFromExpense} className="space-y-4">
            <div className="rounded-xl bg-amber-950/20 border border-amber-500/20 p-3 text-xs text-amber-300">
              <span className="font-semibold block text-amber-200">Link Existing Transaction</span>
              Link an already-logged transaction from the Expenses ledger to this liability so there is zero duplicate debit.
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Select Recent Transaction</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-white/[0.08] bg-black/40 p-2">
                {recentExpenses.length === 0 ? (
                  <p className="text-xs text-slate-500 p-2 text-center">No recent expenses found.</p>
                ) : (
                  recentExpenses.slice(0, 15).map((e) => (
                    <button
                      key={e.rowIndex}
                      type="button"
                      onClick={() => setSelectedExpenseRow(e.rowIndex)}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        selectedExpenseRow === e.rowIndex
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                          : 'hover:bg-white/[0.04] text-slate-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-mono text-[10px] text-slate-500 mr-2">#{e.rowIndex}</span>
                        <span>{e.description}</span>
                        <span className="text-[10px] text-slate-500 block">{formatDisplayDate(e.date)}</span>
                      </div>
                      <span className="font-mono font-bold text-white whitespace-nowrap">
                        {formatINR(e.amount)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Or Enter Exact Row Number</label>
              <input
                type="number"
                value={selectedExpenseRow}
                onChange={(e) => setSelectedExpenseRow(e.target.value ? Number(e.target.value) : '')}
                placeholder="Row # (e.g. 238)"
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loanActionMutation.isPending || !selectedExpenseRow}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 disabled:opacity-50"
            >
              {loanActionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              <span>Link Row #{selectedExpenseRow || '...'} to this Loan</span>
            </button>
          </form>
        )}

        {/* Mode 5: Edit Due Amount in Sheet Directly */}
        {activeTab === 'edit' && (
          <form onSubmit={handleUpdateBaseline} className="space-y-4">
            <div className="rounded-xl bg-slate-900 border border-white/[0.08] p-3 text-xs text-slate-300">
              <span className="font-semibold block text-white">Direct Sheet Cell Sync</span>
              Modify the exact baseline / due balance stored in{' '}
              <strong className="font-mono text-indigo-300">Loans!{loan.columnLetter}2</strong> in Google Sheets.
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                New Due Value for Column {loan.columnLetter} (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={customBaseline}
                onChange={(e) => setCustomBaseline(e.target.value)}
                placeholder="18000"
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              {isBca && (
                <button
                  type="button"
                  onClick={() => setCustomBaseline(18000)}
                  className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 transition-colors"
                >
                  Set BCA True Baseline (₹18,000)
                </button>
              )}
              <button
                type="button"
                onClick={() => setCustomBaseline(0)}
                className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-emerald-400 transition-colors"
              >
                Set to ₹0
              </button>
            </div>

            <button
              type="submit"
              disabled={loanActionMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loanActionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Update Loans!{loan.columnLetter}2 in Google Sheets</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
