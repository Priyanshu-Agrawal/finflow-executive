'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ExpenseEntry, TransactionType } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Edit2,
  Filter,
  History,
  Lock,
  MoreVertical,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import { useDeleteExpense, useLogExpense, useToggleType } from '@/hooks/useFinancials';
import { EditExpenseModal } from './EditExpenseModal';

interface ExpenseTableProps {
  expenses: ExpenseEntry[];
  referenceDate: string;
}

function getMonthOffsetDate(baseDateStr: string, offsetMonths: number): string {
  try {
    const parts = baseDateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1 + offsetMonths, parts[2]);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return baseDateStr;
  }
}

export function ExpenseTable({ expenses, referenceDate }: ExpenseTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);

  // Rolling Window Controls
  // 1 month past cutoff (e.g. 2026-10-10)
  const pastCutoff = useMemo(() => getMonthOffsetDate(referenceDate, -1), [referenceDate]);
  // 2 months future cutoff (e.g. 2027-01-10)
  const futureCutoff = useMemo(() => getMonthOffsetDate(referenceDate, 2), [referenceDate]);

  const [isWindowFilterActive, setIsWindowFilterActive] = useState<boolean>(true);
  const [showEarlier, setShowEarlier] = useState<boolean>(false);
  const [showFuture, setShowFuture] = useState<boolean>(false);

  const nearestRowRef = useRef<HTMLTableRowElement | null>(null);

  const toggleTypeMutation = useToggleType();
  const deleteMutation = useDeleteExpense();
  const logMutation = useLogExpense();

  // Find the transaction nearest to referenceDate
  const nearestEntry = useMemo(() => {
    if (expenses.length === 0) return null;
    const targetTime = new Date(referenceDate).getTime();
    let closest = expenses[0];
    let minDiff = Infinity;
    for (const e of expenses) {
      const diff = Math.abs(new Date(e.date).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = e;
      }
    }
    return closest;
  }, [expenses, referenceDate]);

  // Base filtered by search and type
  const baseFilteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.date.includes(searchQuery) ||
        String(e.rowIndex) === searchQuery;

      const matchesType = selectedType === 'ALL' || e.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [expenses, searchQuery, selectedType]);

  // Window segmentation counts
  const earlierCount = useMemo(() => {
    return baseFilteredExpenses.filter((e) => e.date < pastCutoff).length;
  }, [baseFilteredExpenses, pastCutoff]);

  const futureCount = useMemo(() => {
    return baseFilteredExpenses.filter((e) => e.date > futureCutoff).length;
  }, [baseFilteredExpenses, futureCutoff]);

  const windowCount = useMemo(() => {
    return baseFilteredExpenses.filter((e) => e.date >= pastCutoff && e.date <= futureCutoff).length;
  }, [baseFilteredExpenses, pastCutoff, futureCutoff]);

  // Effective visible expenses after applying rolling window settings
  const visibleExpenses = useMemo(() => {
    if (!isWindowFilterActive) {
      return baseFilteredExpenses;
    }

    return baseFilteredExpenses.filter((e) => {
      if (!showEarlier && e.date < pastCutoff) return false;
      if (!showFuture && e.date > futureCutoff) return false;
      return true;
    });
  }, [baseFilteredExpenses, isWindowFilterActive, showEarlier, showFuture, pastCutoff, futureCutoff]);

  // Pagination slice
  const totalPages = Math.ceil(visibleExpenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleExpenses.slice(start, start + pageSize);
  }, [visibleExpenses, currentPage, pageSize]);

  // Automatically switch page on mount to focus nearest entry if needed
  useEffect(() => {
    if (!nearestEntry) return;
    const idx = visibleExpenses.findIndex((e) => e.rowIndex === nearestEntry.rowIndex);
    if (idx !== -1) {
      const targetPage = Math.floor(idx / pageSize) + 1;
      setCurrentPage(targetPage);
    }
  }, [nearestEntry, visibleExpenses, pageSize]);

  // Jump to Nearest Row handler
  const handleJumpToNearest = () => {
    if (!nearestEntry) return;
    const idx = visibleExpenses.findIndex((e) => e.rowIndex === nearestEntry.rowIndex);
    if (idx !== -1) {
      const targetPage = Math.floor(idx / pageSize) + 1;
      setCurrentPage(targetPage);
      setTimeout(() => {
        nearestRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      // If outside visible window, temporarily disable window filter to show it
      setIsWindowFilterActive(false);
      setTimeout(() => {
        nearestRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  };

  // Handle 1-Click Type cycle: DEBIT -> CREDIT -> SETTLEMENT -> DEBIT
  const handleCycleType = (entry: ExpenseEntry) => {
    const cycleMap: Record<TransactionType, TransactionType> = {
      DEBIT: 'CREDIT',
      CREDIT: 'SETTLEMENT',
      SETTLEMENT: 'DEBIT',
      ADJUSTMENT: 'DEBIT',
      OTHER: 'DEBIT',
      DIRECT: 'DEBIT',
    };
    const nextType = cycleMap[entry.type] || 'DEBIT';
    toggleTypeMutation.mutate({
      rowIndex: entry.rowIndex,
      newType: nextType,
    });
  };

  // Handle Clone
  const handleClone = async (entry: ExpenseEntry) => {
    await logMutation.mutateAsync({
      date: entry.date,
      description: `${entry.description} (Copy)`,
      amount: entry.amount,
      type: entry.type,
    });
  };

  // Handle Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (
      confirm(
        `Are you sure you want to delete ${selectedRows.length} selected row(s)? Google Sheets will re-index downstream formulas.`
      )
    ) {
      const sorted = [...selectedRows].sort((a, b) => b - a);
      for (const r of sorted) {
        await deleteMutation.mutateAsync(r);
      }
      setSelectedRows([]);
    }
  };

  const toggleSelectRow = (rowIndex: number) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex) ? prev.filter((r) => r !== rowIndex) : [...prev, rowIndex]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedExpenses.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedExpenses.map((e) => e.rowIndex));
    }
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#0c0e14] p-4 sm:p-6 shadow-xl space-y-4">
      {/* Top Controls & Rolling Scope Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
              LEDGER MASTER
            </span>
            <span className="text-xs text-slate-400">Google Sheets Tab 'Expenses' (A1:E314+)</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
            Transactions & Formula Lineage Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Default focus anchored to <strong className="text-emerald-400">{formatDisplayDate(referenceDate)}</strong>.
            Showing 1 month prior ({formatDisplayDate(pastCutoff)}) to 2 months future ({formatDisplayDate(futureCutoff)}).
          </p>
        </div>

        {/* Action Pills & Focus Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleJumpToNearest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all shadow-sm"
            title="Focus row nearest to today's date"
          >
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span>Focus Today / Nearest</span>
          </button>

          {/* Rolling Window Scope Switcher */}
          <div className="flex items-center rounded-xl bg-white/[0.04] p-1 border border-white/[0.06] text-xs">
            <button
              onClick={() => {
                setIsWindowFilterActive(true);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                isWindowFilterActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rolling Focus
            </button>
            <button
              onClick={() => {
                setIsWindowFilterActive(false);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                !isWindowFilterActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({expenses.length})
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search description, date, or row #..."
              className="w-full rounded-xl border border-white/[0.08] bg-black/40 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 p-1">
            {['ALL', 'DEBIT', 'CREDIT', 'SETTLEMENT'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedType(t);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedType === t
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Bulk Delete Button */}
          {selectedRows.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete ({selectedRows.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Earlier Transactions Collapsible Banner */}
      {isWindowFilterActive && earlierCount > 0 && (
        <div>
          {!showEarlier ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <History className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>
                  <strong className="text-white font-mono">{earlierCount}</strong> earlier transactions before{' '}
                  <strong className="text-slate-300">{formatDisplayDate(pastCutoff)}</strong> hidden to maintain immediate focus
                </span>
              </div>
              <button
                onClick={() => setShowEarlier(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs border border-indigo-500/30 transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Load Earlier ({earlierCount})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300">
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-indigo-400" />
                Showing {earlierCount} earlier transactions before {formatDisplayDate(pastCutoff)}
              </span>
              <button
                onClick={() => setShowEarlier(false)}
                className="text-xs text-indigo-400 hover:text-white underline font-semibold"
              >
                Collapse Earlier
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0c0e14] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    paginatedExpenses.length > 0 &&
                    selectedRows.length === paginatedExpenses.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                />
              </th>
              <th className="py-3 px-2 w-14 font-mono text-slate-500"># Row</th>
              <th className="py-3 px-3 w-32">Date</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-3 text-center">Type (Click)</th>
              <th className="py-3 px-4 text-right">
                <span className="flex items-center justify-end gap-1">
                  <Lock className="h-3 w-3 text-indigo-400" />
                  Balance (E)
                </span>
              </th>
              <th className="py-3 px-3 w-28 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] bg-slate-900/20 font-medium">
            {paginatedExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  No transactions match your search and filter criteria.
                </td>
              </tr>
            ) : (
              paginatedExpenses.map((entry) => {
                const isSelected = selectedRows.includes(entry.rowIndex);
                const isCredit = entry.type === 'CREDIT';
                const isSettlement = entry.type === 'SETTLEMENT';
                const isDebit = entry.type === 'DEBIT';
                const isNearest = nearestEntry?.rowIndex === entry.rowIndex;

                return (
                  <tr
                    key={entry.rowIndex}
                    ref={isNearest ? nearestRowRef : undefined}
                    className={`transition-colors ${
                      isNearest
                        ? 'bg-emerald-500/[0.08] border-l-4 border-l-emerald-500'
                        : isSelected
                        ? 'bg-indigo-950/40'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(entry.rowIndex)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                    </td>

                    {/* Row Index */}
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500">
                      #{entry.rowIndex}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-300">{formatDisplayDate(entry.date)}</span>
                        {isNearest && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300 border border-emerald-500/30 shrink-0">
                            ANCHOR
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-2.5 px-4 text-white font-medium max-w-xs truncate" title={entry.description}>
                      <span className={entry.description.startsWith('[External') ? 'text-purple-300 font-semibold' : ''}>
                        {entry.description}
                      </span>
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        isCredit
                          ? 'text-emerald-400'
                          : isSettlement
                          ? 'text-purple-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {isCredit ? '+' : isDebit ? '-' : ''}
                      {formatINR(entry.amount)}
                    </td>

                    {/* Type Toggle Button */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleCycleType(entry)}
                        disabled={toggleTypeMutation.isPending}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 ${
                          isCredit
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isSettlement
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                        title="Click to toggle type: DEBIT ➔ CREDIT ➔ SETTLEMENT"
                      >
                        {entry.type}
                      </button>
                    </td>

                    {/* Balance (Column E) */}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-300 whitespace-nowrap">
                      {formatINR(entry.balance)}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                          title="Edit Transaction (Columns A-D)"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleClone(entry)}
                          disabled={logMutation.isPending}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                          title="Duplicate Transaction"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Delete Row ${entry.rowIndex} (${entry.description} - ${formatINR(entry.amount)})? Google Sheets formulas will re-index downstream.`
                              )
                            ) {
                              deleteMutation.mutate(entry.rowIndex);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/[0.08] transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Further Projections Collapsible Banner */}
      {isWindowFilterActive && futureCount > 0 && (
        <div>
          {!showFuture ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-white font-mono">{futureCount}</strong> long-term projections beyond{' '}
                  <strong className="text-slate-300">{formatDisplayDate(futureCutoff)}</strong> hidden
                </span>
              </div>
              <button
                onClick={() => setShowFuture(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold text-xs border border-emerald-500/30 transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Load Further Projections ({futureCount})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                Showing all {futureCount} projections beyond {formatDisplayDate(futureCutoff)}
              </span>
              <button
                onClick={() => setShowFuture(false)}
                className="text-xs text-emerald-400 hover:text-white underline font-semibold"
              >
                Collapse Future Projections
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Showing{' '}
          <strong className="text-white">
            {visibleExpenses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong className="text-white">
            {Math.min(currentPage * pageSize, visibleExpenses.length)}
          </strong>{' '}
          of <strong className="text-white">{visibleExpenses.length}</strong> transactions
          {isWindowFilterActive && (
            <span className="ml-1 text-slate-500">
              ({windowCount} in 3-month window • {earlierCount} earlier • {futureCount} future)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-xl border border-white/[0.08] bg-black/40 px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <EditExpenseModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}
