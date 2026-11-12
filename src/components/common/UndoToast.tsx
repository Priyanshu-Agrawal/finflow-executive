'use client';

import React, { useEffect, useState } from 'react';
import { useUndo } from '@/context/UndoContext';
import { RotateCcw, X, Loader2, CheckCircle2 } from 'lucide-react';

export function UndoToast() {
  const { currentUndo, undoneNotice, triggerUndo, dismissUndo, isUndoing, undoStackLength } = useUndo();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!currentUndo) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const duration = 9000; // 9 seconds
    const interval = 50; // update every 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentUndo]);

  if (!currentUndo && !undoneNotice) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
      {/* Notice after an undo occurs */}
      {undoneNotice && !currentUndo && (
        <div className="relative overflow-hidden rounded-2xl border border-credit/30 bg-[#18181B] p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-credit/10 text-credit border border-credit/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{undoneNotice}</p>
              <p className="text-xs text-credit/80 tabular-nums">
                {undoStackLength > 0 ? `${undoStackLength} earlier action(s) available • Press Ctrl+Z` : 'All recent actions undone'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Undo Toast for the latest action */}
      {currentUndo && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[#18181B] p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            {/* Action Description */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white truncate">{currentUndo.description}</p>
                  {undoStackLength > 1 && (
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-xs tabular-nums text-zinc-400 border border-white/[0.08] shrink-0">
                      1 of {undoStackLength}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <span>Action saved</span>
                  <span className="text-zinc-600">•</span>
                  <span className="tabular-nums text-amber-400/90 flex items-center gap-1">
                    Press <kbd className="rounded bg-black/50 px-1 py-0.2 text-xs border border-white/10 font-bold">Ctrl+Z</kbd> or <kbd className="rounded bg-black/50 px-1 py-0.2 text-xs border border-white/10 font-bold">⌘Z</kbd> to undo
                  </span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => triggerUndo()}
                disabled={isUndoing}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {isUndoing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Reverting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Undo</span>
                  </>
                )}
              </button>
              <button
                onClick={dismissUndo}
                className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Animated Countdown Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.05]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
