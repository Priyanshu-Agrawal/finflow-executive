'use client';

import React, { useState } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Navbar } from '@/components/layout/Navbar';
import { QuickLogForm } from '@/components/logger/QuickLogForm';
import { EmiSchedulerForm } from '@/components/logger/EmiSchedulerForm';
import { formatDisplayDate, formatINR } from '@/lib/date-utils';
import { Clock, PlusCircle, Sliders } from 'lucide-react';

export default function QuickLogPage() {
  const [referenceDate, setReferenceDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [activeTab, setActiveTab] = useState<'daily' | 'emi'>('daily');

  const { data, refetch, isFetching } = useFinancials(referenceDate);

  // Recent 5 transactions
  const recentTransactions = data?.expenses.slice(-5).reverse() || [];

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
      <Navbar
        referenceDate={referenceDate}
        onDateChange={setReferenceDate}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8 space-y-4 sm:space-y-6">
        <div className="pb-4 border-b border-white/[0.07]">
          <h1 className="text-xl font-medium text-white flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-amber-500" />
            Quick Logging & Multi-Month Generators
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Log ad-hoc transactions or schedule recurring multi-month obligations directly to Google Sheets
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#18181B] p-1">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'daily'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>1-Tap Daily Quick Log</span>
          </button>
          <button
            onClick={() => setActiveTab('emi')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'emi'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Multi-Month EMI Scheduler</span>
          </button>
        </div>

        {/* Selected Form */}
        {activeTab === 'daily' ? (
          <QuickLogForm defaultDate={referenceDate} />
        ) : (
          <EmiSchedulerForm />
        )}

        {/* Recent Ledger Entries Preview */}
        {recentTransactions.length > 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-lg">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Latest Sheet Entries
            </h3>
            <div className="space-y-2">
              {recentTransactions.map((e) => (
                <div
                  key={e.rowIndex}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.05] bg-[#18181B] text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">#{e.rowIndex}</span>
                    <span className="text-zinc-400">{formatDisplayDate(e.date)}</span>
                    <span className="font-sans font-medium text-white">{e.description}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-bold ${
                        e.type === 'CREDIT' ? 'text-emerald-400' : 'text-zinc-100'
                      }`}
                    >
                      {e.type === 'CREDIT' ? '+' : '-'}{formatINR(e.amount)}
                    </span>
                    <span className="text-zinc-100 font-mono font-medium">{formatINR(e.balance)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
