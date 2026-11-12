'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FinancialsResponse } from '@/lib/types';
import { useLogEntry } from '../state/useLogEntry';
import { buildLogRequest, pressKey, usualDescriptions, type LogForm } from '../lib/log';
import { localToday } from '../lib/dates';
import { rupees } from '../lib/format';
import { Keypad } from './Keypad';

const EMPTY: LogForm = { amount: '', description: '', dateChoice: 'today', type: 'Spent', repeatMonthly: false };
const FOCUSABLE = 'button:not([disabled]),input,select,[tabindex]:not([tabindex="-1"])';

export function LogSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (label: string, ok: boolean) => void }) {
  const today = localToday();
  const [form, setForm] = useState<LogForm>(EMPTY);
  const [pickDate, setPickDate] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Read the cache only: opening the sheet must not start a fetch (it could land over the optimistic row).
  const client = useQueryClient();
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  const logEntry = useLogEntry();
  const chips = useMemo(
    () => usualDescriptions(client.getQueriesData<FinancialsResponse>({ queryKey: ['financials'] })[0]?.[1]?.expenses ?? [], today),
    [client, today],
  );

  // Dialog behaviour: focus in, trap Tab, Escape closes, page behind does not scroll, focus returns.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [onClose]);

  const req = buildLogRequest(form, today);
  const amount = Number(form.amount) || 0;
  const saveText = !online ? "You're offline"
    : !req.ok ? req.reason.replace(/\.$/, '')
    : form.repeatMonthly ? `Schedule 6 × ${rupees(amount)}`
    : form.type === 'Received' ? `Log ${rupees(amount)} received`
    : `Log ${rupees(amount)}`;
  const set = (patch: Partial<LogForm>) => setForm((f) => ({ ...f, ...patch }));
  const customDate = typeof form.dateChoice === 'object' ? form.dateChoice.custom : null;
  const custom = customDate !== null;

  const save = () => {
    if (!req.ok) return;
    const what = req.kind === 'emi' ? req.body.title : req.body.description;
    const label = req.kind === 'emi' ? `Scheduled ${what} 6 × ${rupees(amount)}` : `Logged ${what} ${rupees(amount)}`;
    onClose();
    void logEntry(req, label).then((ok) => onSaved(label, ok));
  };

  return (
    <div className="l-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="l-sheet" role="dialog" aria-modal="true" aria-labelledby="log-title" tabIndex={-1} ref={ref}>
        <div className="l-grab" />
        <div className="l-top">
          <h2 id="log-title">Log</h2>
          <button type="button" className="l-x" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <p className="v2-money l-amount" data-testid="log-amount">{rupees(amount)}</p>
        <div className="l-scroll">
          {chips.map((c) => (
            <button key={c} type="button" className="l-chip" aria-pressed={form.description === c} onClick={() => set({ description: c })}>{c}</button>
          ))}
        </div>
        <label className="l-field">
          <span className="v2-cap">What for</span>
          <input className="l-input" value={form.description} placeholder="General Expenses" onChange={(e) => set({ description: e.target.value })} />
        </label>
        <div className="l-chips">
          <button type="button" className="l-chip" aria-pressed={form.dateChoice === 'today'} onClick={() => { setPickDate(false); set({ dateChoice: 'today' }); }}>Today</button>
          <button type="button" className="l-chip" aria-pressed={form.dateChoice === 'yesterday'} onClick={() => { setPickDate(false); set({ dateChoice: 'yesterday' }); }}>Yesterday</button>
          <button type="button" className="l-chip" aria-pressed={custom} onClick={() => { setPickDate(true); set({ dateChoice: { custom: '' } }); }}>Pick date</button>
        </div>
        {pickDate && (
          <input className="l-input" type="date" aria-label="Date" value={customDate ?? ''} onChange={(e) => set({ dateChoice: { custom: e.target.value } })} />
        )}
        <div className="l-chips">
          {(['Spent', 'Received', 'Settled'] as const).map((t) => (
            <button key={t} type="button" className="l-chip" aria-pressed={form.type === t} onClick={() => set({ type: t })}>{t}</button>
          ))}
          <button type="button" className="l-chip" aria-pressed={form.repeatMonthly} onClick={() => set({ repeatMonthly: !form.repeatMonthly })}>Repeat monthly</button>
        </div>
        {form.repeatMonthly && (
          <p className="v2-cap">Adds 6 monthly rows from this date, named &quot;{form.description.trim() || 'General Expenses'} (EMI 1/6)&quot; and so on.</p>
        )}
        {!online && <p className="v2-cap">You&apos;re offline. Changes can&apos;t be saved until you&apos;re back online.</p>}
        <Keypad onKey={(k) => set({ amount: pressKey(form.amount, k) })} />
        <button type="button" className="l-save" disabled={!req.ok || !online} onClick={save}>{saveText}</button>
      </div>
    </div>
  );
}
