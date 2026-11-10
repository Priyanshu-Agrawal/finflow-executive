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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-[rgba(246,239,227,0.1)] bg-[#161310] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#514535]/30">
          <div>
            <h3 className="text-base font-serif font-bold text-[#e9e1db]">
              Edit Transaction (Row {entry.rowIndex})
            </h3>
            <p className="text-xs text-[#9e8e7c] mt-0.5 font-mono">
              Columns A–D are editable. Column E dynamic formula is strictly preserved.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#9e8e7c] hover:text-[#e9e1db] hover:bg-[#1e1b18] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono font-medium text-[#d6c4af] block mb-1">
              Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 text-sm font-mono text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-xs font-mono font-medium text-[#d6c4af] block mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 text-sm text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none transition-colors"
              placeholder="e.g. Essence Salary, Bike EMI"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono font-medium text-[#d6c4af] block mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 text-sm font-serif font-bold text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs font-mono font-medium text-[#d6c4af] block mb-1">
                Transaction Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-3 py-2 text-sm text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none transition-colors"
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
          <div className="rounded-xl border border-[#f0a93c]/30 bg-[#f0a93c]/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#ffc981] flex items-center gap-1.5 font-mono">
                <Lock className="h-3.5 w-3.5 text-[#f0a93c]" />
                Column E (Remaining Balance) — Protected Formula
              </span>
              <span className="font-serif font-bold text-[#e9e1db]">
                {formatINR(entry.balance)}
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#ffc981] bg-[#110e0b]/80 p-2 rounded-lg border border-[#514535]/40 break-all">
              {entry.formula || `=IF(OR(D${entry.rowIndex}="", ...), E${entry.rowIndex-1}, ...)`}
            </div>
            <p className="text-[10px] text-[#9e8e7c]">
              Formula Lineage Defense: FinFlow automatically preserves continuation formulas. Static numbers are never written.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#514535]/30">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-[#9e8e7c] hover:text-[#e9e1db] hover:bg-[#1e1b18] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f0a93c] to-[#edbf70] px-4 py-2 text-xs font-bold text-[#161310] hover:brightness-110 shadow-sm transition-all disabled:opacity-50 active:scale-95"
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
