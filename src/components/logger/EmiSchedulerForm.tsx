'use client';

import React, { useState, useMemo } from 'react';
import { useScheduleEmi, useDeleteExpense } from '@/hooks/useFinancials';
import { useUndo } from '@/context/UndoContext';
import { formatINR } from '@/lib/date-utils';
import { formatDate } from '@/lib/format';
import { Calendar, CheckCircle, Clock, Layers, Sliders, X } from 'lucide-react';

interface EmiSchedulerFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export function EmiSchedulerForm({ onSuccess, onClose }: EmiSchedulerFormProps) {
  const [title, setTitle] = useState('MacBook Pro M-Series');
  const [monthlyAmount, setMonthlyAmount] = useState<number>(15000);
  const [months, setMonths] = useState<number>(6);
  const [startDate, setStartDate] = useState('2026-12-05');
  const [isSuccess, setIsSuccess] = useState(false);

  const scheduleMutation = useScheduleEmi();
  const deleteMutation = useDeleteExpense();
  const { pushUndo } = useUndo();

  // Generate live preview list
  const previewList = useMemo(() => {
    if (!title || !monthlyAmount || months <= 0) return [];

    const list = [];
    const start = new Date(startDate);
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const startDay = start.getDate();

    for (let i = 0; i < Math.min(months, 12); i++) {
      const d = new Date(startYear, startMonth + i, startDay);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      list.push({
        date: `${yStr}-${mStr}-${dStr}`,
        label: `${title.trim()} (EMI ${i + 1}/${months})`,
        amount: monthlyAmount,
      });
    }
    return list;
  }, [title, monthlyAmount, months, startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !monthlyAmount || months <= 0) return;

    const res = await scheduleMutation.mutateAsync({
      title: title.trim(),
      monthlyAmount,
      months,
      startDate,
      type: 'DEBIT',
    });

    if (res?.startRow && res?.count) {
      const rows = Array.from({ length: res.count }, (_, i) => res.startRow + i);
      pushUndo({
        description: `Scheduled ${res.count} installments for ${title.trim()}`,
        undo: async () => {
          for (const r of [...rows].reverse()) {
            await deleteMutation.mutateAsync(r);
          }
        },
      });
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    }, 2000);
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
        <div>
          <h3 className="text-base font-medium text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-500" />
            Multi-Month EMI & Obligation Generator
          </h3>
          <p className="text-xs tabular-nums text-zinc-400 mt-0.5">
            Generates sequential chronological installments with formula lineage defense in Column E
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-xl p-1 text-zinc-400 hover:text-white hover:bg-white/[0.05]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} data-modal-form="true" className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
              Obligation Title / Equipment
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MacBook Pro M3"
              className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
              Monthly Installment Amount (₹)
            </label>
            <input
              type="number"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(Number(e.target.value))}
              placeholder="e.g. 15000"
              className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-xs tabular-nums font-bold text-white focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
              Number of Months (Tenure N)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-xs tabular-nums text-white focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1">
              First Installment Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-xs tabular-nums text-white focus:border-amber-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Total Cost Summary */}
        <div className="p-4 rounded-xl border border-white/[0.07] bg-[#18181B] flex items-center justify-between text-xs">
          <div>
            <span className="text-zinc-400 block tabular-nums">Total Commitment (Principal Outflow)</span>
            <span className="tabular-nums text-base font-bold text-white">
              {formatINR(monthlyAmount * months)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-zinc-400 block tabular-nums">Installments Generated</span>
            <span className="tabular-nums font-bold text-amber-400">{months} records</span>
          </div>
        </div>

        {/* Live Preview List */}
        <div>
          <label className="text-xs tabular-nums font-medium text-zinc-400 block mb-2">
            Chronological Sequence Preview ({previewList.length} of {months} rows shown)
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-white/[0.07] bg-[#0B0B0C] p-3">
            {previewList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#18181B] border border-white/[0.05] tabular-nums"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 w-6">#{idx + 1}</span>
                  <span className="text-zinc-400">{formatDate(item.date)}</span>
                  <span className="text-white font-sans font-medium">{item.label}</span>
                </div>
                <span className="text-zinc-100 tabular-nums font-bold">-{formatINR(item.amount)}</span>
              </div>
            ))}
            {months > 12 && (
              <div className="text-center text-xs tabular-nums text-zinc-500 py-1">
                + {months - 12} additional sequential installments will be appended...
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.07]">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={scheduleMutation.isPending || !title || !monthlyAmount || months <= 0}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-semibold text-black shadow-md hover:bg-amber-400 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 text-black" />
                <span>Appended {months} EMIs!</span>
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" />
                <span>{scheduleMutation.isPending ? 'Generating...' : `Schedule ${months} EMIs (${formatINR(monthlyAmount * months)})`}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
