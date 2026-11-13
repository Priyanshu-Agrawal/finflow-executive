'use client';

import { createContext, useContext } from 'react';
import type { FinancialsResponse } from '@/lib/types';

/** Budget and cycle settings the owner can change on the Budget page; kept in this browser. */
export interface CycleConfig {
  generalBudget: number;
  electricityBudget: number;
  budgetRecurringDay: number;
  rentRecurringDay: number;
  rentAmount: number;
  electricityRemaining?: number;
}

export interface FrameValue {
  /** The date the books are shown as of (YYYY-MM-DD). Shared by every page and kept while you move between them. */
  referenceDate: string;
  setReferenceDate: (date: string) => void;
  resetToToday: () => void;
  openLog: () => void;
  openEmi: () => void;
  /** The one financials query for the whole app (same data on every page). */
  data: FinancialsResponse | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  isFetching: boolean;
  config: CycleConfig;
  updateConfig: (updates: Partial<CycleConfig>) => void;
  /** True while the browser reports a network connection. */
  isOnline: boolean;
  /** When the last fetch genuinely reached the network (ms since epoch), or null if never. */
  lastSyncedAt: number | null;
  /** True once we have data but it came from the offline cache (serving a saved copy, not a live read). */
  isShowingOfflineCopy: boolean;
}

export const FrameContext = createContext<FrameValue | null>(null);

export function useFrame(): FrameValue {
  const value = useContext(FrameContext);
  if (!value) throw new Error('useFrame must be used inside AppFrame');
  return value;
}
