'use client';

import { useEffect } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { useDataSync } from '../state/useDataSync';
import { isQuotaError } from '../lib/retry';
import { daysBetween, dayMonth, localToday, longDate } from '../lib/dates';
import { rupees } from '../lib/format';
import { billsBefore, generalSpentOn, loggedOn, lowestPointBefore, todayNote } from '../lib/today';
import { SafeSpend } from './SafeSpend';
import { PathChart } from './PathChart';
import { Bills } from './Bills';
import { SavingsBars } from './SavingsBars';

function LoadError({ error, retry }: { error: unknown; retry: () => void }) {
  const busy = isQuotaError(error);
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(retry, 30000);
    return () => clearTimeout(t);
  }, [busy, retry]);
  return (
    <div className="t-err">
      <h1 className="v2-title">{busy ? 'Sheets is busy' : "Couldn't load the sheet"}</h1>
      <p className="v2-cap">{busy ? 'Sheets is busy. Trying again in a moment.' : 'Check your connection, then try again.'}</p>
      <button className="t-btn" onClick={retry}>{busy ? 'Try now' : 'Try again'}</button>
    </div>
  );
}

export function Today() {
  const today = localToday();
  const q = useFinancials(today, 15000, 3200, 7, 15);
  useDataSync(q);
  const { data, error, isLoading, refetch } = q;

  if (isLoading) return <p className="v2-cap" style={{ paddingTop: 24 }}>Loading from the sheet…</p>;
  if (!data) return <LoadError error={error} retry={() => void refetch()} />;

  const k = data.kpis, bp = data.budgetPacing, rows = data.expenses;
  const total = Math.max(1, daysBetween(bp.cycleStartDate, bp.cycleEndDate));
  const day = Math.min(total, Math.max(1, daysBetween(bp.cycleStartDate, today) + 1));
  const note = todayNote(generalSpentOn(rows, today), bp.safeTotalDailyBurn);
  const { bills, setAside, billsTotal } = billsBefore(rows, today, k.cushionUntil);
  const low = lowestPointBefore(rows, today, k.cushionUntil, k.currentBalance);
  const logged = loggedOn(rows, today);

  return (
    <>
      <div className="t-head">
        <b>{longDate(today)}</b>
        <span className="v2-cap">Day {day} of {total}, salary on {dayMonth(k.cushionUntil)}</span>
      </div>

      <SafeSpend safe={bp.safeTotalDailyBurn} spent={bp.generalSpentSoFar} budget={bp.generalBudget} left={bp.generalRemaining}
        daysLeft={bp.daysRemainingInCycle} note={note} hard={bp.worstCaseDailyBurn} projectedSaving={bp.projectedCycleSavings} />

      <section className="t-card">
        <div className="t-row"><h2>Until salary</h2><span className="v2-cap">{dayMonth(bp.cycleStartDate)} to {dayMonth(k.cushionUntil)}</span></div>
        <div className="t-two">
          <div><p className="v2-cap">Balance now</p><p className="v2-money t-figure" data-testid="balance-now">{rupees(k.currentBalance)}</p></div>
          <div><p className="v2-cap">Lowest point{low.date ? `, ${dayMonth(low.date)}` : ''}</p><p className="v2-money t-figure t-blue" data-testid="lowest-point">{rupees(k.postNovBalance)}</p></div>
        </div>
        <PathChart rows={rows} from={bp.cycleStartDate} until={k.cushionUntil} today={today} lowest={{ date: low.date, balance: k.postNovBalance }} />
        <Bills bills={bills} setAside={setAside} total={billsTotal} until={k.cushionUntil} fiveDay={k.upcomingBills} />
      </section>

      <section className="t-card">
        <h2>Saved per salary cycle</h2>
        <SavingsBars cycles={data.savingsTrend} />
      </section>

      <section className="t-card" style={{ paddingBottom: 6 }}>
        <h2>Logged today</h2>
        {logged.length === 0 ? (
          <p className="t-empty">Nothing logged yet today. Tap + to add.</p>
        ) : (
          <div data-testid="logged-today" style={{ marginTop: 8 }}>
            {logged.map((r) => (
              <div className="t-line" key={r.rowIndex}>
                <span className="t-grow">{r.description}</span>
                <span className={`t-amt v2-money ${r.type === 'CREDIT' ? 't-blue' : ''}`}>{r.type === 'CREDIT' ? '+' : ''}{rupees(r.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
