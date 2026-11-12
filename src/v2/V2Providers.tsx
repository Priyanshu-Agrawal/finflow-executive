'use client';

import React, { createContext, useContext, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHistory, type History } from './state/history';
import { createSync, type Sync } from './state/sync';

const HistoryCtx = createContext<History | null>(null);
const SyncCtx = createContext<Sync | null>(null);

export function V2Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30 * 1000, refetchOnWindowFocus: true, retry: 2 } } })
  );
  const [history] = useState(() => createHistory());
  const [sync] = useState(() =>
    createSync({ isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine), now: () => Date.now() })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <HistoryCtx.Provider value={history}>
        <SyncCtx.Provider value={sync}>{children}</SyncCtx.Provider>
      </HistoryCtx.Provider>
    </QueryClientProvider>
  );
}

export function useV2History(): History {
  const h = useContext(HistoryCtx);
  if (!h) throw new Error('useV2History must be used inside V2Providers');
  return h;
}

export function useV2Sync(): Sync {
  const s = useContext(SyncCtx);
  if (!s) throw new Error('useV2Sync must be used inside V2Providers');
  return s;
}
