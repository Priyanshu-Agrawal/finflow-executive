'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FinancialsResponse } from '../../lib/types';
import type { LogRequest } from '../lib/log';
import { useV2History, useV2Sync } from '../V2Providers';
import { performLog } from './logEntry';

async function api(url: string, init: RequestInit) {
  const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'The sheet did not accept that.');
  return json;
}

/** Binds performLog to the shared financials query, the sync queue and the history store. */
export function useLogEntry() {
  const client = useQueryClient();
  const sync = useV2Sync();
  const history = useV2History();
  return useCallback(
    (req: Extract<LogRequest, { ok: true }>, label: string) =>
      performLog(
        {
          rows: () => client.getQueriesData<FinancialsResponse>({ queryKey: ['financials'] })[0]?.[1]?.expenses ?? [],
          // Keep each entry's own fetch time: an optimistic edit is not a fetch, so the chip must not say "Synced".
          setRows: (rows) => {
            for (const q of client.getQueryCache().findAll({ queryKey: ['financials'] })) {
              const old = q.state.data as FinancialsResponse | undefined;
              if (old) client.setQueryData(q.queryKey, { ...old, expenses: rows }, { updatedAt: q.state.dataUpdatedAt });
            }
          },
          cancel: () => client.cancelQueries({ queryKey: ['financials'] }),
          sync,
          history,
          post: (url, body) => api(url, { method: 'POST', body: JSON.stringify(body) }),
          del: async (row) => { await api(`/api/expenses/${row}`, { method: 'DELETE' }); },
          refetch: async () => { await client.refetchQueries({ queryKey: ['financials'], type: 'all' }); },
        },
        req,
        label,
      ),
    [client, sync, history],
  );
}
