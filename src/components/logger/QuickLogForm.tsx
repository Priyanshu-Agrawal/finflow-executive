'use client';

import React, { useState, useEffect } from 'react';
import { TransactionType } from '@/lib/types';
import { useLogExpense } from '@/hooks/useFinancials';
import {
  Check,
  Coffee,
  Fuel,
  Lightbulb,
  Plus,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  Wallet,
  Zap,
  Bookmark,
  Calendar,
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

export function QuickLogForm({ onSuccess, defaultDate = '2026-11-10' }: QuickLogFormProps) {
  const [date, setDate] = useState(defaultDate);
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
  const [newPresetCategory, setNewPresetCategory] = useState<CustomPreset['category']>('General');

  const logMutation = useLogExpense();

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

  const handleCreateNewPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetLabel.trim() || !newPresetAmount || Number(newPresetAmount) <= 0) return;

    const newPreset: CustomPreset = {
      id: Date.now().toString(),
      label: newPresetLabel.trim(),
      amount: Number(newPresetAmount),
      type: newPresetType,
      category: newPresetCategory,
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

  // Quick Amount incremental adders
  const handleAddAmount = (delta: number) => {
    setAmount((prev) => (Number(prev) || 0) + delta);
  };

  const setDatePreset = (p: 'today' | 'nov10' | 'yesterday') => {
    if (p === 'nov10') {
      setDate('2026-11-10');
    } else if (p === 'today') {
      const today = new Date();
      setDate(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
          today.getDate()
        ).padStart(2, '0')}`
      );
    } else if (p === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setDate(
        `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(
          yesterday.getDate()
        ).padStart(2, '0')}`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (!description.trim() || !amount || Number(amount) <= 0) return;

    const loggedDesc = description.trim();
    const loggedAmt = Number(amount);

    await logMutation.mutateAsync({
      date,
      description: loggedDesc,
      amount: loggedAmt,
      type,
    });

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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-4 gap-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-400" />
            Quick Daily Log & Custom Expense Creator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Appends directly to Expenses sheet • Formula Lineage Defense ensures Column E is 100% dynamic
          </p>
        </div>
        {justLogged && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-in fade-in">
            <Check className="h-4 w-4" />
            {logSuccessMessage || 'Saved to Google Sheets!'}
          </span>
        )}
      </div>

      {/* Preset Custom Items Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-indigo-400" />
            Fast-Log Chips (1-Tap Fill)
          </label>
          <button
            type="button"
            onClick={() => setIsAddingCustomPreset(!isAddingCustomPreset)}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="h-3 w-3" />
            {isAddingCustomPreset ? 'Cancel' : 'Add Custom Item'}
          </button>
        </div>

        {/* Custom Preset Creation Form */}
        {isAddingCustomPreset && (
          <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 mb-3 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">Create New Custom Fast-Log Chip</span>
              <span className="text-[10px] text-slate-400">Stored in your browser for 1-tap logging</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="Item Name (e.g. Swiggy, Gym, Chai)"
                value={newPresetLabel}
                onChange={(e) => setNewPresetLabel(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Default Amount (₹)"
                value={newPresetAmount}
                onChange={(e) => setNewPresetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={newPresetType}
                  onChange={(e) => setNewPresetType(e.target.value as TransactionType)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="DEBIT">DEBIT</option>
                  <option value="CREDIT">CREDIT</option>
                  <option value="SETTLEMENT">SETTLEMENT</option>
                </select>
                <button
                  type="button"
                  onClick={handleCreateNewPreset}
                  disabled={!newPresetLabel.trim() || !newPresetAmount}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
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
                className={`shrink-0 group flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.08]'
                }`}
              >
                <span>{preset.label}</span>
                <span className="font-mono text-[11px] opacity-80">
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
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3 sm:space-y-3.5">
        {/* Date Selector Row */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">Transaction Date</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDatePreset('nov10')}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                  date === '2026-11-10'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                10 Nov (Anchor)
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('today')}
                className="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('yesterday')}
                className="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              >
                Yesterday
              </button>
            </div>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm sm:text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>

        {/* Description & Custom Name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">Description / Item Name</label>
            {description && (
              <button
                type="button"
                onClick={handleSaveCurrentAsPreset}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                title="Save current item and amount as a custom preset chip"
              >
                <Sparkles className="h-3 w-3" />
                <span>Save as Custom Chip</span>
              </button>
            )}
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type any custom item e.g. Swiggy Lunch, Gym Fee, Chai, Petrol..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm sm:text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>

        {/* Amount & Quick Increments */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Transaction Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm sm:text-xs">₹</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3.5 py-2.5 text-sm sm:text-xs font-mono font-bold text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          {/* Quick Amount Pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-slate-400 mr-1">Quick Add:</span>
            {[50, 100, 200, 500, 1000, 2500].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleAddAmount(delta)}
                className="rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 px-2 py-1 text-[11px] font-mono text-slate-200 transition-colors"
              >
                +{delta}
              </button>
            ))}
            {amount !== '' && (
              <button
                type="button"
                onClick={() => setAmount('')}
                className="rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 px-2 py-1 text-[10px] text-rose-300 transition-colors ml-auto"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transaction Type Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
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
                  className={`rounded-xl py-2.5 text-xs font-bold border transition-all ${
                    isSelected
                      ? t === 'DEBIT'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : t === 'CREDIT'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                        : 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-white/[0.08] grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={logMutation.isPending || !description.trim() || !amount}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-50"
          >
            Add Another
          </button>

          <button
            type="submit"
            disabled={logMutation.isPending || !description.trim() || !amount}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all disabled:opacity-50"
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
