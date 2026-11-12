'use client';
import { useSyncExternalStore } from 'react';
import type { History, HistoryState } from './history';

export function useHistory(h: History): HistoryState {
  return useSyncExternalStore(h.subscribe, h.getState, h.getState);
}
