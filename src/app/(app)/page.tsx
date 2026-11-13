'use client';

import React from 'react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { ExecutiveHero } from '@/components/dashboard/ExecutiveHero';
import { SavingsMeter } from '@/components/dashboard/SavingsMeter';
import { BudgetSummaryCard } from '@/components/dashboard/BudgetSummaryCard';
import { DebtSummaryCard } from '@/components/dashboard/DebtSummaryCard';
import { BalanceTimeline } from '@/components/dashboard/BalanceTimeline';
import { SpendingBreakdown } from '@/components/dashboard/SpendingBreakdown';
import { homeSpendingCategories } from '@/lib/home-text';

export default function HomePage() {
  const { data, isLoading, error, refetch, referenceDate, openLog } = useFrame();

  return (
    <>
      <PageHeader title="Home" />
      <DataState isLoading={isLoading} error={error} onRetry={refetch} label="Loading your money…">
        {data && (
          <div className="space-y-5">
            <ExecutiveHero
              kpis={data.kpis}
              expenses={data.expenses}
              loans={data.loans}
              referenceDate={referenceDate}
              onOpenQuickLog={openLog}
            />

            {/* Two things you act on: what you can spend today, what you still owe.
                Full detail (and the config drawer) is one tap away, not repeated here. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.budgetPacing && <BudgetSummaryCard pacing={data.budgetPacing} />}
              <DebtSummaryCard loans={data.loans} />
            </div>

            <BalanceTimeline expenses={data.expenses} referenceDate={referenceDate} />

            {data.savingsTrend && <SavingsMeter trend={data.savingsTrend} />}

            <SpendingBreakdown categories={homeSpendingCategories(data.spendingCategories)} />
          </div>
        )}
      </DataState>
    </>
  );
}
