import type { ExpenseEntry } from '@/lib/types';
import { dayMonth, weekdayShort } from '../lib/dates';
import { rupees } from '../lib/format';

const Line = ({ r }: { r: ExpenseEntry }) => (
  <div className="t-line">
    <div className="t-day"><b>{Number(r.date.slice(8, 10))}</b><span>{weekdayShort(r.date)}</span></div>
    <span className="t-grow">{r.description}</span>
    <span className="t-amt v2-money">{rupees(r.amount)}</span>
  </div>
);

export function Bills({ bills, setAside, total, until, fiveDay }: {
  bills: ExpenseEntry[]; setAside: ExpenseEntry[]; total: number; until: string; fiveDay: number;
}) {
  return (
    <>
      <div className="t-row t-sec">
        <h3 style={{ fontSize: 15, fontWeight: 650 }}>Bills before salary</h3>
        <span className="v2-cap">{rupees(fiveDay)} in the next 5 days</span>
      </div>
      {bills.length === 0 ? (
        <p className="t-empty">No bills before salary.</p>
      ) : (
        <>
          <div data-testid="bills-list">{bills.map((b) => <Line key={b.rowIndex} r={b} />)}</div>
          <div className="t-line">
            <span className="v2-cap">{bills.length} {bills.length === 1 ? 'bill' : 'bills'} before {dayMonth(until)}</span>
            <span className="t-amt v2-money" data-testid="bills-total">{rupees(total)}</span>
          </div>
        </>
      )}
      {setAside.length > 0 && (
        <>
          <h3 className="t-sec" style={{ marginBottom: 0 }}>Set aside in the sheet</h3>
          <div data-testid="set-aside-list">
            {setAside.map((b) => (
              <div className="t-line" key={b.rowIndex}>
                <span className="t-grow">{b.description}<br /><span className="v2-cap">{dayMonth(b.date)}</span></span>
                <span className="t-amt v2-money">{rupees(b.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
