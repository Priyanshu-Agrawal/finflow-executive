'use client';

import React, { useState } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Navbar } from '@/components/layout/Navbar';
import { ExecutiveHero } from '@/components/dashboard/ExecutiveHero';
import { ModernBudgetPacing } from '@/components/dashboard/ModernBudgetPacing';
import { BalanceTimeline } from '@/components/dashboard/BalanceTimeline';
import { SpendingBreakdown } from '@/components/dashboard/SpendingBreakdown';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { ExcelSpreadsheet } from '@/components/excel/ExcelSpreadsheet';
import { BcaCyclePanel } from '@/components/loans/BcaCyclePanel';
import { LoanPortfolio } from '@/components/loans/LoanPortfolio';
import { MilestoneTimeline } from '@/components/loans/MilestoneTimeline';
import { LoanSimulator } from '@/components/loans/LoanSimulator';
import { PeerLedgerTable } from '@/components/ledger/PeerLedgerTable';
import { MeteorHub } from '@/components/meteor/MeteorHub';
import { QuickLogForm } from '@/components/logger/QuickLogForm';
import { EmiSchedulerForm } from '@/components/logger/EmiSchedulerForm';
import {
  AlertCircle,
  Compass,
  CreditCard,
  FileSpreadsheet,
  Gauge,
  Layers,
  LineChart,
  Loader2,
  TableProperties,
  Users,
  X,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const [referenceDate, setReferenceDate] = useState('2026-11-10');
  const [generalBudget, setGeneralBudget] = useState(15000);
  const [electricityBudget, setElectricityBudget] = useState(3200);
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'expenses' | 'excel' | 'loans' | 'ledger' | 'meteor'>('overview');

  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isEmiSchedulerOpen, setIsEmiSchedulerOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useFinancials(
    referenceDate,
    generalBudget,
    electricityBudget
  );

  const bikeLoan = data?.loans?.find(
    (l) => l.name.toLowerCase().includes('bike') || l.id === 'bike'
  );

  const tabItems = [
    { id: 'overview', label: 'Overview & Cash Flow', icon: LineChart },
    { id: 'budget', label: 'Budget Burn (₹15k)', icon: Gauge, badge: '525/d' },
    { id: 'expenses', label: 'Ledger (314+)', icon: FileSpreadsheet },
    { id: 'excel', label: 'Excel Mode', icon: TableProperties, isGreen: true },
    { id: 'loans', label: 'Loans & Payoff', icon: CreditCard },
    { id: 'ledger', label: 'Peer Split', icon: Users },
    { id: 'meteor', label: 'Meteor 350', icon: Compass },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <Navbar
        referenceDate={referenceDate}
        onDateChange={setReferenceDate}
        onOpenQuickLog={() => setIsQuickLogOpen(true)}
        onOpenEmiScheduler={() => setIsEmiSchedulerOpen(true)}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-10 space-y-5">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-slate-400">
              Synchronizing with Google Sheets ledger...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-6 text-center space-y-3">
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

        {/* Loaded Master Content */}
        {data && (
          <>
            {/* 1. Master Executive Hero Card */}
            <ExecutiveHero
              kpis={data.kpis}
              referenceDate={referenceDate}
              onOpenQuickLog={() => setIsQuickLogOpen(true)}
              onOpenEmiScheduler={() => setIsEmiSchedulerOpen(true)}
              onSelectTab={(t) => setActiveTab(t as any)}
            />

            {/* 2. Sleek Segmented Switcher Bar (Mobile Horizontal Swipeable) */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl border border-white/[0.06] bg-[#0c0e14]/80 backdrop-blur-md no-scrollbar">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? tab.isGreen
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                          : 'bg-white/[0.1] text-white shadow-sm'
                        : tab.isGreen
                        ? 'text-emerald-400 hover:bg-emerald-950/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3. Tab Contents */}

            {/* Tab: Overview & Cash Flow */}
            {activeTab === 'overview' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Cash Flow Timeline Curve */}
                <BalanceTimeline expenses={data.expenses} referenceDate={referenceDate} />

                {/* Monthly Budget Burn Snapshot */}
                {data.budgetPacing && (
                  <ModernBudgetPacing
                    pacing={data.budgetPacing}
                    onUpdateGeneralBudget={setGeneralBudget}
                    onUpdateElectricityBudget={setElectricityBudget}
                    onOpenQuickLog={() => setIsQuickLogOpen(true)}
                  />
                )}

                {/* Spending Outflows & Discretionary Leaks */}
                <SpendingBreakdown categories={data.spendingCategories} />

                {/* Active BCA Education Cycle */}
                <BcaCyclePanel bcaCycle={data.bcaCycle} />

                {/* Milestone Roadmap */}
                <MilestoneTimeline />
              </div>
            )}

            {/* Tab: Budget Burn Engine */}
            {activeTab === 'budget' && data.budgetPacing && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <ModernBudgetPacing
                  pacing={data.budgetPacing}
                  onUpdateGeneralBudget={setGeneralBudget}
                  onUpdateElectricityBudget={setElectricityBudget}
                  onOpenQuickLog={() => setIsQuickLogOpen(true)}
                />

                {/* Cash Flow Timeline Context */}
                <BalanceTimeline expenses={data.expenses} referenceDate={referenceDate} />
              </div>
            )}

            {/* Tab: Expenses Ledger */}
            {activeTab === 'expenses' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <ExpenseTable expenses={data.expenses} referenceDate={referenceDate} />
              </div>
            )}

            {/* Tab: Excel Mode Grid Engine */}
            {activeTab === 'excel' && (
              <div className="animate-in fade-in duration-200">
                <ExcelSpreadsheet
                  expenses={data.expenses}
                  loans={data.loans}
                  peerLedger={data.peerLedger}
                  meteorAccessories={data.meteorAccessories}
                  meteorCosts={data.meteorCosts}
                  onOpenQuickLog={() => setIsQuickLogOpen(true)}
                />
              </div>
            )}

            {/* Tab: Loans & Amortization */}
            {activeTab === 'loans' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <BcaCyclePanel bcaCycle={data.bcaCycle} />
                <LoanPortfolio loans={data.loans} />
                <MilestoneTimeline />
                <LoanSimulator />
              </div>
            )}

            {/* Tab: Peer Split Ledger */}
            {activeTab === 'ledger' && (
              <div className="animate-in fade-in duration-200">
                <PeerLedgerTable entries={data.peerLedger || []} />
              </div>
            )}

            {/* Tab: Meteor 350 Asset Hub */}
            {activeTab === 'meteor' && (
              <div className="animate-in fade-in duration-200">
                <MeteorHub
                  accessories={data.meteorAccessories || []}
                  costs={data.meteorCosts || []}
                  bikeLoan={bikeLoan}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Quick Log Modal Overlay */}
      {isQuickLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsQuickLogOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsEmiSchedulerOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08]"
            >
              <X className="h-5 w-5" />
            </button>
            <EmiSchedulerForm
              onClose={() => setIsEmiSchedulerOpen(false)}
              onSuccess={() => setIsEmiSchedulerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-white/[0.06] bg-[#07090e] py-6 text-center text-xs text-slate-500">
        <p>FinFlow Executive • Google Sheets Engine (19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A)</p>
        <p className="mt-1 text-[11px] text-slate-600">Formula Lineage Defense Active • Column E Calculation Intact</p>
      </footer>
    </div>
  );
}
