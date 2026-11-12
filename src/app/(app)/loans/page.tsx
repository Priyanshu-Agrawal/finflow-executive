'use client';

import React from 'react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { LoanPortfolio } from '@/components/loans/LoanPortfolio';
import { MilestoneTimeline } from '@/components/loans/MilestoneTimeline';
import { LoanSimulator } from '@/components/loans/LoanSimulator';

export default function LoansPage() {
  const { data, isLoading, error, refetch, referenceDate } = useFrame();

  return (
    <>
      <PageHeader title="Loans" description="What you owe, what is paid, and when each loan ends." />
      <DataState isLoading={isLoading} error={error} onRetry={refetch} label="Loading your loans…">
        {data && (
          <div className="space-y-6 sm:space-y-8">
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
      </DataState>
    </>
  );
}
