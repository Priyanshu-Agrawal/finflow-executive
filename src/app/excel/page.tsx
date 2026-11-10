'use client';

import React, { useState } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Navbar } from '@/components/layout/Navbar';
import { ExcelSpreadsheet } from '@/components/excel/ExcelSpreadsheet';
import { QuickLogForm } from '@/components/logger/QuickLogForm';
import { EmiSchedulerForm } from '@/components/logger/EmiSchedulerForm';
import { AlertCircle, Loader2, TableProperties, X } from 'lucide-react';

export default function ExcelPage() {
  const [referenceDate, setReferenceDate] = useState('2026-11-10');
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isEmiSchedulerOpen, setIsEmiSchedulerOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useFinancials(referenceDate);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        referenceDate={referenceDate}
        onDateChange={setReferenceDate}
        onOpenQuickLog={() => setIsQuickLogOpen(true)}
        onOpenEmiScheduler={() => setIsEmiSchedulerOpen(true)}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4 pb-24 lg:pb-8 flex flex-col">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-slate-400">
              Initializing FinFlow Excel Grid Engine...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Connection Error</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">
              {(error as Error)?.message || 'Failed to communicate with Google Sheets.'}
            </p>
            <button
              onClick={() => refetch()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Excel Spreadsheet View */}
        {data && (
          <ExcelSpreadsheet
            expenses={data.expenses || []}
            loans={data.loans || []}
            peerLedger={data.peerLedger || []}
            meteorAccessories={data.meteorAccessories || []}
            meteorCosts={data.meteorCosts || []}
            onOpenQuickLog={() => setIsQuickLogOpen(true)}
          />
        )}
      </main>

      {/* Quick Log Modal Overlay */}
      {isQuickLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsQuickLogOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
