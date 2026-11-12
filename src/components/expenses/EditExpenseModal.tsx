'use client';

import React, { useState } from 'react';
import { ExpenseEntry, TransactionType } from '@/lib/types';
import { formatINR } from '@/lib/date-utils';
import { Lock, Save, X } from 'lucide-react';
import { useUpdateExpense } from '@/hooks/useFinancials';
import { useUndo } from '@/context/UndoContext';

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
  const { pushUndo } = useUndo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prevData = {
      date: entry.date,
      description: entry.description,
      amount: entry.amount,
      type: entry.type,
    };
    const newAmount = Number(amount);

    await updateMutation.mutateAsync({
      rowIndex: entry.rowIndex,
      data: {
        date,
        description,
        amount: newAmount,
        type,
      },
    });

    pushUndo({
      description: `Edited Row ${entry.rowIndex}: ${description} (${formatINR(newAmount)})`,
      undo: async () => {
        await updateMutation.mutateAsync({
          rowIndex: entry.rowIndex,
          data: prevData,
        });
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.07] bg-[#121214] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
          <div>
            <h3 className="text-base font-medium text-white">
              Edit Transaction (Row {entry.rowIndex})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
              Columns A–D are editable. Column E dynamic formula is strictly preserved.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} data-modal-form="true" className="space-y-4">
          <div>
            <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
              Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-sm tabular-nums text-white focus:border-amber-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="e.g. Essence Salary, Bike EMI"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-sm tabular-nums font-bold text-white focus:border-amber-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
                Transaction Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors"
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
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-amber-400 flex items-center gap-1.5 tabular-nums">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                Column E (Remaining Balance) — Protected Formula
              </span>
              <span className="tabular-nums font-bold text-white">
                {formatINR(entry.balance)}
              </span>
            </div>
            <div className="tabular-nums text-xs text-amber-400 bg-black/60 p-2 rounded-lg border border-white/[0.07] break-all">
              {entry.formula || `=IF(OR(D${entry.rowIndex}="", ...), E${entry.rowIndex-1}, ...)`}
            </div>
            <p className="text-xs text-zinc-400">
              The balance formula in column E is kept. Only date, description, amount and type are changed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 shadow-sm transition-all disabled:opacity-50 active:scale-95"
            >
              <Save className="h-4 w-4" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save & Preserve Formulas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
