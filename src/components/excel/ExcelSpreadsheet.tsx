'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { placeRowInView } from '@/lib/scroll-anchor';
import { TodayFab } from '@/components/ui/TodayFab';
import { formatDate, formatDateShort } from '@/lib/format';
import { useAnchorInView } from '@/hooks/useAnchorInView';
import {
  ExpenseEntry,
  LoanStatus,
  RawLoanRow,
  PeerLedgerEntry,
  TransactionType,
} from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import { useUpdateExpense, useToggleType, useSortExpenses, useRestoreExpensesOrder, useReorderExpenses } from '@/hooks/useFinancials';
import { useUndo } from '@/context/UndoContext';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Grid,
  GripVertical,
  Info,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Table,
  TableProperties,
  X,
} from 'lucide-react';

interface ExcelSpreadsheetProps {
  expenses: ExpenseEntry[];
  loans: LoanStatus[];
  peerLedger: PeerLedgerEntry[];
  referenceDate?: string;
  onOpenQuickLog?: () => void;
}

type SheetTab = 'expenses' | 'loans' | 'ledger';

export function ExcelSpreadsheet({
  expenses,
  loans,
  peerLedger,
  referenceDate,
  onOpenQuickLog,
}: ExcelSpreadsheetProps) {
  const [activeTab, setActiveTab] = useState<SheetTab>('expenses');

  // Dynamic Anchor Calculation based on referenceDate (or today's date)
  const effectiveRefDate = referenceDate || new Date().toLocaleDateString('en-CA');
  const anchorEntry = useMemo(() => {
    if (!expenses || expenses.length === 0) return null;
    const actuals = expenses.filter((e) => e.date <= effectiveRefDate);
    if (actuals.length > 0) {
      return actuals[actuals.length - 1];
    }
    return expenses[0];
  }, [expenses, effectiveRefDate]);

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string }>(() => ({
    row: anchorEntry?.rowIndex ?? 240,
    col: 'B',
  }));
  // The anchor placement does its own scrolling; the selection scroll skips its first run
  // and the run right after an anchor placement, so nothing animates on first load.
  const skipSelectScrollRef = useRef(true);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [jumpRowInput, setJumpRowInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Drag-and-drop row reordering state
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);

  const updateMutation = useUpdateExpense();
  const toggleMutation = useToggleType();
  const sortExpensesMutation = useSortExpenses();
  const restoreOrderMutation = useRestoreExpensesOrder();
  const reorderMutation = useReorderExpenses();
  const { pushUndo, triggerUndo } = useUndo();

  const editInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Focus and select active cell on dynamic anchor change
  // Keyed on the row number, so a data refresh (e.g. after a drag) does not reset the selection.
  // First placement jumps without animation; later anchor changes scroll smoothly.
  const anchorRow = anchorEntry?.rowIndex;
  const anchorPlacedRef = useRef(false);
  useLayoutEffect(() => {
    if (!anchorRow) return;
    skipSelectScrollRef.current = true;
    setSelectedCell((prev) => ({ ...prev, row: anchorRow }));
    const rowElem = document.getElementById(`excel-row-${anchorRow}`);
    if (rowElem) {
      placeRowInView(rowElem, { smooth: anchorPlacedRef.current });
      anchorPlacedRef.current = true;
    }
  }, [anchorRow]);

  // The one floating Today button: shown when the anchor row is scrolled out of the grid's view
  // (or another sheet tab is open); it brings the anchor back to the 30% position.
  const anchorInView = useAnchorInView(tableContainerRef, activeTab);
  const goToToday = () => {
    if (!anchorRow) return;
    setActiveTab('expenses');
    skipSelectScrollRef.current = true;
    setSelectedCell((prev) => ({ ...prev, row: anchorRow }));
    window.setTimeout(() => {
      // Bring the grid on screen first (the page may be scrolled away), then the row to 30%.
      const container = tableContainerRef.current;
      if (container) {
        const top = container.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.4) {
          window.scrollTo({ top: window.scrollY + top - 72, behavior: 'smooth' });
        }
      }
      const rowElem = document.getElementById(`excel-row-${anchorRow}`);
      if (rowElem) placeRowInView(rowElem);
    }, activeTab === 'expenses' ? 0 : 60);
  };

  // Handle Drag-and-Drop Row Movement with full Undo
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

  // Focus inline edit input when entering edit mode
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Keyboard navigation across cells + instant Ctrl+Z Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Catch Ctrl+Z / Cmd+Z directly
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (editingCell) {
          setEditingCell(null);
        }
        triggerUndo();
        return;
      }

      if (editingCell) {
        if (e.key === 'Escape') {
          setEditingCell(null);
        } else if (e.key === 'Enter') {
          commitCellEdit();
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
        if (activeTab !== 'expenses') return;

        const cols = ['A', 'B', 'C', 'D', 'E'];
        const currentColIndex = cols.indexOf(selectedCell.col);
        const currentRowIndex = selectedCell.row;

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCell((prev) => ({
            ...prev,
            row: Math.max(2, prev.row - 1),
          }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCell((prev) => ({
            ...prev,
            row: Math.min(expenses.length + 1, prev.row + 1),
          }));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (currentColIndex > 0) {
            setSelectedCell((prev) => ({
              ...prev,
              col: cols[currentColIndex - 1],
            }));
          }
        } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
          e.preventDefault();
          if (currentColIndex < cols.length - 1) {
            setSelectedCell((prev) => ({
              ...prev,
              col: cols[currentColIndex + 1],
            }));
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          startCellEdit(selectedCell.row, selectedCell.col);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, editingCell, activeTab, expenses.length]);

  // Scroll to selected cell
  useEffect(() => {
    if (skipSelectScrollRef.current) {
      skipSelectScrollRef.current = false;
      return;
    }
    if (activeTab === 'expenses') {
      const rowElem = document.getElementById(`excel-row-${selectedCell.row}`);
      if (rowElem) {
        rowElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedCell.row, activeTab]);

  const currentExpenseRow = useMemo(() => {
    return expenses.find((e) => e.rowIndex === selectedCell.row);
  }, [expenses, selectedCell.row]);

  // Start cell editing
  const startCellEdit = (row: number, col: string) => {
    if (col === 'E') {
      // Column E is protected dynamic formula
      return;
    }
    const entry = expenses.find((e) => e.rowIndex === row);
    if (!entry) return;

    let initialVal = '';
    if (col === 'A') initialVal = entry.date;
    if (col === 'B') initialVal = entry.description;
    if (col === 'C') initialVal = String(entry.amount);
    if (col === 'D') initialVal = entry.type;

    setEditingCell({ row, col });
    setEditValue(initialVal);
  };

  // Commit inline edit
  const commitCellEdit = async () => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    const entry = expenses.find((e) => e.rowIndex === row);
    if (!entry) {
      setEditingCell(null);
      return;
    }

    const updated = {
      date: entry.date,
      description: entry.description,
      amount: entry.amount,
      type: entry.type,
    };

    if (col === 'A') updated.date = editValue.trim();
    if (col === 'B') updated.description = editValue.trim();
    if (col === 'C') updated.amount = Number(editValue) || 0;
    if (col === 'D') {
      const upper = editValue.toUpperCase();
      if (['DEBIT', 'CREDIT', 'SETTLEMENT', 'ADJUSTMENT', 'OTHER', 'DIRECT'].includes(upper)) {
        updated.type = upper as TransactionType;
      }
    }

    const prevData = {
      date: entry.date,
      description: entry.description,
      amount: entry.amount,
      type: entry.type,
    };

    // If unchanged, don't execute API mutation or push undo
    if (
      updated.date === prevData.date &&
      updated.description === prevData.description &&
      updated.amount === prevData.amount &&
      updated.type === prevData.type
    ) {
      setEditingCell(null);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        rowIndex: row,
        data: updated,
      });
      setSaveSuccessMsg(`Cell ${col}${row} saved`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);

      pushUndo({
        description: `Updated Cell ${col}${row}: "${editValue}"`,
        undo: async () => {
          await updateMutation.mutateAsync({
            rowIndex: row,
            data: prevData,
          });
        },
      });
    } catch (err) {
      console.error('Failed to commit cell edit', err);
    }

    setEditingCell(null);
  };

  // Filtered expenses for matrix view
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.date.includes(searchQuery) ||
        String(e.rowIndex) === searchQuery;
      const matchesType = filterType === 'ALL' || e.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [expenses, searchQuery, filterType]);

  const handleJumpRow = (e: React.FormEvent) => {
    e.preventDefault();
    const r = Number(jumpRowInput);
    if (r >= 2 && r <= expenses.length + 1) {
      setSelectedCell((prev) => ({ ...prev, row: r }));
      setJumpRowInput('');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let filename = `finflow-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    const rows: (string | number)[][] = [];

    if (activeTab === 'expenses') {
      rows.push(['Row', 'Date', 'Description', 'Amount', 'Type', 'Balance']);
      expenses.forEach((e) => {
        rows.push([e.rowIndex, e.date, e.description, e.amount, e.type, e.balance]);
      });
    } else if (activeTab === 'loans') {
      rows.push(['ID', 'Name', 'Principal', 'Paid', 'Due', 'Progress %']);
      loans.forEach((l) => {
        rows.push([l.id, l.name, l.initialPrincipal, l.paidToDate, l.currentDue, l.progressPercent]);
      });
    } else if (activeTab === 'ledger') {
      rows.push(['Row', 'Date', 'Description', 'Split With', 'Total Amount', 'My Share']);
      peerLedger.forEach((p) => {
        rows.push([p.rowIndex, p.date, p.description, p.splitWith, p.amount, p.perPersonShare]);
      });
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formula bar content calculation
  const formulaBarContent = useMemo(() => {
    if (!currentExpenseRow) return '';
    if (selectedCell.col === 'A') return currentExpenseRow.date;
    if (selectedCell.col === 'B') return currentExpenseRow.description;
    if (selectedCell.col === 'C') return String(currentExpenseRow.amount);
    if (selectedCell.col === 'D') return currentExpenseRow.type;
    if (selectedCell.col === 'E') {
      return (
        currentExpenseRow.formula ||
        `=IF(OR(D${selectedCell.row}="",D${selectedCell.row}="ADJUSTMENT",D${selectedCell.row}="SETTLEMENT",D${selectedCell.row}="OTHER", D${selectedCell.row}="DIRECT"),E${
          selectedCell.row - 1
        },IF(D${selectedCell.row}="DEBIT",E${selectedCell.row - 1}-C${selectedCell.row},IF(D${
          selectedCell.row
        }="CREDIT",E${selectedCell.row - 1}+C${selectedCell.row},"")))`
      );
    }
    return '';
  }, [currentExpenseRow, selectedCell]);

  return (
    <div className="relative flex flex-col h-[calc(100vh-12rem)] rounded-2xl border border-white/[0.07] bg-[#121214] overflow-hidden shadow-2xl">
      <TodayFab visible={Boolean(anchorRow) && (!anchorInView || activeTab !== 'expenses')} onClick={goToToday} />
      {/* Top Excel Ribbon Toolbar */}
      <div className="border-b border-white/[0.07] bg-[#121214] px-3 sm:px-4 py-1.5 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
        {/* Left: Mode Title & Sheet Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          {/* Sheet Tab Switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-[#18181B] p-1 border border-white/[0.07]">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'expenses'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'loans'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Loans
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'ledger'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ledger
            </button>
          </div>
        </div>

        {/* Right: Search, Filter, Jump & Export */}
        <div className="flex items-center gap-2 ml-auto">
          {activeTab === 'expenses' && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-white/[0.07] bg-[#18181B] pl-8 pr-2.5 py-1 text-xs text-white placeholder-zinc-500 w-28 sm:w-40 focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Jump to Row */}
              <form onSubmit={handleJumpRow} className="hidden md:flex items-center gap-1">
                <span className="text-xs tabular-nums text-zinc-400">Go:</span>
                <input
                  type="number"
                  placeholder="Row #"
                  value={jumpRowInput}
                  onChange={(e) => setJumpRowInput(e.target.value)}
                  className="w-16 rounded-xl border border-white/[0.07] bg-[#18181B] px-2 py-1 text-xs tabular-nums text-white focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#18181B] border border-white/[0.07] px-2 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:border-amber-500/40"
                >
                  Go
                </button>
              </form>
            </>
          )}

          {/* Auto-Sort Sheet Button */}
          {activeTab === 'expenses' && (
            <button
              onClick={async () => {
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
              }}
              disabled={sortExpensesMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
              title="Permanently sort expenses chronologically by date in Google Sheets"
            >
              {sortExpensesMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 text-amber-500 animate-spin" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span className="hidden sm:inline">
                {sortExpensesMutation.isPending ? 'Sorting...' : 'Auto-Sort Date'}
              </span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#18181B] px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:border-amber-500/40 transition-colors"
            title="Download CSV file of current active sheet"
          >
            <Download className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Quick Insert Row */}
          {onOpenQuickLog && (
            <button
              onClick={onOpenQuickLog}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1 text-xs font-semibold text-black hover:bg-amber-400 transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Classic Excel Formula Bar (fx) */}
      {activeTab === 'expenses' && (
        <div data-allow-mono className="border-b border-white/[0.07] bg-[#121214] px-3 py-1.5 flex items-center gap-2 text-xs font-mono">
          {/* Active Cell Reference Pill */}
          <div className="w-16 sm:w-20 rounded-lg bg-[#18181B] border border-amber-500/30 px-2 py-0.5 text-center font-bold text-amber-400">
            {selectedCell.col}
            {selectedCell.row}
          </div>

          {/* fx Function Symbol */}
          <div className="text-amber-500 italic font-bold select-none">
            fx
          </div>

          {/* Formula Display / Value Input */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            <div className="flex-1 rounded-lg bg-black/60 border border-white/[0.07] px-2.5 py-0.5 text-white select-all truncate font-mono">
              {formulaBarContent || <span className="text-zinc-500 italic">Empty cell</span>}
            </div>

            {selectedCell.col === 'E' && (
              <span className="hidden sm:flex items-center gap-1 text-xs font-sans font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                <Lock className="h-3 w-3" />
                Formula Protected
              </span>
            )}

            {saveSuccessMsg && (
              <span className="flex items-center gap-1 text-xs font-sans font-medium text-amber-400 animate-in fade-in">
                <Check className="h-3 w-3" />
                {saveSuccessMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sheet Grid Body */}
      <div
        ref={tableContainerRef}
        data-allow-mono
        className="flex-1 overflow-auto bg-[#0B0B0C] text-xs font-mono select-none"
      >
        {activeTab === 'expenses' && (
          <table className="w-full border-collapse border border-white/[0.07] min-w-[700px]">
            {/* Column Header Row */}
            <thead className="sticky top-0 z-20 bg-[#18181B] text-zinc-400 border-b border-white/[0.07] shadow-sm">
              <tr>
                {/* Top-Left Corner Box */}
                <th className="w-14 border-r border-b border-white/[0.07] p-1.5 text-center tabular-nums text-xs text-zinc-500 bg-[#18181B] sticky left-0 z-30">
                  ◢
                </th>
                <th
                  className={`border-r border-b border-white/[0.07] p-1.5 text-center transition-colors ${
                    selectedCell.col === 'A' ? 'bg-amber-500/15 text-amber-400 font-bold' : ''
                  }`}
                >
                  A <span className="font-sans text-xs opacity-75">(Date)</span>
                </th>
                <th
                  className={`border-r border-b border-white/[0.07] p-1.5 text-left transition-colors max-sm:sticky max-sm:left-14 max-sm:z-30 max-sm:min-w-[9rem] max-sm:bg-[#18181B] ${
                    selectedCell.col === 'B' ? 'bg-amber-500/15 max-sm:bg-[#2A210F] text-amber-400 font-bold' : ''
                  }`}
                >
                  B <span className="font-sans text-xs opacity-75">(Description)</span>
                </th>
                <th
                  className={`border-r border-b border-white/[0.07] p-1.5 text-right transition-colors ${
                    selectedCell.col === 'C' ? 'bg-amber-500/15 text-amber-400 font-bold' : ''
                  }`}
                >
                  C <span className="font-sans text-xs opacity-75">(Amount ₹)</span>
                </th>
                <th
                  className={`border-r border-b border-white/[0.07] p-1.5 text-center transition-colors ${
                    selectedCell.col === 'D' ? 'bg-amber-500/15 text-amber-400 font-bold' : ''
                  }`}
                >
                  D <span className="font-sans text-xs opacity-75">(Type)</span>
                </th>
                <th
                  className={`border-b border-white/[0.07] p-1.5 text-right transition-colors ${
                    selectedCell.col === 'E' ? 'bg-amber-500/15 text-amber-400 font-bold' : ''
                  }`}
                >
                  E <span className="font-sans text-xs opacity-75">(Balance)</span>
                </th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody>
              {filteredExpenses.map((e) => {
                const rowNum = e.rowIndex;
                const isSelectedRow = selectedCell.row === rowNum;

                const isAnchorRow = Boolean(anchorEntry && rowNum === anchorEntry.rowIndex);

                return (
                  <tr
                    key={rowNum}
                    id={`excel-row-${rowNum}`}
                    data-anchor-row={isAnchorRow ? 'true' : undefined}
                    onDragOver={(ev) => {
                      ev.preventDefault();
                      ev.dataTransfer.dropEffect = 'move';
                      setDragOverRowIndex(rowNum);
                    }}
                    onDragLeave={() => {
                      if (dragOverRowIndex === rowNum) setDragOverRowIndex(null);
                    }}
                    onDrop={(ev) => {
                      ev.preventDefault();
                      const source = draggedRowIndex;
                      // Clear the drag state now; the move shows instantly (optimistic) and syncs in the background
                      setDraggedRowIndex(null);
                      setDragOverRowIndex(null);
                      if (source && source !== rowNum) {
                        void handleDropRow(source, rowNum);
                      }
                    }}
                    className={`hover:bg-[#18181B]/50 transition-all ${
                      isAnchorRow ? 'bg-amber-500/10' : ''
                    } ${draggedRowIndex === rowNum ? 'opacity-30 bg-amber-500/20' : ''} ${
                      dragOverRowIndex === rowNum ? 'border-t-2 border-amber-500 shadow-lg' : ''
                    }`}
                  >
                    {/* Row Header Number with Drag Handle */}
                    <td
                      draggable={true}
                      onDragStart={(ev) => {
                        ev.dataTransfer.setData('text/plain', String(rowNum));
                        setDraggedRowIndex(rowNum);
                      }}
                      onDragEnd={() => {
                        setDraggedRowIndex(null);
                        setDragOverRowIndex(null);
                      }}
                      className={`border-r border-b border-white/[0.05] p-1 text-center tabular-nums text-xs sticky left-0 z-10 transition-colors cursor-grab active:cursor-grabbing group select-none ${
                        isSelectedRow
                          ? 'bg-amber-500/15 text-amber-400 font-bold border-r-2 border-r-amber-500'
                          : 'bg-[#18181B] text-zinc-500 hover:text-amber-400'
                      }`}
                      title="Click to select • Drag row to reorder in Google Sheets"
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-100 text-zinc-400 transition-opacity" />
                        <span>{rowNum}</span>
                      </div>
                    </td>

                    {/* Cell A: Date */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'A' })}
                      onDoubleClick={() => startCellEdit(rowNum, 'A')}
                      className={`border-r border-b border-white/[0.05] p-1.5 text-zinc-300 whitespace-nowrap cursor-cell transition-all ${
                        isSelectedRow && selectedCell.col === 'A'
                          ? 'ring-2 ring-amber-500 bg-amber-500/15 font-bold text-white relative z-10'
                          : ''
                      }`}
                    >
                      {editingCell?.row === rowNum && editingCell?.col === 'A' ? (
                        <input
                          ref={editInputRef}
                          data-cell-input="true"
                          type="text"
                          value={editValue}
                          onChange={(ev) => setEditValue(ev.target.value)}
                          onBlur={commitCellEdit}
                          onKeyDown={(ev) => {
                            if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setEditingCell(null);
                              triggerUndo();
                            } else if (ev.key === 'Enter') {
                              commitCellEdit();
                            } else if (ev.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full bg-black text-white tabular-nums text-xs px-1 py-0.5 outline-none ring-2 ring-amber-500 rounded"
                        />
                      ) : (
                        <>
                          <span className="sm:hidden">{formatDateShort(e.date)}</span>
                          <span className="hidden sm:inline">{formatDate(e.date)}</span>
                        </>
                      )}
                    </td>

                    {/* Cell B: Description */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'B' })}
                      onDoubleClick={() => startCellEdit(rowNum, 'B')}
                      className={`border-r border-b border-white/[0.05] p-1.5 font-medium text-white cursor-cell transition-all max-sm:sticky max-sm:left-14 max-sm:z-[5] max-sm:min-w-[9rem] ${
                        isSelectedRow && selectedCell.col === 'B'
                          ? 'ring-2 ring-amber-500 bg-amber-500/15 max-sm:bg-[#2E210C] font-bold text-white relative z-10'
                          : isAnchorRow
                          ? 'max-sm:bg-[#221A0C]'
                          : 'max-sm:bg-[#0B0B0C]'
                      }`}
                    >
                      {editingCell?.row === rowNum && editingCell?.col === 'B' ? (
                        <input
                          ref={editInputRef}
                          data-cell-input="true"
                          type="text"
                          value={editValue}
                          onChange={(ev) => setEditValue(ev.target.value)}
                          onBlur={commitCellEdit}
                          onKeyDown={(ev) => {
                            if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setEditingCell(null);
                              triggerUndo();
                            } else if (ev.key === 'Enter') {
                              commitCellEdit();
                            } else if (ev.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full bg-black text-white text-xs px-1 py-0.5 outline-none ring-2 ring-amber-500 rounded"
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <span>{e.description}</span>
                          {isAnchorRow && (
                            <span className="rounded bg-amber-500/20 px-1 py-0.2 text-xs tabular-nums font-bold text-amber-400 border border-amber-500/30">
                              Today
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Cell C: Amount */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'C' })}
                      onDoubleClick={() => startCellEdit(rowNum, 'C')}
                      className={`border-r border-b border-white/[0.05] p-1.5 text-right tabular-nums font-bold cursor-cell transition-all ${
                        isSelectedRow && selectedCell.col === 'C'
                          ? 'ring-2 ring-amber-500 bg-amber-500/15 font-bold text-white relative z-10'
                          : e.type === 'CREDIT'
                          ? 'text-credit'
                          : 'text-zinc-100'
                      }`}
                    >
                      {editingCell?.row === rowNum && editingCell?.col === 'C' ? (
                        <input
                          ref={editInputRef}
                          data-cell-input="true"
                          type="number"
                          value={editValue}
                          onChange={(ev) => setEditValue(ev.target.value)}
                          onBlur={commitCellEdit}
                          onKeyDown={(ev) => {
                            if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setEditingCell(null);
                              triggerUndo();
                            } else if (ev.key === 'Enter') {
                              commitCellEdit();
                            } else if (ev.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full bg-black text-white text-right tabular-nums text-xs px-1 py-0.5 outline-none ring-2 ring-amber-500 rounded"
                        />
                      ) : (
                        <>
                          {e.type === 'CREDIT' ? '+' : ''}
                          {formatINR(e.amount)}
                        </>
                      )}
                    </td>

                    {/* Cell D: Type */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'D' })}
                      onDoubleClick={async () => {
                        const prevType = e.type;
                        const nextType: TransactionType =
                          e.type === 'DEBIT' ? 'CREDIT' : e.type === 'CREDIT' ? 'SETTLEMENT' : 'DEBIT';
                        await toggleMutation.mutateAsync({ rowIndex: rowNum, newType: nextType });
                        pushUndo({
                          description: `Cycled Row #${rowNum} Type to ${nextType}`,
                          undo: async () => {
                            await toggleMutation.mutateAsync({ rowIndex: rowNum, newType: prevType });
                          },
                        });
                      }}
                      className={`border-r border-b border-white/[0.05] p-1.5 text-center cursor-pointer transition-all ${
                        isSelectedRow && selectedCell.col === 'D'
                          ? 'ring-2 ring-amber-500 bg-amber-500/15 relative z-10'
                          : ''
                      }`}
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs tabular-nums font-medium ${
                          e.type === 'CREDIT'
                            ? 'bg-credit/10 text-credit border border-credit/20'
                            : e.type === 'DEBIT'
                            ? 'bg-white/[0.05] text-zinc-300 border border-white/10'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                        title="Double-click to cycle type"
                      >
                        {e.type}
                      </span>
                    </td>

                    {/* Cell E: Remaining Balance (Formula Backed) */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'E' })}
                      className={`border-b border-white/[0.05] p-1.5 text-right tabular-nums font-medium text-zinc-100 cursor-cell transition-all ${
                        isSelectedRow && selectedCell.col === 'E'
                          ? 'ring-2 ring-amber-500 bg-amber-500/15 font-bold text-white relative z-10'
                          : ''
                      }`}
                      title="Formula Backed Cell (=IF(OR(D...)))"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Lock className="h-2.5 w-2.5 text-amber-500" />
                        <span>{formatINR(e.balance)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Tab 2: Loans */}
        {activeTab === 'loans' && (
          <div className="p-4 space-y-4 font-sans">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 tabular-nums">
              <Table className="h-4 w-4 text-amber-500" />
              Loans sheet
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#121214]">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-[#18181B] border-b border-white/[0.07] text-zinc-400">
                  <tr>
                    <th className="p-2 text-left">COL</th>
                    <th className="p-2 text-left">LIABILITY NAME</th>
                    <th className="p-2 text-right">STARTING PRINCIPAL</th>
                    <th className="p-2 text-right">PAID TO DATE</th>
                    <th className="p-2 text-right">CURRENT DUE</th>
                    <th className="p-2 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loans.map((l) => (
                    <tr key={l.id} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="p-2 text-zinc-500 font-bold">{l.columnLetter}</td>
                      <td className="p-2 text-white font-sans font-medium">{l.name}</td>
                      <td className="p-2 text-right text-zinc-300">{formatINR(l.initialPrincipal)}</td>
                      <td className="p-2 text-right text-credit font-medium">{formatINR(l.paidToDate)}</td>
                      <td className="p-2 text-right text-zinc-100 font-medium">{formatINR(l.currentDue)}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium border ${
                            l.currentDue === 0
                              ? 'bg-credit/10 text-credit border-credit/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {l.currentDue === 0 ? 'SETTLED' : `${l.progressPercent}% CLEARED`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Ledger */}
        {activeTab === 'ledger' && (
          <div className="p-4 space-y-4 font-sans">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 tabular-nums">
              <Table className="h-4 w-4 text-amber-500" />
              Splits sheet
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#121214]">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-[#18181B] border-b border-white/[0.07] text-zinc-400">
                  <tr>
                    <th className="p-2 text-center">ROW</th>
                    <th className="p-2 text-left">DATE</th>
                    <th className="p-2 text-left">DESCRIPTION</th>
                    <th className="p-2 text-left">BENEFICIARIES</th>
                    <th className="p-2 text-right">TOTAL (₹)</th>
                    <th className="p-2 text-right">MY SHARE (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {peerLedger.map((p) => (
                    <tr key={p.rowIndex} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="p-2 text-center text-zinc-500">{p.rowIndex}</td>
                      <td className="p-2 text-zinc-300">{p.date}</td>
                      <td className="p-2 text-white font-sans font-medium">{p.description}</td>
                      <td className="p-2 text-amber-400">{p.splitWith}</td>
                      <td className="p-2 text-right text-zinc-300">{formatINR(p.amount)}</td>
                      <td className="p-2 text-right text-white font-medium">{formatINR(p.perPersonShare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Classic Excel Status Bar */}
      <div className="border-t border-white/[0.07] bg-[#121214] px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-zinc-400 tabular-nums">
        <div className="flex items-center gap-3">
          {reorderMutation.isPending || sortExpensesMutation.isPending ? (
            <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Syncing…
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Check className="h-3 w-3" />
              Ready
            </span>
          )}
          <span className="hidden sm:inline">
            Active: <strong className="text-white">{selectedCell.col}{selectedCell.row}</strong>
          </span>
          <span>
            Rows: <strong className="text-white">{filteredExpenses.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline">
            Today&apos;s row:{' '}
            <strong className="text-amber-400 tabular-nums">
              Row {anchorEntry?.rowIndex || 240} ({anchorEntry ? formatINR(anchorEntry.balance) : '₹1,14,021'})
            </strong>
          </span>
          <span className="text-xs text-zinc-500 hidden sm:inline">
            Double-click a cell to edit, Enter to save, drag a row to move it
          </span>
        </div>
      </div>
    </div>
  );
}
