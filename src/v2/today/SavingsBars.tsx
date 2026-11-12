import type { SavingsCycle } from '@/lib/types';
import { dayMonth } from '../lib/dates';
import { signedRupees } from '../lib/format';

const month = (c: SavingsCycle) => dayMonth(c.start).split(' ')[1];

export function SavingsBars({ cycles }: { cycles: SavingsCycle[] }) {
  if (cycles.length === 0) return <p className="t-empty">Savings history appears after your first full cycle.</p>;
  const max = Math.max(1, ...cycles.map((c) => Math.abs(c.saving)));
  const summary = cycles.map((c) => `${month(c)} ${signedRupees(c.saving)}${c.kind === 'projected' ? ' (projected)' : ''}`).join(', ');
  const cur = cycles.find((c) => c.kind === 'current');
  const nxt = cycles.find((c) => c.kind === 'projected');
  const tone = (v: number) => (v < 0 ? 't-orange' : 't-blue');
  return (
    <>
      <div className="t-bars" role="img" aria-label={`Saved per salary cycle. ${summary}`} data-testid="savings-bars">
        {cycles.map((c) => (
          <div className="t-barcol" key={c.start} title={`${month(c)}: ${signedRupees(c.saving)}`}>
            <div className="t-bar" data-sign={c.saving < 0 ? 'over' : 'saved'} data-kind={c.kind}
              style={{ height: `${Math.max(2, Math.round((Math.abs(c.saving) / max) * 44))}px` }} />
          </div>
        ))}
      </div>
      <div className="t-two">
        {cur && <div><p className="v2-cap">This cycle so far</p><p className={`v2-money ${tone(cur.saving)}`} style={{ fontSize: 20 }} data-testid="saving-current">{signedRupees(cur.saving)}</p></div>}
        {nxt && <div><p className="v2-cap">Next cycle, projected</p><p className={`v2-money ${tone(nxt.saving)}`} style={{ fontSize: 20 }} data-testid="saving-next">{signedRupees(nxt.saving)}</p></div>}
      </div>
    </>
  );
}
