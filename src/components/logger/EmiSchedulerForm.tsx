'use client';

import React, { useState, useMemo } from 'react';
import { useScheduleEmi } from '@/hooks/useFinancials';
import { formatINR } from '@/lib/date-utils';
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

    await scheduleMutation.mutateAsync({
      title: title.trim(),
      monthlyAmount,
      months,
      startDate,
      type: 'DEBIT',
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    }, 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-400" />
            Multi-Month EMI & Obligation Generator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Generates $N$ distinct chronological installments with formula lineage preservation in Column E
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Obligation Title / Equipment
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MacBook Pro M3"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Monthly Installment Amount (₹)
            </label>
            <input
              type="number"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(Number(e.target.value))}
              placeholder="e.g. 15000"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Number of Months (Tenure N)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              First Installment Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Total Cost Summary */}
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block">Total Commitment (Principal Outflow)</span>
            <span className="font-mono text-base font-bold text-white">
              {formatINR(monthlyAmount * months)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">Installments Generated</span>
            <span className="font-mono font-bold text-indigo-300">{months} records</span>
          </div>
        </div>

        {/* Live Preview List */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Chronological Sequence Preview ({previewList.length} of {months} rows shown)
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            {previewList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800/60 font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 w-6">#{idx + 1}</span>
                  <span className="text-slate-300">{item.date}</span>
                  <span className="text-white font-sans font-medium">{item.label}</span>
                </div>
                <span className="text-rose-400 font-bold">-{formatINR(item.amount)}</span>
              </div>
            ))}
            {months > 12 && (
              <div className="text-center text-[11px] text-slate-500 py-1">
                + {months - 12} additional sequential installments will be appended...
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={scheduleMutation.isPending || !title || !monthlyAmount || months <= 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-400 transition-all disabled:opacity-50"
          >
            {isSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-300" />
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
