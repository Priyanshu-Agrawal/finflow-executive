'use client';

import React from 'react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { BudgetPacingPanel } from '@/components/dashboard/BudgetPacingPanel';
import { BalanceTimeline } from '@/components/dashboard/BalanceTimeline';

export default function BudgetPage() {
  const { data, isLoading, error, refetch, referenceDate } = useFrame();

  return (
    <>
      <PageHeader title="Budget" description="What you can spend each day, what this cycle's budget has left, and your settings." />
      <DataState isLoading={isLoading} error={error} onRetry={refetch} label="Loading your budget…">
        {data && (
          <div className="space-y-5">
            {data.budgetPacing ? (
              <BudgetPacingPanel pacing={data.budgetPacing} />
            ) : (
              <p className="text-sm text-zinc-400">No budget figures yet.</p>
            )}
            <BalanceTimeline expenses={data.expenses} referenceDate={referenceDate} />
          </div>
        )}
      </DataState>
    </>
  );
}
