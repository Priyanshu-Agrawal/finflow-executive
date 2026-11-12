'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useV2Sync } from '../V2Providers';
import { isQuotaError } from '../lib/retry';

/** Connects a data query to the sync chip: last good fetch time, quota errors, online state. */
export function useDataSync(query: { isSuccess: boolean; dataUpdatedAt: number; isError: boolean; error: unknown }) {
  const sync = useV2Sync();
  const client = useQueryClient();

  useEffect(() => {
    if (query.isSuccess && query.dataUpdatedAt) sync.refreshed(query.dataUpdatedAt);
  }, [query.isSuccess, query.dataUpdatedAt, sync]);

  useEffect(() => {
    if (query.isError && isQuotaError(query.error)) sync.markBusy('Sheets is busy, retrying in a moment');
  }, [query.isError, query.error, sync]);

  useEffect(() => {
    if (!navigator.onLine) sync.setOnline(false);
    const off = () => sync.setOnline(false);
    const on = () => {
      sync.setOnline(true);
      void client.invalidateQueries({ queryKey: ['financials'] });
    };
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => {
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
    };
  }, [sync, client]);
}
