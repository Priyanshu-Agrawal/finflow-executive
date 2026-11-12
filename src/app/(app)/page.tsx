'use client';

import React, { useState } from 'react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { ExecutiveHero } from '@/components/dashboard/ExecutiveHero';
import { SavingsMeter } from '@/components/dashboard/SavingsMeter';
import { ModernBudgetPacing } from '@/components/dashboard/ModernBudgetPacing';
import { BalanceTimeline } from '@/components/dashboard/BalanceTimeline';
import { SpendingBreakdown } from '@/components/dashboard/SpendingBreakdown';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { ExcelSpreadsheet } from '@/components/excel/ExcelSpreadsheet';
import { LoanPortfolio } from '@/components/loans/LoanPortfolio';
import { MilestoneTimeline } from '@/components/loans/MilestoneTimeline';
import { LoanSimulator } from '@/components/loans/LoanSimulator';
import { PeerLedgerTable } from '@/components/ledger/PeerLedgerTable';
import { CreditCard, FileSpreadsheet, Gauge, LineChart, TableProperties, Users } from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading, error, refetch, referenceDate, openLog, openEmi, config, updateConfig } = useFrame();
  const { generalBudget } = config;
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'expenses' | 'excel' | 'loans' | 'ledger'>('overview');

  const handleUpdateGeneralBudget = (val: number) => updateConfig({ generalBudget: val });
  const handleUpdateElectricityBudget = (val: number) => updateConfig({ electricityBudget: val });
  const handleUpdateBudgetRecurringDay = (val: number) => updateConfig({ budgetRecurringDay: val });
  const handleUpdateRentRecurringDay = (val: number) => updateConfig({ rentRecurringDay: val });
  const handleUpdateRentAmount = (val: number) => updateConfig({ rentAmount: val });
  const handleUpdateElectricityRemaining = (val: number) => updateConfig({ electricityRemaining: val });

  const tabItems = [
    { id: 'overview', label: 'Overview & Cash Flow', icon: LineChart },
    {
      id: 'budget',
      label: `Budget Burn (₹${(generalBudget / 1000).toFixed(0)}k)`,
      icon: Gauge,
      badge: data?.budgetPacing ? `₹${data.budgetPacing.generalPerDayLimit}/d` : 'Burn',
    },
    { id: 'expenses', label: 'Ledger (314+)', icon: FileSpreadsheet },
    { id: 'excel', label: 'Excel Mode', icon: TableProperties },
    { id: 'loans', label: 'Loans & Payoff', icon: CreditCard },
    { id: 'ledger', label: 'Peer Split', icon: Users },
  ];

  return (
    <>
      <PageHeader title="Home" />
      <DataState isLoading={isLoading} error={error} onRetry={refetch} label="Loading your money…">
        {data && (
          <>
            {/* 1. Master Executive Hero Card */}
            <ExecutiveHero
              kpis={data.kpis}
              referenceDate={referenceDate}
              onOpenQuickLog={openLog}
              onOpenEmiScheduler={openEmi}
              onSelectTab={(t) => setActiveTab(t as any)}
            />

            {/* 2. Sleek Segmented Switcher Bar (Unified Monochromatic/Amber) */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl border border-white/[0.07] bg-[#121214] no-scrollbar">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                        isActive
                          ? 'bg-black/25 text-zinc-950'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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

                {/* Savings per salary cycle */}
                {data.savingsTrend && <SavingsMeter trend={data.savingsTrend} />}

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
                    onOpenQuickLog={openLog}
                  />
                )}

                {/* Spending Outflows & Discretionary Leaks */}
                <SpendingBreakdown categories={data.spendingCategories} />

                {/* Unified Liabilities Portfolio */}
                <LoanPortfolio
                  loans={data.loans}
                  referenceDate={referenceDate}
                  recentExpenses={data.expenses}
                  b2RawValue={data.bcaCycle?.b2Value}
                />

                {/* Milestone Roadmap */}
                <MilestoneTimeline loans={data.loans} />
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
                  onOpenQuickLog={openLog}
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
                  referenceDate={referenceDate}
                  onOpenQuickLog={openLog}
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
                <MilestoneTimeline loans={data.loans} />
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
      </DataState>
    </>
  );
}
