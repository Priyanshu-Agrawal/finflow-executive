'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { formatINR } from '@/lib/date-utils';

// Placeholder Today screen: proves the data layer is connected. The real screen is Phase 1.
export default function TodayPage() {
  const today = new Date().toLocaleDateString('en-CA');
  const { data, error, isLoading, refetch } = useFinancials(today, 15000, 3200, 7, 15);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12 }}>
      <h1 className="v2-cap" style={{ fontSize: 17, lineHeight: '24px', fontWeight: 400 }}>You can spend</h1>
      {isLoading && <p className="v2-cap">Loading from the sheet…</p>}
      {error && (
        <p className="v2-cap">
          Couldn&apos;t load the sheet. <button onClick={() => refetch()} style={{ textDecoration: 'underline', background: 'none', border: 0, color: 'inherit', minHeight: 44 }}>Try again</button>
        </p>
      )}
      {data && (
        <>
          <p className="v2-money" style={{ fontSize: 56, lineHeight: '60px' }}>{formatINR(data.budgetPacing.safeTotalDailyBurn)}</p>
          <p className="v2-cap">a day until salary</p>
          <p className="v2-cap" style={{ marginTop: 18 }}>Balance now</p>
          <p className="v2-money" style={{ fontSize: 28 }}>{formatINR(data.kpis.currentBalance)}</p>
        </>
      )}
    </section>
  );
}
