'use client';

import React from 'react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { SectionLink } from '@/components/ui/SectionLink';
import { ExecutiveHero } from '@/components/dashboard/ExecutiveHero';
import { SavingsMeter } from '@/components/dashboard/SavingsMeter';
import { BudgetPacingPanel } from '@/components/dashboard/BudgetPacingPanel';
import { BalanceTimeline } from '@/components/dashboard/BalanceTimeline';
import { SpendingBreakdown } from '@/components/dashboard/SpendingBreakdown';
import { LoanPortfolio } from '@/components/loans/LoanPortfolio';
import { MilestoneTimeline } from '@/components/loans/MilestoneTimeline';

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

            <BalanceTimeline expenses={data.expenses} referenceDate={referenceDate} />

            {data.savingsTrend && <SavingsMeter trend={data.savingsTrend} />}

            {data.budgetPacing && (
              <section className="space-y-1">
                <BudgetPacingPanel pacing={data.budgetPacing} />
                <SectionLink href="/budget">Open Budget</SectionLink>
              </section>
            )}

            <SpendingBreakdown categories={data.spendingCategories} />

            <section className="space-y-5">
              <LoanPortfolio
                loans={data.loans}
                referenceDate={referenceDate}
                recentExpenses={data.expenses}
                b2RawValue={data.bcaCycle?.b2Value}
              />
              <MilestoneTimeline loans={data.loans} />
              <SectionLink href="/loans">Open Loans</SectionLink>
            </section>
          </div>
        )}
      </DataState>
    </>
  );
}
