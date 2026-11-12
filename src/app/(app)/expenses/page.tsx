'use client';

import React from 'react';
import { Plus, Sliders } from 'lucide-react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';

export default function LedgerPage() {
  const { data, isLoading, error, refetch, referenceDate, openLog, openEmi } = useFrame();

  return (
    <>
      <PageHeader
        title="Ledger"
        description="Every transaction, past and planned."
        actions={
          <>
            <button
              type="button"
              onClick={openEmi}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#18181B] px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-amber-500/40 transition-colors"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Schedule EMI</span>
            </button>
            <button
              type="button"
              onClick={openLog}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition-colors shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Log</span>
            </button>
          </>
        }
      />
      <DataState isLoading={isLoading} error={error} onRetry={refetch} label="Loading your ledger…">
        {data && <ExpenseTable expenses={data.expenses} referenceDate={referenceDate} />}
      </DataState>
    </>
  );
}
