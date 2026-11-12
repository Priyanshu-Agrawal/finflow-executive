'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { placeRowInView } from '@/lib/scroll-anchor';
import { ExpenseEntry, TransactionType } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import {
  ArrowUpDown,
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
  GripVertical,
  History,
  Lock,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  useDeleteExpense,
  useLogExpense,
  useToggleType,
  useSortExpenses,
  useRestoreExpenseRow,
  useRestoreExpensesOrder,
  useReorderExpenses,
} from '@/hooks/useFinancials';
import { useUndo } from '@/context/UndoContext';
import { EditExpenseModal } from './EditExpenseModal';
import { StickyBar } from '@/components/ui/StickyBar';
import { TableScroller } from '@/components/ui/TableScroller';
import { TodayFab } from '@/components/ui/TodayFab';
import { useAnchorInView } from '@/hooks/useAnchorInView';
import { formatDate } from '@/lib/format';

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
  const [sortOrder, setSortOrder] = useState<'sheet' | 'asc' | 'desc'>('asc');

  // Rolling Window Controls
  const pastCutoff = useMemo(() => getMonthOffsetDate(referenceDate, -1), [referenceDate]);
  const futureCutoff = useMemo(() => getMonthOffsetDate(referenceDate, 2), [referenceDate]);

  const [isWindowFilterActive, setIsWindowFilterActive] = useState<boolean>(true);
  const [showEarlier, setShowEarlier] = useState<boolean>(false);
  const [showFuture, setShowFuture] = useState<boolean>(false);

  const nearestRowRef = useRef<HTMLTableRowElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // On a phone the view, scope and sort controls and the window notes sit behind "Options".
  const [optionsOpen, setOptionsOpen] = useState(false);

  const toggleTypeMutation = useToggleType();
  const deleteMutation = useDeleteExpense();
  const logMutation = useLogExpense();
  const sortExpensesMutation = useSortExpenses();
  const restoreRowMutation = useRestoreExpenseRow();
  const restoreOrderMutation = useRestoreExpensesOrder();
  const reorderMutation = useReorderExpenses();
  const { pushUndo } = useUndo();

  // Drag-and-drop row reordering state
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);

  const handleDropRow = async (sourceRow: number, targetRow: number) => {
    if (sourceRow === targetRow) return;
    try {
      const res = await reorderMutation.mutateAsync({ sourceIndex: sourceRow, targetIndex: targetRow });
      pushUndo({
        description: `Moved Row #${sourceRow} to Row #${targetRow} in Google Sheets`,
        undo: async () => {
          await restoreOrderMutation.mutateAsync(res.previousOrder);
        },
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to reorder row in Google Sheets');
    }
  };

  // Find the transaction nearest to referenceDate (targeting the latest entry on or before referenceDate)
  const nearestEntry = useMemo(() => {
    if (expenses.length === 0) return null;

    // 1. If there are actual entries on or before referenceDate, pick the last one
    // (e.g. on 2026-11-08, picks Row 239 which is the last entry of the 8th)
    const actuals = expenses.filter((e) => e.date <= referenceDate);
    if (actuals.length > 0) {
      return actuals[actuals.length - 1];
    }

    // 2. If all entries are in the future, pick the entry closest in time (last entry of that closest date)
    const targetTime = new Date(referenceDate).getTime();
    let closest = expenses[0];
    let minDiff = Infinity;
    for (const e of expenses) {
      const diff = Math.abs(new Date(e.date).getTime() - targetTime);
      if (diff <= minDiff) {
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

  // Effective visible expenses after applying rolling window settings and sorting
  const visibleExpenses = useMemo(() => {
    let filtered = baseFilteredExpenses;
    if (isWindowFilterActive) {
      filtered = baseFilteredExpenses.filter((e) => {
        if (!showEarlier && e.date < pastCutoff) return false;
        if (!showFuture && e.date > futureCutoff) return false;
        return true;
      });
    }

    if (sortOrder === 'asc') {
      return [...filtered].sort((a, b) => a.date.localeCompare(b.date) || a.rowIndex - b.rowIndex);
    } else if (sortOrder === 'desc') {
      return [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.rowIndex - a.rowIndex);
    }
    return filtered;
  }, [baseFilteredExpenses, isWindowFilterActive, showEarlier, showFuture, pastCutoff, futureCutoff, sortOrder]);

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
    let idx = visibleExpenses.findIndex((e) => e.rowIndex === nearestEntry.rowIndex);
    if (idx !== -1) {
      const targetPage = Math.floor(idx / pageSize) + 1;
      setCurrentPage(targetPage);
      setTimeout(() => {
        if (nearestRowRef.current) placeRowInView(nearestRowRef.current);
      }, 100);
    } else {
      setIsWindowFilterActive(false);
      setShowEarlier(true);
      setShowFuture(true);
      const allIdx = baseFilteredExpenses.findIndex((e) => e.rowIndex === nearestEntry.rowIndex);
      if (allIdx !== -1) {
        const targetPage = Math.floor(allIdx / pageSize) + 1;
        setCurrentPage(targetPage);
      }
      setTimeout(() => {
        if (nearestRowRef.current) placeRowInView(nearestRowRef.current);
      }, 150);
    }
  };

  // Permanently auto-sort all expenses in Google Sheets chronologically by date
  const handleAutoSort = async () => {
    try {
      const res = await sortExpensesMutation.mutateAsync();
      pushUndo({
        description: `Auto-sorted ${res.sortedCount} expenses chronologically by date in Google Sheets`,
        undo: async () => {
          await restoreOrderMutation.mutateAsync(res.previousOrder);
        },
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to auto-sort expenses in Google Sheets');
    }
  };

  // Handle 1-Click Type cycle: DEBIT -> CREDIT -> SETTLEMENT -> DEBIT with Undo
  const handleCycleType = async (entry: ExpenseEntry) => {
    const cycleMap: Record<TransactionType, TransactionType> = {
      DEBIT: 'CREDIT',
      CREDIT: 'SETTLEMENT',
      SETTLEMENT: 'DEBIT',
      ADJUSTMENT: 'DEBIT',
      OTHER: 'DEBIT',
      DIRECT: 'DEBIT',
    };
    const prevType = entry.type;
    const nextType = cycleMap[prevType] || 'DEBIT';

    await toggleTypeMutation.mutateAsync({
      rowIndex: entry.rowIndex,
      newType: nextType,
    });

    pushUndo({
      description: `Cycled Row ${entry.rowIndex} type from ${prevType} to ${nextType}`,
      undo: async () => {
        await toggleTypeMutation.mutateAsync({
          rowIndex: entry.rowIndex,
          newType: prevType,
        });
      },
    });
  };

  // Handle Clone with Undo
  const handleClone = async (entry: ExpenseEntry) => {
    const res = await logMutation.mutateAsync({
      date: entry.date,
      description: `${entry.description} (Copy)`,
      amount: entry.amount,
      type: entry.type,
    });

    if (res?.newRow) {
      const newRowIdx = res.newRow;
      pushUndo({
        description: `Cloned: ${entry.description} (Row ${newRowIdx})`,
        undo: async () => {
          await deleteMutation.mutateAsync(newRowIdx);
        },
      });
    }
  };

  // Single Row Delete with Undo
  const handleDeleteRow = async (entry: ExpenseEntry) => {
    if (
      confirm(
        `Delete Row ${entry.rowIndex} (${entry.description} - ${formatINR(entry.amount)})? Running balances below will be re-linked automatically.`
      )
    ) {
      const backup = { ...entry };
      await deleteMutation.mutateAsync(backup.rowIndex);

      pushUndo({
        description: `Deleted Row ${backup.rowIndex}: ${backup.description} (${formatINR(backup.amount)})`,
        undo: async () => {
          await restoreRowMutation.mutateAsync({
            rowIndex: backup.rowIndex,
            data: {
              date: backup.date,
              description: backup.description,
              amount: backup.amount,
              type: backup.type,
            },
          });
        },
      });
    }
  };

  // Handle Bulk Delete with Undo
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (
      confirm(
        `Are you sure you want to delete ${selectedRows.length} selected row(s)? Running balances below will be re-linked automatically.`
      )
    ) {
      const targets = selectedRows
        .map((r) => expenses.find((e) => e.rowIndex === r))
        .filter(Boolean) as ExpenseEntry[];

      const sorted = [...selectedRows].sort((a, b) => b - a);
      for (const r of sorted) {
        await deleteMutation.mutateAsync(r);
      }
      setSelectedRows([]);

      pushUndo({
        description: `Deleted ${targets.length} rows in bulk`,
        undo: async () => {
          // Restore top-to-bottom so each row lands back at its original index
          for (const t of [...targets].sort((a, b) => a.rowIndex - b.rowIndex)) {
            await restoreRowMutation.mutateAsync({
              rowIndex: t.rowIndex,
              data: {
                date: t.date,
                description: t.description,
                amount: t.amount,
                type: t.type,
              },
            });
          }
        },
      });
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

  const anchorInView = useAnchorInView(scrollerRef, paginatedExpenses);
  const segment = (active: boolean) =>
    `min-h-11 lg:min-h-8 px-3 lg:px-2.5 rounded-lg text-xs font-medium transition-colors ${
      active ? 'bg-amber-500 text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
    }`;

  return (
    <div className="space-y-3">
      <TodayFab visible={!!nearestEntry && !anchorInView} onClick={handleJumpToNearest} />

      {/* Control bar: sticks under the top bar */}
      <StickyBar>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full lg:w-auto lg:flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3.5 lg:top-2.5 h-4 w-4 text-zinc-500" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Search the ledger"
              placeholder="Search description, date or row"
              className="w-full min-h-11 lg:min-h-9 rounded-xl border border-white/[0.07] bg-[#18181B] pl-9 pr-4 text-sm lg:text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Type filter */}
          <div role="group" aria-label="Filter by type" className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-[#18181B] p-1 max-w-full overflow-x-auto no-scrollbar">
            {['ALL', 'DEBIT', 'CREDIT', 'SETTLEMENT'].map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={selectedType === t}
                onClick={() => {
                  setSelectedType(t);
                  setCurrentPage(1);
                }}
                className={segment(selectedType === t)}
              >
                {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOptionsOpen((o) => !o)}
            aria-expanded={optionsOpen}
            className="lg:hidden min-h-11 rounded-xl border border-white/[0.07] bg-[#18181B] px-3 text-xs font-medium text-zinc-300 hover:text-white"
          >
            Options
          </button>

          {/* View, scope and sort: always shown on a laptop, behind Options on a phone */}
          <div className={`${optionsOpen ? 'flex' : 'hidden'} lg:flex w-full lg:w-auto flex-wrap items-center gap-2`}>
            <div role="group" aria-label="Sort the view" className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-[#18181B] p-1">
              {[
                { id: 'asc', label: 'Oldest first' },
                { id: 'desc', label: 'Newest first' },
                { id: 'sheet', label: 'Sheet order' },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={sortOrder === o.id}
                  onClick={() => setSortOrder(o.id as 'sheet' | 'asc' | 'desc')}
                  className={segment(sortOrder === o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div role="group" aria-label="How much to show" className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-[#18181B] p-1">
              <button
                type="button"
                aria-pressed={isWindowFilterActive}
                onClick={() => {
                  setIsWindowFilterActive(true);
                  setCurrentPage(1);
                }}
                className={segment(isWindowFilterActive)}
              >
                Around today
              </button>
              <button
                type="button"
                aria-pressed={!isWindowFilterActive}
                onClick={() => {
                  setIsWindowFilterActive(false);
                  setCurrentPage(1);
                }}
                className={segment(!isWindowFilterActive)}
              >
                All ({expenses.length})
              </button>
            </div>

            <button
              type="button"
              onClick={handleAutoSort}
              disabled={sortExpensesMutation.isPending || reorderMutation.isPending}
              className="flex min-h-11 lg:min-h-9 items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/20 active:scale-95 disabled:opacity-50"
              title="Sort the rows in Google Sheets by date. You can undo it."
            >
              {sortExpensesMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{sortExpensesMutation.isPending ? 'Sorting…' : 'Sort sheet by date'}</span>
            </button>

            {reorderMutation.isPending && (
              <div role="status" className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Moving the row in Sheets…</span>
              </div>
            )}
          </div>

          {selectedRows.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
              className="flex min-h-11 lg:min-h-9 items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-medium text-orange-400 hover:bg-orange-500/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Delete ({selectedRows.length})</span>
            </button>
          )}
        </div>
      </StickyBar>

      {/* What is shown, and the earlier-transactions banner (phone: behind Options) */}
      <div className={`${optionsOpen ? 'block' : 'hidden'} lg:block space-y-3`}>
        {isWindowFilterActive && (
          <p className="text-xs text-zinc-400">
            Showing {formatDate(pastCutoff)} to {formatDate(futureCutoff)}, around <strong className="font-semibold text-amber-400">{formatDate(referenceDate)}</strong>.
          </p>
        )}
        {isWindowFilterActive && earlierCount > 0 && (
          <div>
            {!showEarlier ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-white/[0.07] bg-[#18181B] text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <History className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="text-white">{earlierCount}</strong> earlier transactions before{' '}
                    <strong className="text-amber-400">{formatDate(pastCutoff)}</strong> are hidden
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEarlier(true)}
                  className="px-3 min-h-11 lg:min-h-9 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium text-xs border border-amber-500/20 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Show earlier ({earlierCount})</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-400">
                <span className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  Showing {earlierCount} earlier transactions before {formatDate(pastCutoff)}
                </span>
                <button type="button" onClick={() => setShowEarlier(false)} className="min-h-11 lg:min-h-9 px-2 text-xs text-amber-400 hover:underline font-medium">
                  Hide earlier
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The table scrolls inside its own area so its header always stays in view */}
      <TableScroller ref={scrollerRef}>
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="text-xs font-medium text-zinc-400 [&>th]:bg-[#18181B] [&>th]:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
              <th className="py-3 px-1.5 w-8 text-center">
                <span className="sr-only">Reorder</span>
              </th>
              <th className="py-3 px-2 w-10 text-center">
                <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  checked={
                    paginatedExpenses.length > 0 &&
                    selectedRows.length === paginatedExpenses.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-white/20 bg-[#18181B] text-amber-500 focus:ring-0"
                />
              </th>
              <th className="py-3 px-2 w-14 text-zinc-500">Row</th>
              <th className="py-3 px-3 w-32">Date</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-3 text-center">Type</th>
              <th className="py-3 px-4 text-right">
                <span className="flex items-center justify-end gap-1">
                  <Lock className="h-3 w-3 text-amber-400" aria-hidden="true" />
                  Balance
                </span>
              </th>
              <th className="py-3 px-3 w-28 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] bg-[#121214] font-medium">
            {paginatedExpenses.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-zinc-500">
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
                    data-anchor-row={isNearest ? 'true' : undefined}
                    onDragOver={(ev) => {
                      ev.preventDefault();
                      ev.dataTransfer.dropEffect = 'move';
                      if (draggedRowIndex && draggedRowIndex !== entry.rowIndex) {
                        setDragOverRowIndex(entry.rowIndex);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverRowIndex === entry.rowIndex) setDragOverRowIndex(null);
                    }}
                    onDrop={(ev) => {
                      ev.preventDefault();
                      const source = draggedRowIndex;
                      // Clear the drag state now; the move shows instantly (optimistic) and syncs in the background
                      setDraggedRowIndex(null);
                      setDragOverRowIndex(null);
                      if (source && source !== entry.rowIndex) {
                        void handleDropRow(source, entry.rowIndex);
                      }
                    }}
                    className={`transition-colors group ${
                      isNearest
                        ? 'bg-amber-500/10 border-l-4 border-l-amber-500'
                        : isSelected
                        ? 'bg-white/[0.05]'
                        : 'hover:bg-[#18181B]/70'
                    } ${draggedRowIndex === entry.rowIndex ? 'opacity-30 bg-amber-500/20' : ''} ${
                      dragOverRowIndex === entry.rowIndex ? 'border-t-2 border-amber-500 shadow-lg' : ''
                    }`}
                  >
                    {/* Drag Handle */}
                    <td
                      draggable={true}
                      onDragStart={(ev) => {
                        ev.dataTransfer.setData('text/plain', String(entry.rowIndex));
                        setDraggedRowIndex(entry.rowIndex);
                      }}
                      onDragEnd={() => {
                        setDraggedRowIndex(null);
                        setDragOverRowIndex(null);
                      }}
                      className="py-2.5 px-1.5 text-center cursor-grab active:cursor-grabbing select-none"
                      title="Drag row to reorder in Google Sheets"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-zinc-600 group-hover:text-amber-400 mx-auto transition-colors" />
                    </td>

                    {/* Checkbox */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-label={`Select row ${entry.rowIndex}`}
                        onChange={() => toggleSelectRow(entry.rowIndex)}
                        className="rounded border-white/20 bg-[#18181B] text-amber-500 focus:ring-0"
                      />
                    </td>

                    {/* Row Index */}
                    <td data-allow-mono className="py-2.5 px-2 font-mono text-xs text-zinc-500">
                      #{entry.rowIndex}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums text-zinc-300">{formatDisplayDate(entry.date)}</span>
                        {isNearest && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-xs font-bold text-amber-400 border border-amber-500/30 shrink-0">
                            Today
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-2.5 px-4 text-white font-medium max-w-xs truncate" title={entry.description}>
                      <span className={entry.description.startsWith('[External') ? 'text-amber-400 font-medium' : ''}>
                        {entry.description}
                      </span>
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-2.5 px-4 text-right tabular-nums text-sm font-bold whitespace-nowrap ${
                        isCredit
                          ? 'text-credit'
                          : isSettlement
                          ? 'text-amber-400'
                          : 'text-zinc-100'
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
                        className={`rounded-lg px-2.5 py-0.5 text-xs tabular-nums font-medium border transition-all hover:scale-105 active:scale-95 ${
                          isCredit
                            ? 'bg-credit/10 text-credit border-credit/20'
                            : isSettlement
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-white/[0.05] text-zinc-300 border-white/10'
                        }`}
                        title="Click to toggle type: DEBIT ➔ CREDIT ➔ SETTLEMENT"
                      >
                        {entry.type}
                      </button>
                    </td>

                    {/* Balance (Column E) */}
                    <td className="py-2.5 px-4 text-right tabular-nums font-medium text-zinc-100 whitespace-nowrap">
                      {formatINR(entry.balance)}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="rounded-lg p-2.5 sm:p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-white/[0.05] transition-colors"
                          title="Edit Transaction (Columns A-D)"
                          aria-label={`Edit row ${entry.rowIndex}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleClone(entry)}
                          disabled={logMutation.isPending}
                          className="rounded-lg p-2.5 sm:p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-white/[0.05] transition-colors"
                          title="Duplicate Transaction"
                          aria-label={`Duplicate row ${entry.rowIndex}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(entry)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg p-2.5 sm:p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                          title="Delete Row"
                          aria-label={`Delete row ${entry.rowIndex}`}
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

        <div className="space-y-3 p-3">
      {/* Further Projections Collapsible Banner */}
      {isWindowFilterActive && futureCount > 0 && (
        <div>
          {!showFuture ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-white/[0.07] bg-[#18181B] text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  <strong className="text-white tabular-nums">{futureCount}</strong> long-term projections beyond{' '}
                  <strong className="text-amber-400">{formatDisplayDate(futureCutoff)}</strong> hidden
                </span>
              </div>
              <button
                onClick={() => setShowFuture(true)}
                className="px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium text-xs border border-amber-500/20 transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Load Further Projections ({futureCount})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                Showing all {futureCount} projections beyond {formatDisplayDate(futureCutoff)}
              </span>
              <button
                onClick={() => setShowFuture(false)}
                className="min-h-11 sm:min-h-0 px-2 text-xs text-amber-400 hover:underline font-medium"
              >
                Collapse Future Projections
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
        <div>
          Showing{' '}
          <strong className="text-white tabular-nums">
            {visibleExpenses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong className="text-white tabular-nums">
            {Math.min(currentPage * pageSize, visibleExpenses.length)}
          </strong>{' '}
          of <strong className="text-white tabular-nums">{visibleExpenses.length}</strong> transactions
          {isWindowFilterActive && (
            <span className="ml-1 text-zinc-500">
              ({windowCount} in 3-month window • {earlierCount} earlier • {futureCount} future)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Page Size Selector */}
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="min-h-11 sm:min-h-0 rounded-xl border border-white/[0.07] bg-[#18181B] px-2.5 py-1 text-xs text-zinc-300 focus:border-amber-500 focus:outline-none"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous page"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-white/[0.07] bg-[#18181B] text-zinc-400 hover:text-white hover:border-amber-500/40 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 tabular-nums text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              aria-label="Next page"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-white/[0.07] bg-[#18181B] text-zinc-400 hover:text-white hover:border-amber-500/40 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
        </div>
      </TableScroller>

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
