'use client';

import React from 'react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { ExcelSpreadsheet } from '@/components/excel/ExcelSpreadsheet';

export default function ExcelPage() {
  const { data, isLoading, error, refetch, referenceDate, openLog } = useFrame();

  return (
    <>
      <PageHeader title="Excel" description="The sheet as a grid: edit cells, drag rows, see the formulas." />
      <DataState isLoading={isLoading} error={error} onRetry={refetch} label="Loading the sheet…">
        {data && (
          <ExcelSpreadsheet
            expenses={data.expenses || []}
            loans={data.loans || []}
            peerLedger={data.peerLedger || []}
            referenceDate={referenceDate}
            onOpenQuickLog={openLog}
          />
        )}
      </DataState>
    </>
  );
}
