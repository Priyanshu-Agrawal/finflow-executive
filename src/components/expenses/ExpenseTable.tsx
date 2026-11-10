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
    <div className="obsidian-card p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
      {/* Top Controls & Rolling Scope Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#514535]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#f0a93c]/15 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#ffc981] border border-[#f0a93c]/30 uppercase tracking-wider">
              LEDGER MASTER
            </span>
            <span className="text-xs font-mono text-[#9e8e7c]">Google Sheets Tab 'Expenses' (A1:E314+)</span>
          </div>
          <h2 className="text-xl font-serif font-bold text-[#e9e1db] mt-1.5 flex items-center gap-2">
            Transactions & Formula Lineage Ledger
          </h2>
          <p className="text-xs text-[#9e8e7c] mt-0.5">
            Default focus anchored to <strong className="text-[#ffc981] font-mono">{formatDisplayDate(referenceDate)}</strong>.
            Showing 1 month prior ({formatDisplayDate(pastCutoff)}) to 2 months future ({formatDisplayDate(futureCutoff)}).
          </p>
        </div>

        {/* Action Pills & Focus Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleJumpToNearest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f0a93c]/10 hover:bg-[#f0a93c]/20 text-[#ffc981] text-xs font-semibold border border-[#f0a93c]/30 transition-all shadow-sm active:scale-95"
            title="Focus row nearest to today's date"
          >
            <Target className="h-3.5 w-3.5 text-[#f0a93c]" />
            <span>Focus Today / Nearest</span>
          </button>

          {/* Rolling Window Scope Switcher */}
          <div className="flex items-center rounded-xl bg-[#1e1b18] p-1 border border-[#514535]/40 text-xs">
            <button
              onClick={() => {
                setIsWindowFilterActive(true);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                isWindowFilterActive
                  ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                  : 'text-[#9e8e7c] hover:text-[#e9e1db]'
              }`}
            >
              Rolling Focus
            </button>
            <button
              onClick={() => {
                setIsWindowFilterActive(false);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                !isWindowFilterActive
                  ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                  : 'text-[#9e8e7c] hover:text-[#e9e1db]'
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
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9e8e7c]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search description, date, or row #..."
              className="w-full rounded-xl border border-[#514535]/40 bg-[#1e1b18] pl-9 pr-4 py-2 text-xs text-[#e9e1db] placeholder-[#9e8e7c] focus:border-[#f0a93c] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-[#514535]/40 bg-[#1e1b18] p-1">
            {['ALL', 'DEBIT', 'CREDIT', 'SETTLEMENT'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedType(t);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedType === t
                    ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                    : 'text-[#9e8e7c] hover:text-[#e9e1db]'
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
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 transition-colors"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-[#514535]/30 bg-[#1e1b18] text-xs">
              <div className="flex items-center gap-2 text-[#9e8e7c]">
                <History className="h-4 w-4 text-[#ffc981] shrink-0" />
                <span>
                  <strong className="text-[#e9e1db] font-mono">{earlierCount}</strong> earlier transactions before{' '}
                  <strong className="text-[#ffc981]">{formatDisplayDate(pastCutoff)}</strong> hidden to maintain immediate focus
                </span>
              </div>
              <button
                onClick={() => setShowEarlier(true)}
                className="px-3 py-1.5 rounded-lg bg-[#f0a93c]/15 hover:bg-[#f0a93c]/25 text-[#ffc981] font-semibold text-xs border border-[#f0a93c]/30 transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Load Earlier ({earlierCount})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#f0a93c]/30 bg-[#f0a93c]/10 text-xs text-[#ffc981]">
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-[#f0a93c]" />
                Showing {earlierCount} earlier transactions before {formatDisplayDate(pastCutoff)}
              </span>
              <button
                onClick={() => setShowEarlier(false)}
                className="text-xs text-[#ffc981] hover:underline font-semibold"
              >
                Collapse Earlier
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-[#514535]/30 bg-[#161310]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#514535]/30 bg-[#1e1b18] text-[11px] font-mono font-semibold text-[#9e8e7c] uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    paginatedExpenses.length > 0 &&
                    selectedRows.length === paginatedExpenses.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-[#514535] bg-[#161310] text-[#f0a93c] focus:ring-0"
                />
              </th>
              <th className="py-3 px-2 w-14 font-mono text-[#9e8e7c]"># Row</th>
              <th className="py-3 px-3 w-32 font-mono">Date</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-3 text-center">Type (Click)</th>
              <th className="py-3 px-4 text-right">
                <span className="flex items-center justify-end gap-1">
                  <Lock className="h-3 w-3 text-[#ffc981]" />
                  Balance (E)
                </span>
              </th>
              <th className="py-3 px-3 w-28 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#514535]/15 bg-[#161310] font-medium">
            {paginatedExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#9e8e7c]">
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
                        ? 'bg-[#f0a93c]/10 border-l-4 border-l-[#f0a93c]'
                        : isSelected
                        ? 'bg-[#2d2926]'
                        : 'hover:bg-[#1e1b18]/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(entry.rowIndex)}
                        className="rounded border-[#514535] bg-[#161310] text-[#f0a93c] focus:ring-0"
                      />
                    </td>

                    {/* Row Index */}
                    <td className="py-2.5 px-2 font-mono text-[11px] text-[#9e8e7c]">
                      #{entry.rowIndex}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#d6c4af]">{formatDisplayDate(entry.date)}</span>
                        {isNearest && (
                          <span className="rounded bg-[#f0a93c]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#ffc981] border border-[#f0a93c]/40 shrink-0">
                            ANCHOR
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-2.5 px-4 text-[#e9e1db] font-medium max-w-xs truncate" title={entry.description}>
                      <span className={entry.description.startsWith('[External') ? 'text-[#ffc981] font-semibold' : ''}>
                        {entry.description}
                      </span>
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-2.5 px-4 text-right font-serif text-sm font-bold whitespace-nowrap ${
                        isCredit
                          ? 'text-[#edbf70]'
                          : isSettlement
                          ? 'text-[#ffc981]'
                          : 'text-[#ffb4ab]'
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
                        className={`rounded-lg px-2.5 py-0.5 text-[10px] font-mono font-bold border transition-all hover:scale-105 active:scale-95 ${
                          isCredit
                            ? 'bg-[#edbf70]/15 text-[#edbf70] border-[#edbf70]/30'
                            : isSettlement
                            ? 'bg-[#ffc981]/15 text-[#ffc981] border-[#ffc981]/30'
                            : 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/30'
                        }`}
                        title="Click to toggle type: DEBIT ➔ CREDIT ➔ SETTLEMENT"
                      >
                        {entry.type}
                      </button>
                    </td>

                    {/* Balance (Column E) */}
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#ffc981] whitespace-nowrap">
                      {formatINR(entry.balance)}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="rounded-lg p-1.5 text-[#9e8e7c] hover:text-[#ffc981] hover:bg-[#1e1b18] transition-colors"
                          title="Edit Transaction (Columns A-D)"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleClone(entry)}
                          disabled={logMutation.isPending}
                          className="rounded-lg p-1.5 text-[#9e8e7c] hover:text-[#ffc981] hover:bg-[#1e1b18] transition-colors"
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
                          className="rounded-lg p-1.5 text-[#9e8e7c] hover:text-[#ffb4ab] hover:bg-[#1e1b18] transition-colors"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-[#514535]/30 bg-[#1e1b18] text-xs">
              <div className="flex items-center gap-2 text-[#9e8e7c]">
                <Calendar className="h-4 w-4 text-[#ffc981] shrink-0" />
                <span>
                  <strong className="text-[#e9e1db] font-mono">{futureCount}</strong> long-term projections beyond{' '}
                  <strong className="text-[#ffc981]">{formatDisplayDate(futureCutoff)}</strong> hidden
                </span>
              </div>
              <button
                onClick={() => setShowFuture(true)}
                className="px-3 py-1.5 rounded-lg bg-[#f0a93c]/15 hover:bg-[#f0a93c]/25 text-[#ffc981] font-semibold text-xs border border-[#f0a93c]/30 transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Load Further Projections ({futureCount})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#f0a93c]/30 bg-[#f0a93c]/10 text-xs text-[#ffc981]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#f0a93c]" />
                Showing all {futureCount} projections beyond {formatDisplayDate(futureCutoff)}
              </span>
              <button
                onClick={() => setShowFuture(false)}
                className="text-xs text-[#ffc981] hover:underline font-semibold"
              >
                Collapse Future Projections
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#9e8e7c]">
        <div>
          Showing{' '}
          <strong className="text-[#e9e1db] font-mono">
            {visibleExpenses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong className="text-[#e9e1db] font-mono">
            {Math.min(currentPage * pageSize, visibleExpenses.length)}
          </strong>{' '}
          of <strong className="text-[#e9e1db] font-mono">{visibleExpenses.length}</strong> transactions
          {isWindowFilterActive && (
            <span className="ml-1 text-[#9e8e7c]">
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
            className="rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-2.5 py-1 text-xs text-[#d6c4af] focus:border-[#f0a93c] focus:outline-none"
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
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#514535]/40 bg-[#1e1b18] text-[#9e8e7c] hover:text-[#e9e1db] hover:border-[#f0a93c]/40 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-[#e9e1db]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#514535]/40 bg-[#1e1b18] text-[#9e8e7c] hover:text-[#e9e1db] hover:border-[#f0a93c]/40 disabled:opacity-30 transition-colors"
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
