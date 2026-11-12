'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useV2History, useV2Sync } from '../V2Providers';
import { LogSheet } from './LogSheet';

interface LogSheetApi { open: () => void; close: () => void; isOpen: boolean }
const Ctx = createContext<LogSheetApi | null>(null);

export function useLogSheet(): LogSheetApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLogSheet must be used inside LogSheetProvider');
  return v;
}

type Toast = { text: string; action?: { label: string; run: () => void } };

/** Owns the Log sheet and the undo/redo toast shown after every change. */
export function LogSheetProvider({ children }: { children: React.ReactNode }) {
  const history = useV2History();
  const sync = useV2Sync();
  const [isOpen, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((t: Toast | null) => {
    setToast(t);
    if (timer.current) clearTimeout(timer.current);
    if (t) timer.current = setTimeout(() => setToast(null), 7000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const afterChange = useCallback((label: string) => {
    const undo = async () => {
      const ok = await history.undo();
      show(ok ? { text: `Undid: ${label}`, action: { label: 'Redo', run: redo } } : { text: history.getState().error ?? 'Could not undo that.' });
    };
    const redo = async () => {
      const ok = await history.redo();
      show(ok ? { text: `Redid: ${label}`, action: { label: 'Undo', run: undo } } : { text: history.getState().error ?? 'Could not redo that.' });
    };
    show({ text: label, action: { label: 'Undo', run: undo } });
  }, [history, show]);

  const close = useCallback(() => setOpen(false), []);
  const api: LogSheetApi = { open: () => setOpen(true), close, isOpen };

  return (
    <Ctx.Provider value={api}>
      {children}
      {isOpen && (
        <LogSheet
          onClose={close}
          onSaved={(label, ok) => {
            if (ok) afterChange(label);
            else show({ text: sync.getState().kind === 'offline' ? "You're offline. Nothing was saved." : "Couldn't save. Nothing was changed." });
          }}
        />
      )}
      {toast && (
        <div className="l-toast" role="status">
          <span>{toast.text}</span>
          {toast.action && <button type="button" onClick={toast.action.run}>{toast.action.label}</button>}
        </div>
      )}
    </Ctx.Provider>
  );
}
