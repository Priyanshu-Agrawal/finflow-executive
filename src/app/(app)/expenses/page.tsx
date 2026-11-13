'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Sliders } from 'lucide-react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';

// useSearchParams needs a Suspense boundary (Next requires it for a prerendered page); kept
// to this one small reader so the rest of the page is unaffected.
function CategoryFromUrl({ onCategory }: { onCategory: (category: string | null) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onCategory(searchParams.get('category'));
  }, [searchParams, onCategory]);
  return null;
}

export default function LedgerPage() {
  const { data, isLoading, error, refetch, referenceDate, openLog, openEmi } = useFrame();
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const clearCategoryFilter = useCallback(() => {
    setCategoryFilter(null);
    router.replace('/expenses');
  }, [router]);

  return (
    <>
      <Suspense fallback={null}>
        <CategoryFromUrl onCategory={setCategoryFilter} />
      </Suspense>
      <PageHeader
        title="Ledger"
        description="Every transaction, past and planned."
        actions={
          // On a phone Log is the + in the bottom bar and Schedule EMI is in the More menu.
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={openEmi}
              className="flex min-h-11 sm:min-h-0 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#18181B] px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-amber-500/40 transition-colors"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Schedule EMI</span>
            </button>
            <button
              type="button"
              onClick={openLog}
              className="flex min-h-11 sm:min-h-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition-colors shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Log</span>
            </button>
          </div>
        }
      />
      <DataState isLoading={isLoading} error={error} onRetry={refetch} label="Loading your ledger…">
        {data && (
          <ExpenseTable
            expenses={data.expenses}
            referenceDate={referenceDate}
            categoryFilter={categoryFilter}
            onClearCategoryFilter={clearCategoryFilter}
          />
        )}
      </DataState>
    </>
  );
}
