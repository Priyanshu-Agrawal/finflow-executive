'use client';

import React, { useEffect, useState } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Navbar } from '@/components/layout/Navbar';
import { ExecutiveHero } from '@/components/dashboard/ExecutiveHero';
import { ModernBudgetPacing } from '@/components/dashboard/ModernBudgetPacing';
import { BalanceTimeline } from '@/components/dashboard/BalanceTimeline';
import { SpendingBreakdown } from '@/components/dashboard/SpendingBreakdown';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { ExcelSpreadsheet } from '@/components/excel/ExcelSpreadsheet';
import { LoanPortfolio } from '@/components/loans/LoanPortfolio';
import { MilestoneTimeline } from '@/components/loans/MilestoneTimeline';
import { LoanSimulator } from '@/components/loans/LoanSimulator';
import { PeerLedgerTable } from '@/components/ledger/PeerLedgerTable';
import { QuickLogForm } from '@/components/logger/QuickLogForm';
import { EmiSchedulerForm } from '@/components/logger/EmiSchedulerForm';
import {
  AlertCircle,
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
  const [budgetRecurringDay, setBudgetRecurringDay] = useState(6);
  const [rentRecurringDay, setRentRecurringDay] = useState(15);
  const [rentAmount, setRentAmount] = useState(15000);
  const [electricityRemaining, setElectricityRemaining] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'expenses' | 'excel' | 'loans' | 'ledger'>('overview');

  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isEmiSchedulerOpen, setIsEmiSchedulerOpen] = useState(false);

  // Load custom cycle and factor configurations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('finflow_cycle_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.generalBudget === 'number') setGeneralBudget(parsed.generalBudget);
        if (typeof parsed.electricityBudget === 'number') setElectricityBudget(parsed.electricityBudget);
        if (typeof parsed.budgetRecurringDay === 'number') setBudgetRecurringDay(parsed.budgetRecurringDay);
        if (typeof parsed.rentRecurringDay === 'number') setRentRecurringDay(parsed.rentRecurringDay);
        if (typeof parsed.rentAmount === 'number') setRentAmount(parsed.rentAmount);
        if (typeof parsed.electricityRemaining === 'number') setElectricityRemaining(parsed.electricityRemaining);
      }
    } catch (e) {
      console.error('Failed to load cycle config from localStorage', e);
    }
  }, []);

  const persistConfig = (updates: Partial<{
    generalBudget: number;
    electricityBudget: number;
    budgetRecurringDay: number;
    rentRecurringDay: number;
    rentAmount: number;
    electricityRemaining: number;
  }>) => {
    try {
      const existing = localStorage.getItem('finflow_cycle_config');
      const current = existing ? JSON.parse(existing) : {};
      localStorage.setItem('finflow_cycle_config', JSON.stringify({ ...current, ...updates }));
    } catch (e) {
      console.error('Failed to save cycle config to localStorage', e);
    }
  };

  const handleUpdateGeneralBudget = (val: number) => {
    setGeneralBudget(val);
    persistConfig({ generalBudget: val });
  };
  const handleUpdateElectricityBudget = (val: number) => {
    setElectricityBudget(val);
    persistConfig({ electricityBudget: val });
  };
  const handleUpdateBudgetRecurringDay = (val: number) => {
    setBudgetRecurringDay(val);
    persistConfig({ budgetRecurringDay: val });
  };
  const handleUpdateRentRecurringDay = (val: number) => {
    setRentRecurringDay(val);
    persistConfig({ rentRecurringDay: val });
  };
  const handleUpdateRentAmount = (val: number) => {
    setRentAmount(val);
    persistConfig({ rentAmount: val });
  };
  const handleUpdateElectricityRemaining = (val: number) => {
    setElectricityRemaining(val);
    persistConfig({ electricityRemaining: val });
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useFinancials(
    referenceDate,
    generalBudget,
    electricityBudget,
    budgetRecurringDay,
    rentRecurringDay,
    rentAmount,
    electricityRemaining
  );

  const tabItems = [
    { id: 'overview', label: 'Overview & Cash Flow', icon: LineChart },
    {
      id: 'budget',
      label: `Budget Burn (₹${(generalBudget / 1000).toFixed(0)}k)`,
      icon: Gauge,
      badge: data?.budgetPacing ? `₹${data.budgetPacing.generalPerDayLimit}/d` : 'Burn',
    },
    { id: 'expenses', label: 'Ledger (314+)', icon: FileSpreadsheet },
    { id: 'excel', label: 'Excel Mode', icon: TableProperties, isGreen: true },
    { id: 'loans', label: 'Loans & Payoff', icon: CreditCard },
    { id: 'ledger', label: 'Peer Split', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#100D0A] text-[#E9E1DB] flex flex-col font-sans selection:bg-[#F0A93C]/30 selection:text-[#FFC981]">
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
            <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl border border-[rgba(246,239,227,0.08)] bg-[#161310] backdrop-blur-md no-scrollbar">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#F0A93C] text-[#100D0A] font-bold shadow-md shadow-[#F0A93C]/20'
                        : 'text-[#A89F91] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                        isActive
                          ? 'bg-[#100D0A]/30 text-[#100D0A]'
                          : 'bg-[#F0A93C]/15 text-[#F0A93C] border border-[#F0A93C]/20'
                      }`}>
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
                    onUpdateGeneralBudget={handleUpdateGeneralBudget}
                    onUpdateElectricityBudget={handleUpdateElectricityBudget}
                    onUpdateBudgetRecurringDay={handleUpdateBudgetRecurringDay}
                    onUpdateRentRecurringDay={handleUpdateRentRecurringDay}
                    onUpdateRentAmount={handleUpdateRentAmount}
                    onUpdateElectricityRemaining={handleUpdateElectricityRemaining}
                    onOpenQuickLog={() => setIsQuickLogOpen(true)}
                  />
                )}

                {/* Spending Outflows & Discretionary Leaks */}
                <SpendingBreakdown categories={data.spendingCategories} />

                {/* Unified Liabilities Portfolio (All Loans Clickable) */}
                <LoanPortfolio
                  loans={data.loans}
                  referenceDate={referenceDate}
                  recentExpenses={data.expenses}
                  b2RawValue={data.bcaCycle?.b2Value}
                />

                {/* Milestone Roadmap */}
                <MilestoneTimeline />
              </div>
            )}

            {/* Tab: Budget Burn Engine */}
            {activeTab === 'budget' && data.budgetPacing && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <ModernBudgetPacing
                  pacing={data.budgetPacing}
                  onUpdateGeneralBudget={handleUpdateGeneralBudget}
                  onUpdateElectricityBudget={handleUpdateElectricityBudget}
                  onUpdateBudgetRecurringDay={handleUpdateBudgetRecurringDay}
                  onUpdateRentRecurringDay={handleUpdateRentRecurringDay}
                  onUpdateRentAmount={handleUpdateRentAmount}
                  onUpdateElectricityRemaining={handleUpdateElectricityRemaining}
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
                  onOpenQuickLog={() => setIsQuickLogOpen(true)}
                />
              </div>
            )}

            {/* Tab: Loans & Amortization */}
            {activeTab === 'loans' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <LoanPortfolio
                  loans={data.loans}
                  referenceDate={referenceDate}
                  recentExpenses={data.expenses}
                  b2RawValue={data.bcaCycle?.b2Value}
                />
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
