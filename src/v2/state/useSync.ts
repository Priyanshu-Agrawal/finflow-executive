'use client';
import { useSyncExternalStore } from 'react';
import type { Sync, SyncStatus } from './sync';

export function useSync(s: Sync): SyncStatus {
  return useSyncExternalStore(s.subscribe, s.getState, s.getState);
}
