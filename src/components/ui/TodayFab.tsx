'use client';

import { createPortal } from 'react-dom';
import { LocateFixed } from 'lucide-react';

/** The one floating Today button (Ledger and Excel). Sits above the phone bottom bar; `visible` is false while the anchor row is on screen. */
export function TodayFab({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible || typeof document === 'undefined') return null;
  return createPortal(
    <button
      type="button"
      onClick={onClick}
      aria-label="Go to today's row"
      className="fixed right-4 lg:right-8 bottom-[calc(env(safe-area-inset-bottom,0px)+var(--today-fab-bottom,6rem))] lg:bottom-8 z-40 flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 text-sm font-semibold text-black shadow-lg shadow-black/50 ring-1 ring-amber-300/40 transition hover:bg-amber-400 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
    >
      <LocateFixed className="h-4 w-4" aria-hidden="true" />
      <span>Today</span>
    </button>,
    document.body
  );
}
