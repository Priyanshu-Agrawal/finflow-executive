'use client';

import React, { useState } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Navbar } from '@/components/layout/Navbar';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { QuickLogForm } from '@/components/logger/QuickLogForm';
import { EmiSchedulerForm } from '@/components/logger/EmiSchedulerForm';
import { AlertCircle, FileSpreadsheet, Loader2, Plus, Sliders, X } from 'lucide-react';

export default function ExpensesPage() {
  const [referenceDate, setReferenceDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isEmiSchedulerOpen, setIsEmiSchedulerOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useFinancials(referenceDate);

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
      <Navbar
        referenceDate={referenceDate}
        onDateChange={setReferenceDate}
        onOpenQuickLog={() => setIsQuickLogOpen(true)}
        onOpenEmiScheduler={() => setIsEmiSchedulerOpen(true)}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
          <div>
            <h1 className="text-xl font-medium text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-amber-500" />
              High-Performance Expenses Ledger
            </h1>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              Continuous running ledger spanning 2025 past actuals to late 2027 future projections (Rows 1–314+)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEmiSchedulerOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#18181B] px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-amber-500/40 transition-colors"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Schedule EMI</span>
            </button>
            <button
              onClick={() => setIsQuickLogOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition-colors shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Log Transaction</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-9 w-9 animate-spin text-amber-400" />
            <p className="text-sm font-medium text-zinc-400">Loading ledger records...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center space-y-3">
            <AlertCircle className="h-9 w-9 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Connection Error</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">
              {(error as Error)?.message || 'Failed to fetch ledger from Google Sheets.'}
            </p>
          </div>
        )}

        {/* Content */}
        {data && (
          <ExpenseTable expenses={data.expenses} referenceDate={referenceDate} />
        )}
      </main>

      {/* Quick Log Modal Overlay */}
      {isQuickLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl relative">
            <button
              onClick={() => setIsQuickLogOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-xl p-1 text-zinc-400 hover:text-white hover:bg-white/[0.05]"
            >
              <X className="h-5 w-5" />
            </button>
            <QuickLogForm
              defaultDate={referenceDate}
              onSuccess={() => setIsQuickLogOpen(false)}
            />
          </div>
        </div>
      )}

      {/* EMI Scheduler Modal Overlay */}
      {isEmiSchedulerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl">
            <EmiSchedulerForm
              onClose={() => setIsEmiSchedulerOpen(false)}
              onSuccess={() => setIsEmiSchedulerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
