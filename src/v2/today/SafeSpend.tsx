'use client';

import { useState } from 'react';
import { rupees, signedRupees } from '../lib/format';

export function SafeSpend({ safe, spent, budget, left, daysLeft, note, hard, projectedSaving }: {
  safe: number; spent: number; budget: number; left: number; daysLeft: number;
  note: { kind: 'none' | 'within' | 'over'; text: string };
  hard: number; projectedSaving: number;
}) {
  const [showHard, setShowHard] = useState(false);
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  return (
    <section className="t-hero">
      <h1 className="t-lead">You can spend</h1>
      <p className="v2-money t-big" data-testid="safe-spend">{rupees(safe)}</p>
      <p className="t-sub">a day until salary, and stay inside the budget.</p>
      <div className="t-meter">
        <div className="t-track"><div className="t-fill" style={{ width: `${pct}%` }} /></div>
        <div className="t-row v2-cap"><span>{rupees(spent)} spent of {rupees(budget)}</span><span>{rupees(left)} left for {daysLeft} days</span></div>
      </div>
      <p className="t-note" data-kind={note.kind}>{note.text}</p>
      <button className="t-chip" aria-expanded={showHard} onClick={() => setShowHard((v) => !v)}>
        {showHard ? 'Hide the hard-month limit' : 'What if it is a hard month?'}
      </button>
      {showHard && (
        <p className="t-hard" data-testid="hard-month">
          {hard > safe
            ? <>If this month gets hard and you let this cycle&apos;s projected saving go too, the ceiling is <strong>{rupees(hard)} a day</strong>. This is not the plan, just the limit.</>
            : <>Even in a hard month the ceiling stays <strong>{rupees(hard)} a day</strong>. This cycle is projected at {signedRupees(projectedSaving)}, so there is no saving to fall back on.</>}
        </p>
      )}
    </section>
  );
}
