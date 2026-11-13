'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { shouldShowInstallPrompt } from '@/lib/install-prompt';

const DISMISSED_KEY = 'finflow_install_dismissed';

// Not a DOM type yet in TS lib; only Chromium-based browsers fire this.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
}

// Same 1024px cutover the rest of the app already uses for phone vs laptop (e.g. the bottom bar
// is lg:hidden, TableScroller checks the same breakpoint).
const MOBILE_QUERY = '(max-width: 1023px)';

function readDismissed(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * A small, dismissible "Install FinFlow" bar. Chromium (Android, desktop) only — Safari/iOS never
 * fires beforeinstallprompt, and this does not attempt to teach the manual Add to Home Screen steps.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!shouldShowInstallPrompt({ promptAvailable: !!deferred, isStandalone: isStandalone(), dismissed, isMobile })) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
      <span className="flex items-center gap-2">
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Install FinFlow for the full-screen app.
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={async () => {
            if (!deferred) return;
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
          className="min-h-11 lg:min-h-0 rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-black hover:bg-amber-400"
        >
          Install
        </button>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex h-11 w-11 lg:h-7 lg:w-7 items-center justify-center rounded-lg text-amber-300 hover:text-amber-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
