'use client';

import React, { useState } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Navbar } from '@/components/layout/Navbar';
import { MeteorHub } from '@/components/meteor/MeteorHub';
import { QuickLogForm } from '@/components/logger/QuickLogForm';
import { EmiSchedulerForm } from '@/components/logger/EmiSchedulerForm';
import { AlertCircle, Compass, Loader2, X } from 'lucide-react';

export default function MeteorPage() {
  const [referenceDate, setReferenceDate] = useState('2026-11-10');
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isEmiSchedulerOpen, setIsEmiSchedulerOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useFinancials(referenceDate);

  const bikeLoan = data?.loans?.find(
    (l) => l.name.toLowerCase().includes('bike') || l.id === 'bike'
  );

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="h-5 w-5 text-indigo-400" />
              Royal Enfield Meteor 350 Asset Hub
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Capital purchase invoice breakdown, OEM vs Aftermarket accessory pricing, and active loan liquidation
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-slate-400">
              Loading Meteor 350 asset catalog from Google Sheets...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Connection Error</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">
              {(error as Error)?.message || 'Failed to fetch Meteor data.'}
            </p>
            <button
              onClick={() => refetch()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Loaded Data View */}
        {data && (
          <MeteorHub
            accessories={data.meteorAccessories || []}
            costs={data.meteorCosts || []}
            bikeLoan={bikeLoan}
          />
        )}
      </main>

      {/* Quick Log Modal Overlay */}
      {isQuickLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl relative">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
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
