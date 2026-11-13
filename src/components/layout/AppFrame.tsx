'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useFinancials } from '@/hooks/useFinancials';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatSyncedAgo } from '@/lib/sync-status';
import { QuickLogForm } from '@/components/logger/QuickLogForm';
import { EmiSchedulerForm } from '@/components/logger/EmiSchedulerForm';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { Navbar } from './Navbar';
import { FrameContext, type CycleConfig, type FrameValue } from './FrameContext';

const LAST_SYNCED_KEY = 'finflow_last_synced';

function readLastSynced(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LAST_SYNCED_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

const CONFIG_KEY = 'finflow_cycle_config';
const DEFAULT_CONFIG: CycleConfig = {
  generalBudget: 15000,
  electricityBudget: 3200,
  budgetRecurringDay: 7,
  rentRecurringDay: 15,
  rentAmount: 15000,
};

function readConfig(): CycleConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    const next = { ...DEFAULT_CONFIG };
    for (const k of ['generalBudget', 'electricityBudget', 'budgetRecurringDay', 'rentRecurringDay', 'rentAmount'] as const) {
      if (typeof parsed[k] === 'number') next[k] = parsed[k];
    }
    if (typeof parsed.electricityRemaining === 'number') next.electricityRemaining = parsed.electricityRemaining;
    return next;
  } catch {
    return DEFAULT_CONFIG;
  }
}

const todayIso = () => new Date().toLocaleDateString('en-CA');

/**
 * The frame every page shares: top bar, phone bottom bar, the Log and EMI sheets, one page width
 * and padding, the reference date and the single financials query. Pages render only their own content.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const [referenceDate, setReferenceDate] = useState(todayIso);
  const [config, setConfig] = useState<CycleConfig>(readConfig);
  const [logOpen, setLogOpen] = useState(false);
  const [emiOpen, setEmiOpen] = useState(false);
  const isOnline = useOnlineStatus();
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(readLastSynced);
  // For the offline banner's relative time, read in an effect, never inline in the render body
  // (Date.now() there is an impure call during render).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useFinancials(
    referenceDate,
    config.generalBudget,
    config.electricityBudget,
    config.budgetRecurringDay,
    config.rentRecurringDay,
    config.rentAmount,
    config.electricityRemaining
  );

  // Record "last genuinely synced" only when a fetch resolves with data that is NOT the offline
  // copy — never from navigator.onLine, which stays true for "online but the request is
  // actually failing" (flaky wifi, a captive portal, DNS, the server down), exactly the case
  // data.offlineCopy exists to catch. Without this gate, that case would overwrite the correct
  // last-sync time with "just now" every time it was served a stale cached response.
  useEffect(() => {
    if (!data || data.offlineCopy) return;
    const now = Date.now();
    setLastSyncedAt(now);
    try {
      localStorage.setItem(LAST_SYNCED_KEY, String(now));
    } catch {
      // ignore storage errors (private mode, quota)
    }
  }, [data]);

  // True whenever the data we have is known to be the offline copy — set by the service worker
  // (see useFinancials), not inferred from navigator.onLine.
  const isShowingOfflineCopy = !!data?.offlineCopy;

  // Publishes the offline banner's own height, the same way StickyBar publishes its own, so a
  // page's sticky control bar (which also sticks at --topbar-h) stacks below the banner instead
  // of painting over it once the page is scrolled.
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    if (!isShowingOfflineCopy) {
      root.style.setProperty('--offline-banner-h', '0px');
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const publish = () => root.style.setProperty('--offline-banner-h', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--offline-banner-h', '0px');
    };
  }, [isShowingOfflineCopy]);

  // The functional updater is required: ModernBudgetPacing's "Apply" calls this once per
  // changed field in the same tick, so each call must build on the one before it, not on
  // whatever `config` was when the render that defined this callback happened.
  const updateConfig = useCallback((updates: Partial<CycleConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...saved, ...updates }));
    } catch (e) {
      console.error('Failed to save cycle config to localStorage', e);
    }
  }, []);

  useEffect(() => {
    if (!logOpen && !emiOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLogOpen(false);
        setEmiOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [logOpen, emiOpen]);

  const value: FrameValue = {
    referenceDate,
    setReferenceDate,
    resetToToday: () => setReferenceDate(todayIso()),
    openLog: () => setLogOpen(true),
    openEmi: () => setEmiOpen(true),
    data,
    isLoading,
    error,
    refetch: () => void refetch(),
    isFetching,
    config,
    updateConfig,
    isOnline,
    lastSyncedAt,
    isShowingOfflineCopy,
  };

  return (
    <FrameContext.Provider value={value}>
      <div className="min-h-screen bg-[#0B0B0C] text-[#F4F4F5] flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
        <Navbar />
        {isShowingOfflineCopy && (
          <div
            ref={bannerRef}
            role="status"
            className="sticky z-30 flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-3 py-2 text-center text-xs font-medium text-amber-300"
            style={{ top: 'var(--topbar-h)' }}
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Offline — showing a copy saved {formatSyncedAgo(lastSyncedAt, now)}. Reconnect to see the latest, and to log anything.
            </span>
          </div>
        )}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-10 space-y-3 sm:space-y-6">
          <InstallPrompt />
          {children}
        </main>

        {logOpen && (
          <div role="dialog" aria-modal="true" aria-label="Log a transaction" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
            <div className="w-full max-w-2xl relative max-h-[92vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="h-5 w-5" />
              </button>
              <QuickLogForm defaultDate={referenceDate} onSuccess={() => setLogOpen(false)} />
            </div>
          </div>
        )}

        {emiOpen && (
          <div role="dialog" aria-modal="true" aria-label="Schedule EMI" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
            <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto">
              <EmiSchedulerForm onClose={() => setEmiOpen(false)} onSuccess={() => setEmiOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </FrameContext.Provider>
  );
}
