'use client';

import React, { useState, useEffect } from 'react';
import { TransactionType } from '@/lib/types';
import { useLogExpense, useDeleteExpense } from '@/hooks/useFinancials';
import { useUndo } from '@/context/UndoContext';
import { useFrame } from '@/components/layout/FrameContext';
import { anchorRowFor } from '@/lib/anchor';
import { formatDateShort } from '@/lib/format';
import {
  Bookmark,
  Check,
  Plus,
  PlusCircle,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { formatINR } from '@/lib/date-utils';

export interface CustomPreset {
  id: string;
  label: string;
  amount: number;
  type: TransactionType;
  category: 'General' | 'Electricity' | 'Subscriptions' | 'Vehicle' | 'Food' | 'Other';
}

const DEFAULT_PRESETS: CustomPreset[] = [
  { id: '1', label: 'General Expenses', amount: 1000, type: 'DEBIT', category: 'General' },
  { id: '2', label: 'Food & Dining', amount: 500, type: 'DEBIT', category: 'Food' },
  { id: '3', label: 'Electricity Recharge', amount: 500, type: 'DEBIT', category: 'Electricity' },
  { id: '4', label: 'Bike Petrol', amount: 300, type: 'DEBIT', category: 'Vehicle' },
  { id: '5', label: 'Chai & Snacks', amount: 50, type: 'DEBIT', category: 'Food' },
  { id: '6', label: 'Tech & AI Tooling', amount: 1000, type: 'DEBIT', category: 'Subscriptions' },
];

interface QuickLogFormProps {
  onSuccess?: () => void;
  defaultDate?: string;
}

export function QuickLogForm({ onSuccess, defaultDate }: QuickLogFormProps) {
  const { data, isOnline } = useFrame();
  const [submitError, setSubmitError] = useState('');
  const todayIso = new Date().toLocaleDateString('en-CA');
  const [date, setDate] = useState(defaultDate ?? todayIso);
  // The last day that has a logged row, from the sheet (a shortcut next to Today and Yesterday).
  const lastLogged = data ? anchorRowFor(data.expenses, todayIso)?.date : undefined;
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<TransactionType>('DEBIT');
  const [justLogged, setJustLogged] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState('');

  // Custom user presets stored in localStorage
  const [presets, setPresets] = useState<CustomPreset[]>(DEFAULT_PRESETS);
  const [isAddingCustomPreset, setIsAddingCustomPreset] = useState(false);
  const [newPresetLabel, setNewPresetLabel] = useState('');
  const [newPresetAmount, setNewPresetAmount] = useState<number | ''>('');
  const [newPresetType, setNewPresetType] = useState<TransactionType>('DEBIT');

  const logMutation = useLogExpense();
  const deleteMutation = useDeleteExpense();
  const { pushUndo } = useUndo();

  // Load user presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('finflow_custom_presets_v2');
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch {
      // Fallback to defaults
    }
  }, []);

  const savePresets = (newPresets: CustomPreset[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem('finflow_custom_presets_v2', JSON.stringify(newPresets));
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleSelectPreset = (preset: CustomPreset) => {
    setDescription(preset.label);
    setAmount(preset.amount);
    setType(preset.type);
  };

  const handleSaveCurrentAsPreset = () => {
    if (!description.trim() || !amount || Number(amount) <= 0) return;
    const newPreset: CustomPreset = {
      id: Date.now().toString(),
      label: description.trim(),
      amount: Number(amount),
      type,
      category: 'General',
    };
    savePresets([newPreset, ...presets]);
    setIsAddingCustomPreset(false);
  };

  const handleCreateNewPreset = () => {
    if (!newPresetLabel.trim() || !newPresetAmount || Number(newPresetAmount) <= 0) return;
    const newPreset: CustomPreset = {
      id: Date.now().toString(),
      label: newPresetLabel.trim(),
      amount: Number(newPresetAmount),
      type: newPresetType,
      category: 'General',
    };
    savePresets([newPreset, ...presets]);
    setNewPresetLabel('');
    setNewPresetAmount('');
    setIsAddingCustomPreset(false);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    savePresets(presets.filter((p) => p.id !== id));
  };

  const handleAddAmount = (increment: number) => {
    const current = Number(amount) || 0;
    setAmount(current + increment);
  };

  const setDatePreset = (preset: 'today' | 'yesterday' | 'lastLogged') => {
    if (preset === 'lastLogged') {
      if (lastLogged) setDate(lastLogged);
      return;
    }
    const d = new Date();
    if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    setDate(`${yStr}-${mStr}-${dStr}`);
  };

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (!description.trim() || !amount || Number(amount) <= 0) return;
    if (!isOnline) {
      setSubmitError("You're offline — reconnect to log a transaction.");
      return;
    }

    const loggedDesc = description.trim();
    const loggedAmt = Number(amount);
    setSubmitError('');

    let res;
    try {
      res = await logMutation.mutateAsync({
        date,
        description: loggedDesc,
        amount: loggedAmt,
        type,
      });
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : 'Could not save this to the sheet. Nothing was logged — try again.');
      return;
    }

    if (res?.newRow) {
      const createdRow = res.newRow;
      pushUndo({
        description: `Logged: ${loggedDesc} (${formatINR(loggedAmt)}) at Row ${createdRow}`,
        undo: async () => {
          await deleteMutation.mutateAsync(createdRow);
        },
      });
    }

    setLogSuccessMessage(`Logged: ${loggedDesc} (${formatINR(loggedAmt)})`);
    setJustLogged(true);

    if (!keepOpen) {
      setDescription('');
      setAmount('');
      if (onSuccess) onSuccess();
    } else {
      setAmount('');
    }

    setTimeout(() => {
      setJustLogged(false);
      setLogSuccessMessage('');
    }, 4000);
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-4 sm:p-6 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.07] gap-2">
        <div>
          <h3 className="text-base font-medium text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Log a transaction
          </h3>
          <p className="text-xs tabular-nums text-zinc-400 mt-0.5">
            Adds a row to your Expenses sheet. The balance formulas are kept.
          </p>
        </div>
        {justLogged && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 animate-in fade-in">
            <Check className="h-4 w-4" />
            {logSuccessMessage || 'Saved to Google Sheets!'}
          </span>
        )}
      </div>

      {!isOnline && (
        <p role="status" className="text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
          You&apos;re offline — reconnect to log a transaction.
        </p>
      )}
      {submitError && (
        <p role="alert" className="text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
          {submitError}
        </p>
      )}

      {/* Preset Custom Items Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs tabular-nums font-medium text-zinc-400 flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-amber-500" />
            Fast-Log Chips (1-Tap Fill)
          </label>
          <button
            type="button"
            onClick={() => setIsAddingCustomPreset(!isAddingCustomPreset)}
            className="flex min-h-11 sm:min-h-0 items-center gap-1 text-xs font-medium text-amber-400 hover:underline transition-colors"
          >
            <Plus className="h-3 w-3" />
            {isAddingCustomPreset ? 'Cancel' : 'Add Custom Item'}
          </button>
        </div>

        {/* Custom Preset Creation Form */}
        {isAddingCustomPreset && (
          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 mb-3 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400">Create New Custom Fast-Log Chip</span>
              <span className="text-xs text-zinc-400">Stored in your browser for 1-tap logging</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="Item Name (e.g. Swiggy, Gym, Chai)"
                value={newPresetLabel}
                onChange={(e) => setNewPresetLabel(e.target.value)}
                className="rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Default Amount (₹)"
                value={newPresetAmount}
                onChange={(e) => setNewPresetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="rounded-xl border border-white/[0.07] bg-[#18181B] px-3 py-2 text-xs tabular-nums text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={newPresetType}
                  onChange={(e) => setNewPresetType(e.target.value as TransactionType)}
                  className="flex-1 rounded-xl border border-white/[0.07] bg-[#18181B] px-2.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="DEBIT">DEBIT</option>
                  <option value="CREDIT">CREDIT</option>
                  <option value="SETTLEMENT">SETTLEMENT</option>
                </select>
                <button
                  type="button"
                  onClick={handleCreateNewPreset}
                  disabled={!newPresetLabel.trim() || !newPresetAmount}
                  className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preset Chips Horizontal Scroll Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {presets.map((preset) => {
            const isSelected = description === preset.label;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`shrink-0 group flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-500 font-semibold shadow-sm'
                    : 'bg-[#18181B] text-zinc-300 border-white/[0.07] hover:border-amber-500/30 hover:text-white'
                }`}
              >
                <span>{preset.label}</span>
                <span className="tabular-nums text-xs opacity-80">
                  {formatINR(preset.amount)}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
                  title="Delete chip"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Logging Form */}
      <form onSubmit={(e) => handleSubmit(e, false)} data-modal-form="true" className="space-y-3.5">
        {/* Date Selector Row */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs tabular-nums font-medium text-zinc-300">Transaction Date</label>
            <div className="flex items-center gap-1">
              {lastLogged && lastLogged !== todayIso && (
                <button
                  type="button"
                  onClick={() => setDatePreset('lastLogged')}
                  className={`min-h-11 sm:min-h-0 rounded-lg px-2 py-0.5 text-xs font-medium border transition-all ${
                    date === lastLogged
                      ? 'bg-amber-500 text-black border-amber-500 font-semibold'
                      : 'bg-[#18181B] text-zinc-400 border-white/[0.07] hover:text-white'
                  }`}
                >
                  Last logged ({formatDateShort(lastLogged)})
                </button>
              )}
              <button
                type="button"
                onClick={() => setDatePreset('today')}
                className="min-h-11 sm:min-h-0 rounded-lg px-2 py-0.5 text-xs font-medium bg-[#18181B] text-zinc-400 border border-white/[0.07] hover:text-white"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('yesterday')}
                className="min-h-11 sm:min-h-0 rounded-lg px-2 py-0.5 text-xs font-medium bg-[#18181B] text-zinc-400 border border-white/[0.07] hover:text-white"
              >
                Yesterday
              </button>
            </div>
          </div>
          <input
            type="date"
            aria-label="Transaction date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3.5 py-2.5 min-h-11 text-sm sm:text-xs tabular-nums text-white focus:border-amber-500 focus:outline-none transition-colors"
            required
          />
        </div>

        {/* Description & Custom Name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs tabular-nums font-medium text-zinc-300">Description / Item Name</label>
            {description && (
              <button
                type="button"
                onClick={handleSaveCurrentAsPreset}
                className="flex items-center gap-1 text-xs text-amber-400 hover:underline"
                title="Save current item and amount as a custom preset chip"
              >
                <Sparkles className="h-3 w-3" />
                <span>Save as Custom Chip</span>
              </button>
            )}
          </div>
          <input
            type="text"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type any custom item e.g. Swiggy Lunch, Gym Fee, Chai, Petrol..."
            className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] px-3.5 py-2.5 min-h-11 text-sm sm:text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
            required
          />
        </div>

        {/* Amount & Quick Increments */}
        <div>
          <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1.5">
            Transaction Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-zinc-500 tabular-nums text-sm sm:text-xs">₹</span>
            <input
              type="number"
              step="0.01"
              aria-label="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full rounded-xl border border-white/[0.07] bg-[#18181B] pl-8 pr-3.5 py-2.5 min-h-11 text-sm sm:text-xs tabular-nums font-bold text-white focus:border-amber-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Quick Amount Pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-zinc-500 mr-1 tabular-nums">Quick Add:</span>
            {[50, 100, 200, 500, 1000, 2500].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleAddAmount(delta)}
                className="rounded-lg bg-[#18181B] hover:border-amber-500/40 border border-white/[0.07] px-2 py-1 min-h-11 sm:min-h-0 text-xs tabular-nums text-zinc-300 hover:text-white transition-colors"
              >
                +{delta}
              </button>
            ))}
            {amount !== '' && (
              <button
                type="button"
                onClick={() => setAmount('')}
                className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-1 min-h-11 sm:min-h-0 text-xs text-rose-400 transition-colors ml-auto"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transaction Type Selector */}
        <div>
          <label className="text-xs tabular-nums font-medium text-zinc-300 block mb-1.5">
            Transaction Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['DEBIT', 'CREDIT', 'SETTLEMENT'] as TransactionType[]).map((t) => {
              const isSelected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-xl py-2.5 min-h-11 text-xs font-medium border transition-all ${
                    isSelected
                      ? t === 'DEBIT'
                        ? 'bg-white/10 text-white border-white/30 shadow-sm'
                        : t === 'CREDIT'
                        ? 'bg-credit/10 text-credit border-credit/30 shadow-sm'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm'
                      : 'bg-[#18181B] text-zinc-400 border-white/[0.07] hover:border-white/20 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-white/[0.07] grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={logMutation.isPending || !description.trim() || !amount || !isOnline}
            className="rounded-xl border border-white/[0.07] bg-[#18181B] py-2.5 min-h-11 text-xs font-medium text-zinc-300 hover:text-white hover:border-amber-500/40 transition-all disabled:opacity-50"
          >
            Add Another
          </button>

          <button
            type="submit"
            disabled={logMutation.isPending || !description.trim() || !amount || !isOnline}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-semibold text-black shadow-md hover:bg-amber-400 transition-all disabled:opacity-50 active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>
              {logMutation.isPending
                ? 'Writing...'
                : `Save ${type} (${formatINR(Number(amount) || 0)})`}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
