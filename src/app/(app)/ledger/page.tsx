'use client';

import React from 'react';
import { useFrame } from '@/components/layout/FrameContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataState } from '@/components/ui/DataState';
import { PeerLedgerTable } from '@/components/ledger/PeerLedgerTable';

export default function SplitsPage() {
  const { data, isLoading, error, refetch } = useFrame();

  return (
    <>
      <PageHeader title="Splits" description="Shared spends with friends and who owes what." />
      <DataState isLoading={isLoading} error={error} onRetry={refetch} label="Loading your splits…">
        {data && <PeerLedgerTable entries={data.peerLedger || []} />}
      </DataState>
    </>
  );
}
