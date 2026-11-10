'use client';

import React, { useState, useMemo } from 'react';
import { ExpenseEntry, TransactionType } from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit2,
  Lock,
  MoreVertical,
  RefreshCw,
  Search,
  Trash2,
  Filter,
} from 'lucide-react';
import { useDeleteExpense, useLogExpense, useToggleType } from '@/hooks/useFinancials';
import { EditExpenseModal } from './EditExpenseModal';

interface ExpenseTableProps {
  expenses: ExpenseEntry[];
  referenceDate: string;
}

export function ExpenseTable({ expenses, referenceDate }: ExpenseTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);

  const toggleTypeMutation = useToggleType();
  const deleteMutation = useDeleteExpense();
  const logMutation = useLogExpense();

  // Filtered and sorted expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Search filter
      const matchesSearch =
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.date.includes(searchQuery) ||
        String(e.rowIndex) === searchQuery;

      // Type filter
      const matchesType = selectedType === 'ALL' || e.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [expenses, searchQuery, selectedType]);

  // Pagination slice
  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage, pageSize]);

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
      // Delete in descending row order to keep row indices consistent during execution
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
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
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
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

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
              <th className="py-3 px-3 w-28">Date</th>
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
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/30 font-medium">
            {paginatedExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No transactions match your search criteria.
                </td>
              </tr>
            ) : (
              paginatedExpenses.map((entry) => {
                const isSelected = selectedRows.includes(entry.rowIndex);
                const isCredit = entry.type === 'CREDIT';
                const isSettlement = entry.type === 'SETTLEMENT';
                const isDebit = entry.type === 'DEBIT';

                return (
                  <tr
                    key={entry.rowIndex}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-indigo-950/30' : ''
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
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {formatDisplayDate(entry.date)}
                    </td>

                    {/* Description */}
                    <td className="py-2.5 px-4 text-white font-medium max-w-xs truncate" title={entry.description}>
                      {entry.description}
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        isCredit
                          ? 'text-emerald-400'
                          : isSettlement
                          ? 'text-amber-400'
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
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 ${
                          isCredit
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isSettlement
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
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
                          className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit Transaction (Columns A-D)"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleClone(entry)}
                          disabled={logMutation.isPending}
                          className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Duplicate Transaction"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Delete Row ${entry.rowIndex} (${entry.description} - ${formatINR(entry.amount)})? Downstream formulas will auto-adjust.`
                              )
                            ) {
                              deleteMutation.mutate(entry.rowIndex);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Showing{' '}
          <strong className="text-white">
            {filteredExpenses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong className="text-white">
            {Math.min(currentPage * pageSize, filteredExpenses.length)}
          </strong>{' '}
          of <strong className="text-white">{filteredExpenses.length}</strong> transactions
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:outline-none"
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
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30"
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
