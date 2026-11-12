// Read-only: times getExpensesFromSheet() so we know how long a Sheets read takes from this machine.
// Run: npx tsx --env-file=.env.local src/scripts/measure-sheet-latency.ts
import { getExpensesFromSheet } from '../lib/sheets';

(async () => {
  const ms: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const rows = await getExpensesFromSheet();
    ms.push(Math.round(performance.now() - t0));
    console.log(`read ${i + 1}: ${ms[i]} ms (${rows.length} rows)`);
  }
  const s = [...ms].sort((a, b) => a - b);
  console.log(`min ${s[0]} ms, median ${s[2]} ms, max ${s[4]} ms`);
})();
