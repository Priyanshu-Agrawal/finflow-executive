// Write-path safety simulation for the Expenses tab.
// Takes a READ-ONLY snapshot of the live sheet (spreadsheets.readonly scope) — Expenses A:F and every
// Loans-tab reference into Expenses — then runs the real write functions in src/lib/sheets.ts against an
// in-memory copy that mimics Google Sheets' formula evaluation and reference shifting on row insert,
// delete and move. The live sheet is never written.
// Run: npm run test:sim
import { google } from 'googleapis';
import * as S from '../lib/sheets';
import { previewRowMove } from '../lib/row-move';
import { BIKE_LOAN_PRINCIPAL, computeKPIs, GENERAL_EXCLUDE_PATTERN, GENERAL_EXPENSE_PATTERN, trackEmiLoan } from '../lib/computations';

type Raw = string | number;
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ERR = '#REF!';
let grid: Raw[][] = []; // grid[r-1][c]: raw entry (formula string or value)
let external: string[] = []; // Loans-tab formulas that reference Expenses (only their Expenses!X{n} refs matter)
let writes = 0;
const CYCLE_FORMULA = S.buildCycleGeneralTotalFormula();

// ---------- date helpers (Sheets serials) ----------
const serialToISO = (n: number) => new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10);
const isoToSerial = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000 + 25569;
const edate = (serial: number, months: number) => {
  const d = new Date(Math.round((serial - 25569) * 86400000));
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + months, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(day, last)) / 86400000 + 25569;
};

// ---------- evaluator ----------
function evaluateAll(): (number | string)[][] {
  const memo = new Map<string, number | string>();
  const val = (col: string, row: number): number | string => {
    const key = col + row;
    if (memo.has(key)) return memo.get(key)!;
    const raw = grid[row - 1]?.[COLS.indexOf(col)];
    let v: number | string = raw === undefined ? '' : raw;
    if (typeof raw === 'string' && raw.startsWith('=')) v = evalFormula(raw, row);
    memo.set(key, v);
    return v;
  };
  const ref = (tok: string) => (tok === ERR ? ERR : val(tok[0], Number(tok.slice(1))));
  const STD = /^=IF\(OR\((D\d+|#REF!)="",.*?\), (E\d+|#REF!), IF\((?:D\d+|#REF!)="DEBIT", (?:E\d+|#REF!)-(C\d+|#REF!),/;
  const inc = new RegExp(GENERAL_EXPENSE_PATTERN), exc = new RegExp(GENERAL_EXCLUDE_PATTERN);
  function evalFormula(f: string, self: number): number | string {
    if (f === CYCLE_FORMULA) {
      const end = Number(val('A', self)), start = edate(end + 1, -1);
      let sum = 0;
      for (let r = 3; r <= self - 1; r++) {
        const a = val('A', r), b = String(val('B', r)).toLowerCase(), d = val('D', r), c = val('C', r);
        if (typeof a === 'number' && a >= start && a <= end && d === 'DEBIT' && inc.test(b) && !exc.test(b)) sum += Number(c) || 0;
      }
      return sum;
    }
    const m = f.match(STD);
    if (m) {
      const d = ref(m[1]); const ep = ref(m[2]); const c = ref(m[3]);
      if (d === ERR) return ERR;
      if (d === '' || ['ADJUSTMENT', 'SETTLEMENT', 'OTHER', 'DIRECT'].includes(String(d))) return ep;
      if (ep === ERR || c === ERR) return ERR;
      const cn = c === '' ? 0 : Number(c);
      if (d === 'DEBIT') return Number(ep) - cn;
      if (d === 'CREDIT') return Number(ep) + cn;
      return '';
    }
    if (f.includes(ERR)) return ERR;
    let bad = false;
    const expr = f.slice(1).replace(/\b([A-F])(\d+)\b/g, (_, c, r) => {
      const v = val(c, Number(r)); if (v === ERR) bad = true; return String(v === '' ? 0 : v);
    });
    if (bad) return ERR;
    if (!/^[0-9+\-*/(). ]+$/.test(expr)) throw new Error('cannot eval ' + f);
    return Function(`return (${expr})`)();
  }
  return grid.map((_, i) => COLS.map(c => val(c, i + 1)));
}

// ---------- structural reference adjustment (Google Sheets semantics) ----------
function adjustRefs(fn: (row: number) => number | null) {
  const remap = (s: string, re: RegExp) => s.replace(re, (_, pre, col, r) => { const n = fn(Number(r)); return n === null ? ERR : `${pre}${col}${n}`; });
  for (const row of grid) for (let c = 0; c < COLS.length; c++) {
    const raw = row[c];
    if (typeof raw === 'string' && raw.startsWith('=')) row[c] = remap(raw, /(^|[^A-Za-z!$])([A-F])(\d+)\b/g);
  }
  external = external.map(f => remap(f, /(Expenses!)([A-F])(\d+)\b/g));
}
const blankRow = (): Raw[] => COLS.map(() => '');

// ---------- mock client ----------
function parseRange(range: string) {
  const a1 = range.replace(/^Expenses!/, '');
  const m = a1.match(/^([A-F])(\d*)(?::([A-F])(\d*))?$/)!;
  const c1 = COLS.indexOf(m[1]), r1 = m[2] ? Number(m[2]) : 1;
  const c2 = COLS.indexOf(m[3] ?? m[1]), r2 = m[3] ? (m[4] ? Number(m[4]) : Infinity) : (m[2] ? r1 : Infinity);
  return { c1, r1, c2, r2 };
}
const lastDataRow = () => { let n = grid.length; while (n > 0 && grid[n - 1].slice(0, 5).every(v => v === '')) n--; return n; };
const mock: any = { spreadsheets: {
  values: {
    get: async ({ range, valueRenderOption }: any) => {
      const { c1, r1, c2, r2 } = parseRange(range);
      const evald = valueRenderOption === 'FORMULA' ? null : evaluateAll();
      const out: Raw[][] = [];
      const last = Math.min(r2, c1 === 0 && c2 <= 1 && r2 === Infinity ? lastColARow() : grid.length);
      for (let r = r1; r <= last; r++) {
        const row: Raw[] = [];
        for (let c = c1; c <= c2; c++) row.push(evald ? (evald[r - 1][c] as Raw) : (grid[r - 1][c] ?? ''));
        while (row.length && (row[row.length - 1] === '' || row[row.length - 1] === undefined)) row.pop();
        out.push(row);
      }
      while (out.length && out[out.length - 1].length === 0) out.pop();
      return { data: { values: out } };
    },
    update: async ({ range, requestBody }: any) => {
      writes++;
      const { c1, r1 } = parseRange(range);
      requestBody.values.forEach((vals: Raw[], i: number) => {
        const r = r1 + i; while (grid.length < r) grid.push(blankRow());
        vals.forEach((v, j) => { grid[r - 1][c1 + j] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? isoToSerial(v) : v; });
      });
      return { data: {} };
    },
    clear: async ({ range }: any) => {
      writes++;
      const { c1, r1, c2, r2 } = parseRange(range);
      for (let r = r1; r <= Math.min(r2, grid.length); r++) for (let c = c1; c <= c2; c++) grid[r - 1][c] = '';
      return { data: {} };
    },
  },
  batchUpdate: async ({ requestBody }: any) => {
    writes++;
    for (const req of requestBody.requests) {
      if (req.insertDimension) {
        const k = req.insertDimension.range.startIndex + 1;
        adjustRefs(r => (r >= k ? r + 1 : r));
        grid.splice(k - 1, 0, blankRow());
      } else if (req.deleteDimension) {
        const k = req.deleteDimension.range.startIndex + 1;
        adjustRefs(r => (r === k ? null : r > k ? r - 1 : r));
        grid.splice(k - 1, 1);
      } else if (req.moveDimension) {
        const s = req.moveDimension.source.startIndex + 1;
        const d0 = req.moveDimension.destinationIndex;
        const t = (d0 < s - 1 ? d0 : d0 - 1) + 1; // final 1-based position
        adjustRefs(r => (r === s ? t : s < t && r > s && r <= t ? r - 1 : t < s && r >= t && r < s ? r + 1 : r));
        const [row] = grid.splice(s - 1, 1); grid.splice(t - 1, 0, row);
      }
    }
    return { data: {} };
  },
} };
function lastColARow() { let n = grid.length; while (n > 0 && grid[n - 1][0] === '') n--; return n; }

// ---------- helpers ----------
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const clone = () => ({ grid: JSON.parse(JSON.stringify(grid)) as Raw[][], external: [...external] });
const restore = (s: { grid: Raw[][]; external: string[] }) => { grid = JSON.parse(JSON.stringify(s.grid)); external = [...s.external]; };
const same = (s: { grid: Raw[][]; external: string[] }) => JSON.stringify(grid.slice(0, lastDataRow())) === JSON.stringify(s.grid.slice(0, s.grid.length)) && JSON.stringify(external) === JSON.stringify(s.external);
const refErrors = () => evaluateAll().flat().filter(v => v === ERR).length + grid.flat().filter(v => typeof v === 'string' && v.includes(ERR)).length;
const todayBal = async () => computeKPIs(await S.getExpensesFromSheet(), '2026-11-11').currentBalance;
const rowOf = (desc: string, from = 1) => grid.findIndex((r, i) => i + 1 >= from && r[1] === desc) + 1;
const cVal = (row: number) => Number(evaluateAll()[row - 1][2]);
const endBal = () => Number(evaluateAll()[lastDataRow() - 1][4]);
// Identity of a transaction: date, description, type and literal amount (formula text in C is
// excluded because Sheets legitimately rewrites references when rows shift).
const txKey = (row: number) => { const r = grid[row - 1]; if (!r) return 'none'; const c = typeof r[2] === 'string' && r[2].startsWith('=') ? 'formula' : r[2]; return JSON.stringify([r[0], r[1], c, r[3]]); };
const externalTargets = () => external.flatMap(f => [...f.matchAll(/Expenses!([A-F])(\d+)\b/g)].map(m => txKey(+m[2])));
const fValues = () => evaluateAll().map((r, i) => [txKey(i + 1), r[5]] as [string, Raw]).filter(([, v]) => v !== '');
// What each column-F note points at: its own transaction + the transactions its formula references
const fTargets = () => grid.map((r, i) => [i + 1, r[5]] as [number, Raw]).filter(([, f]) => f !== '')
  .map(([row, f]) => JSON.stringify([txKey(row), ...[...String(f).matchAll(/\b([A-F])(\d+)\b/g)].map(m => txKey(+m[2]))])).sort();
const eByTx = () => new Map(evaluateAll().map((r, i) => [txKey(i + 1), r[4]]).filter(([k]) => k !== JSON.stringify(['', '', '', ''])) as [string, Raw][]);
const isSorted = () => { let prev = ''; for (let r = 3; r <= lastDataRow(); r++) { const a = grid[r - 1][0]; if (a === '') continue; const d = serialToISO(Number(a)); if (d < prev) return false; prev = d; } return true; };

(async () => {
  // ---- snapshot (read-only) ----
  let key = process.env.GOOGLE_PRIVATE_KEY!; if (key.startsWith('"')) key = JSON.parse(key); key = key.replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({ credentials: { client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: key }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const live = google.sheets({ version: 'v4', auth });
  const id = process.env.SPREADSHEET_ID!;
  const [F, U, L] = await Promise.all([
    live.spreadsheets.values.get({ spreadsheetId: id, range: 'Expenses!A1:F1500', valueRenderOption: 'FORMULA' }),
    live.spreadsheets.values.get({ spreadsheetId: id, range: 'Expenses!A1:F1500', valueRenderOption: 'UNFORMATTED_VALUE' }),
    live.spreadsheets.values.get({ spreadsheetId: id, range: 'Loans!A1:H1000', valueRenderOption: 'FORMULA' }),
  ]);
  grid = (F.data.values as Raw[][]).map(r => COLS.map((_, c) => r[c] ?? ''));
  external = (L.data.values || []).flat().filter((v: any) => typeof v === 'string' && /Expenses!/.test(v)) as string[];
  const liveU = U.data.values as Raw[][];
  S.__setSheetsClientForTests(mock);

  // T0 fidelity
  const ev = evaluateAll();
  const mis = ev.map((_, i) => i).filter(i => i > 0 && [4, 5].some(c => { const a = ev[i][c], b = liveU[i]?.[c] ?? ''; return typeof b === 'number' ? Math.abs(Number(a) - b) > 1e-6 : a !== b; }));
  check('T0 simulator reproduces every live Column E balance and F note', mis.length === 0, `${grid.length} rows, ${external.length} Loans refs tracked, ${mis.length} mismatches`);
  check('T0 today balance', (await todayBal()) === 114021, `₹${await todayBal()}`);
  const live0 = clone();

  // T1 the planned live change: Row 247 cycle-total formula (value must stay 4,000, no balance moves)
  const tge0 = rowOf('Total General Expenses', 245), reb0 = rowOf('Remaining Expenses Budget', 245);
  const e0 = evaluateAll().map(r => r[4]);
  grid[tge0 - 1][2] = CYCLE_FORMULA;
  check('T1 cycle-total formula on Row 247 evaluates to ₹4,000', cVal(tge0) === 4000, `row ${tge0}`);
  check('T1 every running balance unchanged', JSON.stringify(evaluateAll().map(r => r[4])) === JSON.stringify(e0));
  check('T1 Remaining Expenses Budget still ₹11,000', cVal(reb0) === 11000);
  const base = clone();
  const baseEnd = endBal(), baseE = eByTx(), baseF = fValues(), baseFT = fTargets(), baseExt = externalTargets();

  // T2 general spend logged today -> counted today, budget absorbs it, projection unchanged
  const r2 = await S.appendExpenseRow({ date: '2026-11-11', description: 'General Expenses', amount: 100, type: 'DEBIT' });
  const tge2 = rowOf('Total General Expenses', 245), reb2 = rowOf('Remaining Expenses Budget', 245);
  check('T2 today-dated log lands at Row 241', r2.newRow === 241, `row ${r2.newRow}`);
  check('T2 today balance −₹100', (await todayBal()) === 113921, `₹${await todayBal()}`);
  check('T2 cycle total ₹4,100 and remaining ₹10,900', cVal(tge2) === 4100 && cVal(reb2) === 10900, `${cVal(tge2)} / ${cVal(reb2)}`);
  check('T2 2027 projection unchanged (spend comes out of the budget)', Math.abs(endBal() - baseEnd) < 1e-6);
  check('T2 Loans refs still point at the same transactions', JSON.stringify(externalTargets()) === JSON.stringify(baseExt));
  check('T2 no #REF!', refErrors() === 0);

  // T3 undo = clear the row -> every transaction's balance back to baseline
  await S.deleteExpenseRow(r2.newRow);
  check('T3 undo: today balance back to ₹1,14,021', (await todayBal()) === 114021);
  const e3 = eByTx();
  check('T3 undo: every transaction has its original balance', [...baseE].every(([k, v]) => typeof v === 'number' ? Math.abs(Number(e3.get(k)) - v) < 1e-6 : e3.get(k) === v));
  check('T3 undo: cycle total back to ₹4,000', cVal(rowOf('Total General Expenses', 245)) === 4000);
  restore(base);

  // T4 non-general spend -> budget untouched, projection lower
  await S.appendExpenseRow({ date: '2026-11-11', description: 'SIM movie', amount: 100, type: 'DEBIT' });
  check('T4 non-general spend: cycle total stays ₹4,000', cVal(rowOf('Total General Expenses', 245)) === 4000);
  check('T4 non-general spend: projection −₹100', Math.abs(baseEnd - endBal() - 100) < 1e-6);
  restore(base);

  // T5 back-dated general spend (9 Nov) -> inserted above Row 240; F240 note follows its transaction
  const r5 = await S.appendExpenseRow({ date: '2026-11-09', description: 'General Expenses', amount: 500, type: 'DEBIT' });
  check('T5 back-dated log inserted at Row 240', r5.newRow === 240, `row ${r5.newRow}`);
  check('T5 cycle total ₹4,500, remaining ₹10,500', cVal(rowOf('Total General Expenses', 245)) === 4500 && cVal(rowOf('Remaining Expenses Budget', 245)) === 10500);
  check('T5 F note moved with its row (now F241 = E241 − 7000)', grid[240][5] === '=E241 -(7000 )', String(grid[240][5]));
  check('T5 today balance −₹500', (await todayBal()) === 113521);
  check('T5 Loans refs intact', JSON.stringify(externalTargets()) === JSON.stringify(baseExt));
  restore(base);

  // T6 general spend before the cycle (5 Nov) -> not in this cycle's total
  await S.appendExpenseRow({ date: '2026-11-05', description: 'General Expenses', amount: 300, type: 'DEBIT' });
  check('T6 spend dated before the cycle not counted', cVal(rowOf('Total General Expenses', 245)) === 4000);
  restore(base);

  // T7 general spend on the cycle's last day (6 Dec) goes above the summary rows and is counted
  const r7 = await S.appendExpenseRow({ date: '2026-12-06', description: 'Chai', amount: 50, type: 'DEBIT' });
  check('T7 same-day spend placed above Total General Expenses', r7.newRow < rowOf('Total General Expenses', 245), `row ${r7.newRow}`);
  check('T7 counted: cycle total ₹4,050', cVal(rowOf('Total General Expenses', 245)) === 4050);
  restore(base);

  // T8 delete (clear) a middle row + undo
  const g239 = [...grid[238]];
  await S.deleteExpenseRow(239);
  check('T8 delete Row 239: no #REF!', refErrors() === 0);
  check('T8 delete Row 239: today balance +₹10,000', (await todayBal()) === 124021, `₹${await todayBal()}`);
  check('T8 delete keeps every other row in place (F notes, Loans)', fValues().length === baseF.length && grid.length === base.grid.length);
  await S.restoreExpenseRow(239, { date: serialToISO(Number(g239[0])), description: String(g239[1]), amount: Number(g239[2]), type: g239[3] as any });
  check('T8 undo restores the sheet exactly', same(base));

  // T9 edits keep formulas
  await S.updateExpenseRow(tge0, { date: '2026-12-06', description: 'Total General Expenses', amount: 4000, type: 'SETTLEMENT' });
  check('T9 re-saving Row 247 keeps the cycle formula', grid[tge0 - 1][2] === CYCLE_FORMULA);
  await S.updateExpenseRow(reb0, { date: '2026-12-06', description: 'Remaining Expenses Budget', amount: 11000, type: 'DEBIT' });
  check('T9 re-saving Row 248 keeps its formula', String(grid[reb0 - 1][2]).replace(/\s/g, '') === `=15000-(C${tge0})`);
  await S.updateExpenseRow(2, { date: '2025-08-12', description: 'Opening/Current', amount: 0, type: 'DEBIT' });
  check('T9 editing Row 2 keeps the opening formula', grid[1][4] === '=55000+20000');
  await S.updateExpenseRow(38, { date: '2026-03-11', description: 'time lapse clear balance', amount: 18257, type: 'DEBIT' });
  check('T9 editing Row 38 keeps =0', grid[37][4] === '=0');
  restore(base);

  // T10 Time Lapse rule by description
  check('T10 Time Lapse rows by description', S.buildBalanceFormula(38, 'time lapse clear balance') === '=0' && S.buildBalanceFormula(39, 'time lapse start balance') === '=C39' && S.buildBalanceFormula(38, 'Rent').startsWith('=IF(OR(D38'));

  // T11 far-future log appended at the end
  const r11 = await S.appendExpenseRow({ date: '2030-01-01', description: 'SIM future', amount: 1, type: 'DEBIT' });
  check('T11 far-future log appended at the end, today unchanged', r11.newRow === base.grid.length + 1 && (await todayBal()) === 114021, `row ${r11.newRow}`);
  restore(base);

  // T12 delete guard
  let threw = false; try { await S.deleteExpenseRow(2); } catch { threw = true; }
  check('T12 deleting Row 2 is refused', threw && same(base));

  // T13 SORT (row moves)
  const sortRes = await S.sortExpensesSheet();
  check('T13 sort: sheet is in date order', isSorted(), `${sortRes.previousOrder.moves.length} row moves`);
  check('T13 sort: today balance unchanged', (await todayBal()) === 114021, `₹${await todayBal()}`);
  check('T13 sort: no #REF!', refErrors() === 0);
  check('T13 sort: every Loans ref still points at the same transaction', JSON.stringify(externalTargets()) === JSON.stringify(baseExt));
  check('T13 sort: every column-F note still references the same transactions', JSON.stringify(fTargets()) === JSON.stringify(baseFT));
  { const after = new Map(fValues()); for (const [k, v] of baseF) { const n = Number(after.get(k)); if (Math.abs(n - Number(v)) > 1e-6) console.log(`INFO  sort changes F note on ${JSON.parse(k)[1]} (${serialToISO(JSON.parse(k)[0])}): ${Number(v).toFixed(2)} -> ${n.toFixed(2)} (rows between its references were reordered by date)`); } }
  check('T13 sort: cycle total ₹4,000, remaining ₹11,000', cVal(rowOf('Total General Expenses', 245)) === 4000 && cVal(rowOf('Remaining Expenses Budget', 245)) === 11000);
  check('T13 sort: 2027 projection unchanged', Math.abs(endBal() - baseEnd) < 1e-6);
  const sorted = clone();
  check('T13 sort is idempotent', (await S.sortExpensesSheet()).previousOrder.moves.length === 0 && same(sorted));
  await S.restoreExpensesOrder(sortRes.previousOrder);
  check('T14 undo sort restores the sheet exactly', same(base));

  // T15 drag-reorder + undo
  const re = await S.reorderExpenseRows(239, 245);
  check('T15 reorder: Loans refs follow, no #REF!', JSON.stringify(externalTargets()) === JSON.stringify(baseExt) && refErrors() === 0);
  await S.restoreExpensesOrder(re.previousOrder);
  check('T15 undo reorder restores the sheet exactly', same(base));

  // T16 logging a future-dated EMI (the 13th Bike EMI on 2027-08-06 was added live this way on 12 Nov 2026)
  restore(live0);
  const bikeLive = trackEmiLoan(await S.getExpensesFromSheet(), 'Bike EMI', BIKE_LOAN_PRINCIPAL, '2027-12-31');
  check('T16 live sheet: bike loan fully scheduled, payoff 2027-08-06', bikeLive.unscheduled === 0 && bikeLive.payoffDate === '2027-08-06', `unscheduled ₹${bikeLive.unscheduled}, payoff ${bikeLive.payoffDate}`);
  const BIKE_EMI = 11770.923076923076;
  const ev16a = evaluateAll(), ext16 = externalTargets(), ft16 = JSON.stringify(fTargets()), fv16 = JSON.stringify(fValues()), end16 = endBal();
  const r16 = await S.appendExpenseRow({ date: '2027-08-06', description: 'Bike EMI', amount: BIKE_EMI, type: 'DEBIT' });
  const ev16b = evaluateAll();
  const n16 = r16.newRow;
  check('T16 bike EMI inserted in date order', isSorted() && serialToISO(Number(grid[n16 - 1][0])) === '2027-08-06' && serialToISO(Number(grid[n16][0])) >= '2027-08-06', `row ${n16} (above that day's cycle summary rows)`);
  check('T16 today balance unchanged', (await todayBal()) === 114021, `₹${await todayBal()}`);
  const before16 = ev16a.slice(0, n16 - 1).every((r, i) => r[4] === ev16b[i][4]);
  const after16 = ev16a.slice(n16 - 1, lastDataRow() - 1).every((r, i) => Math.abs(Number(r[4]) - BIKE_EMI - Number(ev16b[n16 + i][4])) < 1e-6);
  check('T16 balances above unchanged, every later balance down by exactly one EMI', before16 && after16 && Math.abs(Number(ev16b[n16 - 1][4]) - (Number(ev16a[n16 - 2][4]) - BIKE_EMI)) < 1e-6);
  check('T16 projected end balance down by one EMI', Math.abs(endBal() - (end16 - BIKE_EMI)) < 1e-6, `₹${Math.round(end16)} → ₹${Math.round(endBal())}`);
  check('T16 Loans refs, F note targets and values unchanged, no #REF!',
    JSON.stringify(externalTargets()) === JSON.stringify(ext16) && JSON.stringify(fTargets()) === ft16 && JSON.stringify(fValues()) === fv16 && refErrors() === 0);

  // T17 the instant (optimistic) drag preview matches what the server produces
  restore(live0);
  const last17 = lastDataRow();
  for (const [from, to] of [[239, 245], [245, 239], [40, 30], [30, 45], [last17, 3], [3, last17]]) {
    const before17 = await S.getExpensesFromSheet();
    const preview = previewRowMove(before17, from, to);
    await S.reorderExpenseRows(from, to);
    const actual = await S.getExpensesFromSheet();
    const pick = (l: typeof actual) => l.map(e => [e.rowIndex, e.description, e.date, e.type, Math.round(e.balance * 1e6) / 1e6, e.formula]);
    check(`T17 drag preview ${from}→${to} equals the server result`, JSON.stringify(pick(preview)) === JSON.stringify(pick(actual)));
    restore(live0);
  }

  restore(live0);
  S.__setSheetsClientForTests(null);
  console.log(`\n${pass} passed, ${fail} failed. Mock write calls: ${writes}. Live sheet writes: 0 (readonly scope).`);
  if (fail) process.exit(1);
})().catch(e => { console.error('ERR', e); process.exit(1); });
