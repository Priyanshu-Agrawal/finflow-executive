'use client';

import React, { useState } from 'react';
import { ExpenseEntry, TransactionType } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { Lock, Save, X } from 'lucide-react';
import { useUpdateExpense } from '@/hooks/useFinancials';

interface EditExpenseModalProps {
  entry: ExpenseEntry;
  onClose: () => void;
}

export function EditExpenseModal({ entry, onClose }: EditExpenseModalProps) {
  const [date, setDate] = useState(entry.date);
  const [description, setDescription] = useState(entry.description);
  const [amount, setAmount] = useState(entry.amount);
  const [type, setType] = useState<TransactionType>(entry.type);

  const updateMutation = useUpdateExpense();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      rowIndex: entry.rowIndex,
      data: {
        date,
        description,
        amount: Number(amount),
        type,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">
              Edit Transaction (Row {entry.rowIndex})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Columns A–D are editable. Column E formula is protected.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. Essence Salary, Bike EMI"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Transaction Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="DEBIT">DEBIT</option>
                <option value="CREDIT">CREDIT</option>
                <option value="SETTLEMENT">SETTLEMENT</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
                <option value="OTHER">OTHER</option>
                <option value="DIRECT">DIRECT</option>
              </select>
            </div>
          </div>

          {/* Column E Formula Protection Box */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-400" />
                Column E (Remaining Balance) — Protected Formula
              </span>
              <span className="font-mono text-white font-bold">
                {formatINR(entry.balance)}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800 break-all">
              {entry.formula || `=IF(OR(D${entry.rowIndex}="", ...), E${entry.rowIndex-1}, ...)`}
            </div>
            <p className="text-[10px] text-slate-500">
              Formula Lineage Defense: FinFlow automatically preserves continuation formulas. Static numbers are never written.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
