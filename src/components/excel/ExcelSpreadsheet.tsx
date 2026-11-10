'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ExpenseEntry,
  LoanStatus,
  RawLoanRow,
  PeerLedgerEntry,
  TransactionType,
} from '@/lib/types';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import { useUpdateExpense, useToggleType } from '@/hooks/useFinancials';
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Grid,
  Info,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Table,
  TableProperties,
  X,
} from 'lucide-react';

interface ExcelSpreadsheetProps {
  expenses: ExpenseEntry[];
  loans: LoanStatus[];
  peerLedger: PeerLedgerEntry[];
  onOpenQuickLog?: () => void;
}

type SheetTab = 'expenses' | 'loans' | 'ledger';

export function ExcelSpreadsheet({
  expenses,
  loans,
  peerLedger,
  onOpenQuickLog,
}: ExcelSpreadsheetProps) {
  const [activeTab, setActiveTab] = useState<SheetTab>('expenses');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string }>({
    row: 239,
    col: 'B',
  });
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [jumpRowInput, setJumpRowInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const updateMutation = useUpdateExpense();
  const toggleMutation = useToggleType();

  const editInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Focus inline edit input when entering edit mode
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Keyboard navigation across cells
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Active cell item lookup
  const currentExpenseRow = useMemo(() => {
    return expenses.find((e) => e.rowIndex === selectedCell.row);
  }, [expenses, selectedCell.row]);

  // Filtered expenses for Grid
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

  // Start cell edit
  const startCellEdit = (row: number, col: string) => {
    if (col === 'E') {
      // Column E is protected formula
      return;
    }
    const item = expenses.find((e) => e.rowIndex === row);
    if (!item) return;

    let initialVal = '';
    if (col === 'A') initialVal = item.date;
    else if (col === 'B') initialVal = item.description;
    else if (col === 'C') initialVal = String(item.amount);
    else if (col === 'D') initialVal = item.type;

    setEditingCell({ row, col });
    setEditValue(initialVal);
  };

  // Commit cell edit
  const commitCellEdit = async () => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    const item = expenses.find((e) => e.rowIndex === row);
    if (!item) {
      setEditingCell(null);
      return;
    }

    let updatedDate = item.date;
    let updatedDesc = item.description;
    let updatedAmt = item.amount;
    let updatedType = item.type;

    if (col === 'A') updatedDate = editValue.trim() || item.date;
    else if (col === 'B') updatedDesc = editValue.trim() || item.description;
    else if (col === 'C') updatedAmt = Number(editValue) || item.amount;
    else if (col === 'D') {
      const upper = editValue.trim().toUpperCase();
      if (['DEBIT', 'CREDIT', 'SETTLEMENT'].includes(upper)) {
        updatedType = upper as TransactionType;
      }
    }

    try {
      await updateMutation.mutateAsync({
        rowIndex: row,
        data: {
          date: updatedDate,
          description: updatedDesc,
          amount: updatedAmt,
          type: updatedType,
        },
      });
      setSaveSuccessMsg(`Saved ${col}${row}`);
      setTimeout(() => setSaveSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Failed to commit cell edit', err);
    }

    setEditingCell(null);
  };

  // Jump to row
  const handleJumpRow = (e: React.FormEvent) => {
    e.preventDefault();
    const rowNum = parseInt(jumpRowInput);
    if (!isNaN(rowNum) && rowNum >= 2) {
      setSelectedCell({ row: rowNum, col: 'B' });
      // Scroll row into view
      const el = document.getElementById(`excel-row-${rowNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Export current active tab to CSV
  const handleExportCSV = () => {
    let rows: (string | number)[][] = [];
    let filename = `FinFlow_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'expenses') {
      rows.push(['Row', 'Date', 'Description', 'Amount', 'Type', 'Balance']);
      expenses.forEach((e) => {
        rows.push([e.rowIndex, e.date, e.description, e.amount, e.type, e.balance]);
      });
    } else if (activeTab === 'loans') {
      rows.push(['Loan ID', 'Loan Name', 'Initial Principal', 'Paid to Date', 'Current Due', 'Progress %']);
      loans.forEach((l) => {
        rows.push([l.id, l.name, l.initialPrincipal, l.paidToDate, l.currentDue, `${l.progressPercent}%`]);
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
    <div className="flex flex-col h-[calc(100vh-8.5rem)] rounded-2xl border border-[#514535]/40 bg-[#100D0A] overflow-hidden shadow-2xl">
      {/* Top Excel Ribbon Toolbar */}
      <div className="border-b border-[#514535]/30 bg-[#161310] px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Mode Title & Sheet Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f0a93c]/15 border border-[#f0a93c]/30 text-[#ffc981] font-mono font-bold text-xs">
            <TableProperties className="h-4 w-4 text-[#f0a93c]" />
            <span className="hidden sm:inline">FinFlow</span> Matrix View
          </div>

          {/* Sheet Tab Switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-[#1e1b18] p-1 border border-[#514535]/30">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                  : 'text-[#9e8e7c] hover:text-[#e9e1db]'
              }`}
            >
              Expenses (A1:E314)
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'loans'
                  ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                  : 'text-[#9e8e7c] hover:text-[#e9e1db]'
              }`}
            >
              Loans
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ledger'
                  ? 'bg-[#f0a93c] text-[#161310] font-bold shadow-sm'
                  : 'text-[#9e8e7c] hover:text-[#e9e1db]'
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
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#9e8e7c]" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-[#514535]/40 bg-[#1e1b18] pl-8 pr-2.5 py-1 text-xs text-[#e9e1db] placeholder-[#9e8e7c] w-28 sm:w-40 focus:border-[#f0a93c] focus:outline-none transition-colors"
                />
              </div>

              {/* Jump to Row */}
              <form onSubmit={handleJumpRow} className="hidden md:flex items-center gap-1">
                <span className="text-[11px] font-mono text-[#9e8e7c]">Go:</span>
                <input
                  type="number"
                  placeholder="Row #"
                  value={jumpRowInput}
                  onChange={(e) => setJumpRowInput(e.target.value)}
                  className="w-16 rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-2 py-1 text-xs font-mono text-[#e9e1db] focus:border-[#f0a93c] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#1e1b18] border border-[#514535]/40 px-2 py-1 text-xs font-semibold text-[#d6c4af] hover:text-[#e9e1db] hover:border-[#f0a93c]/40"
                >
                  Go
                </button>
              </form>
            </>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-[#514535]/40 bg-[#1e1b18] px-2.5 py-1 text-xs font-semibold text-[#d6c4af] hover:text-[#e9e1db] hover:border-[#f0a93c]/40 transition-colors"
            title="Download CSV file of current active sheet"
          >
            <Download className="h-3.5 w-3.5 text-[#ffc981]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Quick Insert Row */}
          {onOpenQuickLog && (
            <button
              onClick={onOpenQuickLog}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f0a93c] to-[#edbf70] px-3 py-1 text-xs font-bold text-[#161310] hover:brightness-110 transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Insert Row</span>
            </button>
          )}
        </div>
      </div>

      {/* Classic Excel Formula Bar (fx) */}
      {activeTab === 'expenses' && (
        <div className="border-b border-[#514535]/30 bg-[#161310] px-3 py-1.5 flex items-center gap-2 text-xs font-mono">
          {/* Active Cell Reference Pill */}
          <div className="w-16 sm:w-20 rounded-lg bg-[#1e1b18] border border-[#f0a93c]/40 px-2 py-0.5 text-center font-bold text-[#ffc981]">
            {selectedCell.col}
            {selectedCell.row}
          </div>

          {/* fx Function Symbol */}
          <div className="text-[#f0a93c] font-serif italic font-bold select-none">
            fx
          </div>

          {/* Formula Display / Value Input */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            <div className="flex-1 rounded-lg bg-[#110e0b] border border-[#514535]/40 px-2.5 py-0.5 text-[#e9e1db] select-all truncate font-mono">
              {formulaBarContent || <span className="text-[#9e8e7c] italic">Empty cell</span>}
            </div>

            {selectedCell.col === 'E' && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-sans font-semibold text-[#ffc981] bg-[#f0a93c]/15 px-2 py-0.5 rounded border border-[#f0a93c]/30 whitespace-nowrap">
                <Lock className="h-3 w-3" />
                Formula Protected
              </span>
            )}

            {saveSuccessMsg && (
              <span className="flex items-center gap-1 text-[10px] font-sans font-bold text-[#edbf70] animate-in fade-in">
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
        className="flex-1 overflow-auto bg-[#100D0A] text-xs font-mono select-none"
      >
        {activeTab === 'expenses' && (
          <table className="w-full border-collapse border border-[#514535]/30 min-w-[700px]">
            {/* Column Header Row */}
            <thead className="sticky top-0 z-20 bg-[#1e1b18] text-[#9e8e7c] border-b border-[#514535]/40 shadow-sm">
              <tr>
                {/* Top-Left Corner Box */}
                <th className="w-14 border-r border-b border-[#514535]/30 p-1.5 text-center font-mono text-[11px] text-[#9e8e7c] bg-[#1e1b18] sticky left-0 z-30">
                  ◢
                </th>
                <th
                  className={`border-r border-b border-[#514535]/30 p-1.5 text-center transition-colors ${
                    selectedCell.col === 'A' ? 'bg-[#f0a93c]/20 text-[#ffc981] font-bold' : ''
                  }`}
                >
                  A <span className="font-sans text-[10px] opacity-75">(Date)</span>
                </th>
                <th
                  className={`border-r border-b border-[#514535]/30 p-1.5 text-left transition-colors ${
                    selectedCell.col === 'B' ? 'bg-[#f0a93c]/20 text-[#ffc981] font-bold' : ''
                  }`}
                >
                  B <span className="font-sans text-[10px] opacity-75">(Description)</span>
                </th>
                <th
                  className={`border-r border-b border-[#514535]/30 p-1.5 text-right transition-colors ${
                    selectedCell.col === 'C' ? 'bg-[#f0a93c]/20 text-[#ffc981] font-bold' : ''
                  }`}
                >
                  C <span className="font-sans text-[10px] opacity-75">(Amount ₹)</span>
                </th>
                <th
                  className={`border-r border-b border-[#514535]/30 p-1.5 text-center transition-colors ${
                    selectedCell.col === 'D' ? 'bg-[#f0a93c]/20 text-[#ffc981] font-bold' : ''
                  }`}
                >
                  D <span className="font-sans text-[10px] opacity-75">(Credit/Debit)</span>
                </th>
                <th
                  className={`border-b border-[#514535]/30 p-1.5 text-right transition-colors ${
                    selectedCell.col === 'E' ? 'bg-[#f0a93c]/20 text-[#ffc981] font-bold' : ''
                  }`}
                >
                  E <span className="font-sans text-[10px] opacity-75">(Remaining Balance fx)</span>
                </th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody>
              {filteredExpenses.map((e) => {
                const rowNum = e.rowIndex;
                const isSelectedRow = selectedCell.row === rowNum;

                return (
                  <tr
                    key={rowNum}
                    id={`excel-row-${rowNum}`}
                    className={`hover:bg-slate-900/40 transition-colors ${
                      rowNum === 239 ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    {/* Row Header Number */}
                    <td
                      className={`border-r border-b border-[#514535]/30 p-1 text-center font-mono text-[11px] sticky left-0 z-10 transition-colors ${
                        isSelectedRow
                          ? 'bg-[#f0a93c]/20 text-[#ffc981] font-bold border-r-2 border-r-[#f0a93c]'
                          : 'bg-[#1e1b18] text-[#9e8e7c]'
                      }`}
                    >
                      {rowNum}
                    </td>

                    {/* Cell A: Date */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'A' })}
                      onDoubleClick={() => startCellEdit(rowNum, 'A')}
                      className={`border-r border-b border-[#514535]/20 p-1.5 text-[#d6c4af] cursor-cell transition-all ${
                        isSelectedRow && selectedCell.col === 'A'
                          ? 'ring-2 ring-[#f0a93c] bg-[#f0a93c]/15 font-bold text-white relative z-10'
                          : ''
                      }`}
                    >
                      {editingCell?.row === rowNum && editingCell?.col === 'A' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(ev) => setEditValue(ev.target.value)}
                          onBlur={commitCellEdit}
                          className="w-full bg-[#110e0b] text-white font-mono text-xs px-1 py-0.5 outline-none ring-2 ring-[#f0a93c] rounded"
                        />
                      ) : (
                        e.date
                      )}
                    </td>

                    {/* Cell B: Description */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'B' })}
                      onDoubleClick={() => startCellEdit(rowNum, 'B')}
                      className={`border-r border-b border-[#514535]/20 p-1.5 font-medium text-[#e9e1db] cursor-cell transition-all ${
                        isSelectedRow && selectedCell.col === 'B'
                          ? 'ring-2 ring-[#f0a93c] bg-[#f0a93c]/15 font-bold text-white relative z-10'
                          : ''
                      }`}
                    >
                      {editingCell?.row === rowNum && editingCell?.col === 'B' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(ev) => setEditValue(ev.target.value)}
                          onBlur={commitCellEdit}
                          className="w-full bg-[#110e0b] text-white text-xs px-1 py-0.5 outline-none ring-2 ring-[#f0a93c] rounded"
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <span>{e.description}</span>
                          {rowNum === 239 && (
                            <span className="rounded bg-[#f0a93c]/20 px-1 py-0.2 text-[9px] font-mono font-bold text-[#ffc981]">
                              ANCHOR
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Cell C: Amount */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'C' })}
                      onDoubleClick={() => startCellEdit(rowNum, 'C')}
                      className={`border-r border-b border-[#514535]/20 p-1.5 text-right font-serif font-bold cursor-cell transition-all ${
                        isSelectedRow && selectedCell.col === 'C'
                          ? 'ring-2 ring-[#f0a93c] bg-[#f0a93c]/15 font-bold text-white relative z-10'
                          : e.type === 'CREDIT'
                          ? 'text-[#edbf70]'
                          : 'text-[#ffb4ab]'
                      }`}
                    >
                      {editingCell?.row === rowNum && editingCell?.col === 'C' ? (
                        <input
                          ref={editInputRef}
                          type="number"
                          value={editValue}
                          onChange={(ev) => setEditValue(ev.target.value)}
                          onBlur={commitCellEdit}
                          className="w-full bg-[#110e0b] text-white text-right font-serif text-xs px-1 py-0.5 outline-none ring-2 ring-[#f0a93c] rounded"
                        />
                      ) : (
                        formatINR(e.amount)
                      )}
                    </td>

                    {/* Cell D: Type */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'D' })}
                      onDoubleClick={() => {
                        const nextType: TransactionType =
                          e.type === 'DEBIT' ? 'CREDIT' : e.type === 'CREDIT' ? 'SETTLEMENT' : 'DEBIT';
                        toggleMutation.mutate({ rowIndex: rowNum, newType: nextType });
                      }}
                      className={`border-r border-b border-[#514535]/20 p-1.5 text-center cursor-pointer transition-all ${
                        isSelectedRow && selectedCell.col === 'D'
                          ? 'ring-2 ring-[#f0a93c] bg-[#f0a93c]/15 relative z-10'
                          : ''
                      }`}
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                          e.type === 'CREDIT'
                            ? 'bg-[#edbf70]/15 text-[#edbf70] border border-[#edbf70]/30'
                            : e.type === 'DEBIT'
                            ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30'
                            : 'bg-[#f0a93c]/15 text-[#ffc981] border border-[#f0a93c]/30'
                        }`}
                        title="Double-click to cycle type"
                      >
                        {e.type}
                      </span>
                    </td>

                    {/* Cell E: Remaining Balance (Formula Backed) */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'E' })}
                      className={`border-b border-[#514535]/20 p-1.5 text-right font-mono font-semibold text-[#ffc981] cursor-cell transition-all ${
                        isSelectedRow && selectedCell.col === 'E'
                          ? 'ring-2 ring-[#f0a93c] bg-[#f0a93c]/15 font-bold text-white relative z-10'
                          : ''
                      }`}
                      title="Formula Backed Cell (=IF(OR(D...)))"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Lock className="h-2.5 w-2.5 text-[#f0a93c]" />
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
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Table className="h-4 w-4 text-emerald-400" />
              Sheet 'Loans' (gid=612682294) • Multi-Column Amortization Matrix
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs font-mono">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2 text-left">COL</th>
                    <th className="p-2 text-left">LIABILITY NAME</th>
                    <th className="p-2 text-right">STARTING PRINCIPAL</th>
                    <th className="p-2 text-right">PAID TO DATE</th>
                    <th className="p-2 text-right">CURRENT DUE</th>
                    <th className="p-2 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/50">
                      <td className="p-2 text-slate-500 font-bold">{l.columnLetter}</td>
                      <td className="p-2 text-white font-sans font-semibold">{l.name}</td>
                      <td className="p-2 text-right text-slate-300">{formatINR(l.initialPrincipal)}</td>
                      <td className="p-2 text-right text-emerald-400 font-bold">{formatINR(l.paidToDate)}</td>
                      <td className="p-2 text-right text-rose-400 font-bold">{formatINR(l.currentDue)}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            l.currentDue === 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
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
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Table className="h-4 w-4 text-emerald-400" />
              Sheet 'Ledger' (gid=78436858) • Peer-to-Peer Split Log
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs font-mono">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2 text-center">ROW</th>
                    <th className="p-2 text-left">DATE</th>
                    <th className="p-2 text-left">DESCRIPTION</th>
                    <th className="p-2 text-left">BENEFICIARIES</th>
                    <th className="p-2 text-right">TOTAL (₹)</th>
                    <th className="p-2 text-right">MY SHARE (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {peerLedger.map((p) => (
                    <tr key={p.rowIndex} className="hover:bg-slate-900/50">
                      <td className="p-2 text-center text-slate-500">{p.rowIndex}</td>
                      <td className="p-2 text-slate-300">{p.date}</td>
                      <td className="p-2 text-white font-sans font-medium">{p.description}</td>
                      <td className="p-2 text-indigo-300">{p.splitWith}</td>
                      <td className="p-2 text-right text-slate-300">{formatINR(p.amount)}</td>
                      <td className="p-2 text-right text-emerald-400 font-bold">{formatINR(p.perPersonShare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Classic Excel Status Bar */}
      <div className="border-t border-slate-800 bg-slate-900/90 px-3 sm:px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <Check className="h-3 w-3" />
            READY
          </span>
          <span className="hidden sm:inline">
            Active: <strong className="text-white">{selectedCell.col}{selectedCell.row}</strong>
          </span>
          <span>
            Rows: <strong className="text-white">{filteredExpenses.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline">
            Audit Baseline: <strong className="text-emerald-400">Row 239 (₹1,28,792)</strong>
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            DoubleClick to Edit • Enter to Save • Arrows to Navigate
          </span>
        </div>
      </div>
    </div>
  );
}
