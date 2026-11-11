// Write-path safety simulation for the Expenses tab.
// Takes a READ-ONLY snapshot of the live sheet (spreadsheets.readonly scope), then runs the real
// write functions in src/lib/sheets.ts against an in-memory copy that mimics Google Sheets' formula
// evaluation and reference shifting on row insert/delete. The live sheet is never written.
// Run: npm run test:sim
import { google } from 'googleapis';
import * as S from '../lib/sheets';
import { computeKPIs } from '../lib/computations';

type Raw = string | number;
const COLS = ['A', 'B', 'C', 'D', 'E'];
let grid: Raw[][] = []; // grid[r-1][c] raw entry (formula string or value)
let writes = 0;

// ---------- evaluator ----------
const ERR = '#REF!';
function evaluateAll(): (number | string)[][] {
  const memo = new Map<string, number | string>();
  const val = (col: string, row: number): number | string => {
    const key = col + row;
    if (memo.has(key)) return memo.get(key)!;
    const raw = grid[row - 1]?.[COLS.indexOf(col)];
    let v: number | string = raw === undefined ? '' : raw;
    if (typeof raw === 'string' && raw.startsWith('=')) v = evalFormula(raw);
    memo.set(key, v);
    return v;
  };
  const ref = (tok: string) => (tok === ERR ? ERR : val(tok[0], Number(tok.slice(1))));
  const STD = /^=IF\(OR\((D\d+|#REF!)="",.*?\), (E\d+|#REF!), IF\((?:D\d+|#REF!)="DEBIT", (?:E\d+|#REF!)-(C\d+|#REF!),/;
  function evalFormula(f: string): number | string {
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
    const expr = f.slice(1).replace(/\b([A-E])(\d+)\b/g, (_, c, r) => {
      const v = val(c, Number(r)); if (v === ERR) bad = true; return String(v === '' ? 0 : v);
    });
    if (bad) return ERR;
    if (!/^[0-9+\-*/(). ]+$/.test(expr)) throw new Error('cannot eval ' + f);
    return Function(`return (${expr})`)();
  }
  return grid.map((row, i) => COLS.map(c => val(c, i + 1)));
}

// ---------- structural reference adjustment (Google Sheets semantics) ----------
function adjustRefs(fn: (row: number) => number | null) {
  for (const row of grid) for (let c = 0; c < 5; c++) {
    const raw = row[c];
    if (typeof raw === 'string' && raw.startsWith('=')) {
      row[c] = raw.replace(/\b([A-E])(\d+)\b/g, (_, col, r) => { const n = fn(Number(r)); return n === null ? ERR : col + n; });
    }
  }
}

// ---------- mock client ----------
function parseRange(range: string) {
  const a1 = range.replace(/^Expenses!/, '');
  const m = a1.match(/^([A-E])(\d*)(?::([A-E])(\d*))?$/)!;
  const c1 = COLS.indexOf(m[1]), r1 = m[2] ? Number(m[2]) : 1;
  const c2 = COLS.indexOf(m[3] ?? m[1]), r2 = m[3] ? (m[4] ? Number(m[4]) : Infinity) : (m[2] ? r1 : Infinity);
  return { c1, r1, c2, r2 };
}
const toSerial = (s: string) => (Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000) + 25569;
const mock: any = { spreadsheets: {
  values: {
    get: async ({ range, valueRenderOption }: any) => {
      const { c1, r1, c2, r2 } = parseRange(range);
      const evald = valueRenderOption === 'FORMULA' ? null : evaluateAll();
      const out: Raw[][] = [];
      for (let r = r1; r <= Math.min(r2, grid.length); r++) {
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
        const r = r1 + i; while (grid.length < r) grid.push(['', '', '', '', '']);
        vals.forEach((v, j) => {
          grid[r - 1][c1 + j] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? toSerial(v) : v;
        });
      });
      return { data: {} };
    },
  },
  batchUpdate: async ({ requestBody }: any) => {
    writes++;
    for (const req of requestBody.requests) {
      if (req.insertDimension) {
        const k = req.insertDimension.range.startIndex + 1; // 1-based new row
        adjustRefs(r => (r >= k ? r + 1 : r));
        grid.splice(k - 1, 0, ['', '', '', '', '']);
      } else if (req.deleteDimension) {
        const k = req.deleteDimension.range.startIndex + 1;
        adjustRefs(r => (r === k ? null : r > k ? r - 1 : r));
        grid.splice(k - 1, 1);
      }
    }
    return { data: {} };
  },
} };

// ---------- helpers ----------
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const snapshot = () => ({ g: JSON.stringify(grid), e: evaluateAll().map(r => r[4]) });
const refErrors = () => evaluateAll().flat().filter(v => v === ERR).length + grid.flat().filter(v => typeof v === 'string' && v.includes(ERR)).length;
const todayBal = async () => computeKPIs(await S.getExpensesFromSheet(), '2026-11-11').currentBalance;
const findRow = (desc: string, from = 1) => grid.findIndex((r, i) => i + 1 >= from && r[1] === desc) + 1;

(async () => {
  // snapshot (read-only)
  let key = process.env.GOOGLE_PRIVATE_KEY!; if (key.startsWith('"')) key = JSON.parse(key); key = key.replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({ credentials: { client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: key }, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const live = google.sheets({ version: 'v4', auth });
  const id = process.env.SPREADSHEET_ID!;
  const [F, U] = await Promise.all(['FORMULA', 'UNFORMATTED_VALUE'].map(o => live.spreadsheets.values.get({ spreadsheetId: id, range: 'Expenses!A1:E1500', valueRenderOption: o as any })));
  grid = (F.data.values as Raw[][]).map(r => COLS.map((_, c) => r[c] ?? ''));
  const liveE = (U.data.values as Raw[][]).map(r => r[4]);
  S.__setSheetsClientForTests(mock);

  // T0 evaluator fidelity
  const ev = evaluateAll();
  const mism = ev.map((r, i) => i).filter(i => i > 0 && Math.abs(Number(ev[i][4]) - Number(liveE[i])) > 1e-6);
  check('T0 simulator reproduces every live Column E balance', mism.length === 0, `${grid.length} rows, ${mism.length} mismatches`);
  const base = snapshot();
  const baseBal = await todayBal();
  check('T0 today balance from simulator', baseBal === 114021, `₹${baseBal}`);

  // T1 old behaviour (for contrast): raw deleteDimension of a middle row
  await mock.spreadsheets.batchUpdate({ requestBody: { requests: [{ deleteDimension: { range: { sheetId: 0, dimension: 'ROWS', startIndex: 238, endIndex: 239 } } }] } });
  check('T1 [old] raw delete of Row 239 breaks the chain (#REF!)', refErrors() > 0, `${refErrors()} #REF! cells`);
  grid = JSON.parse(base.g);

  // T2 Quick Log today -> inserted after Row 240, counted in today's balance
  const r2 = await S.appendExpenseRow({ date: '2026-11-11', description: 'SIM chai', amount: 100, type: 'DEBIT' });
  check('T2 today-dated log lands at Row 241 (after Row 240)', r2.newRow === 241, `row ${r2.newRow}`);
  check('T2 today balance reflects the new spend', (await todayBal()) === 113921, `₹${await todayBal()}`);
  const tge = findRow('Total General Expenses', 245);
  check('T2 Total General Expenses still mirrors Row 240', grid[tge - 1][2] === '=C240' && evaluateAll()[tge - 1][2] === 4000, `${tge}: ${grid[tge - 1][2]}`);
  const reb = findRow('Remaining Expenses Budget', 245);
  check('T2 Remaining Expenses Budget still 11,000', evaluateAll()[reb - 1][2] === 11000, String(grid[reb - 1][2]));
  check('T2 no #REF! anywhere', refErrors() === 0);
  const endBefore = Number(base.e[base.e.length - 1]), endAfter = Number(evaluateAll()[grid.length - 1][4]);
  check('T2 2027 projection lower by exactly ₹100', Math.abs(endBefore - endAfter - 100) < 1e-6, `${endBefore.toFixed(2)} -> ${endAfter.toFixed(2)}`);

  // T3 undo of that log (delete created row) -> sheet byte-identical to snapshot
  await S.deleteExpenseRow(r2.newRow);
  check('T3 undo restores every formula exactly', JSON.stringify(grid) === base.g);
  check('T3 today balance back to ₹1,14,021', (await todayBal()) === 114021);

  // T4 back-dated log (8 Nov) -> inserted before Row 240; =C240 auto-shifts to the moved row
  const r4 = await S.appendExpenseRow({ date: '2026-11-08', description: 'SIM backdated', amount: 250, type: 'DEBIT' });
  const tge4 = findRow('Total General Expenses', 245);
  check('T4 back-dated log inserted at Row 240', r4.newRow === 240, `row ${r4.newRow}`);
  check('T4 budget mirror follows General Expenses to Row 241', grid[tge4 - 1][2] === '=C241' && evaluateAll()[tge4 - 1][2] === 4000, String(grid[tge4 - 1][2]));
  check('T4 today balance = 1,14,021 − 250', (await todayBal()) === 113771, `₹${await todayBal()}`);
  check('T4 no #REF!', refErrors() === 0);
  await S.deleteExpenseRow(r4.newRow);
  check('T4 undo restores snapshot exactly', JSON.stringify(grid) === base.g);

  // T5 safe delete of a middle row + undo via insertExpenseRowAt
  const g239 = grid[238];
  await S.deleteExpenseRow(239);
  check('T5 safe delete of Row 239 leaves no #REF!', refErrors() === 0);
  check('T5 today balance = 1,14,021 + 10,000 (Mummy Ring removed)', (await todayBal()) === 124021, `₹${await todayBal()}`);
  await S.insertExpenseRowAt(239, { date: '2026-11-08', description: String(g239[1]), amount: Number(g239[2]), type: g239[3] as any });
  check('T5 undo (restore row) gives identical balances', evaluateAll().every((r, i) => Math.abs(Number(r[4]) - Number(base.e[i])) < 1e-6 || r[4] === base.e[i]));
  check('T5 today balance back to ₹1,14,021', (await todayBal()) === 114021);
  grid = JSON.parse(base.g);

  // T6 editing Row 247 description keeps =C240; changing the amount writes the new number
  await S.updateExpenseRow(247, { date: '2026-12-06', description: 'Total General Expenses (renamed)', amount: 4000, type: 'SETTLEMENT' });
  check('T6 description edit keeps C247 formula', grid[246][2] === '=C240', String(grid[246][2]));
  await S.updateExpenseRow(248, { date: '2026-12-06', description: 'Remaining Expenses Budget', amount: 11000, type: 'DEBIT' });
  check('T6 re-saving Row 248 keeps its formula', String(grid[247][2]).replace(/\s/g, '') === '=15000-(C247)', String(grid[247][2]));
  await S.updateExpenseRow(247, { date: '2026-12-06', description: 'Total General Expenses', amount: 5000, type: 'SETTLEMENT' });
  check('T6 deliberate amount change is written', grid[246][2] === 5000);
  grid = JSON.parse(base.g);

  // T7 edits never rewrite special Column E formulas
  await S.updateExpenseRow(2, { date: '2025-08-12', description: 'Opening/Current', amount: 0, type: 'DEBIT' });
  check('T7 editing Row 2 keeps opening formula', grid[1][4] === '=55000+20000', String(grid[1][4]));
  await S.updateExpenseRow(38, { date: '2026-03-11', description: 'time lapse clear balance', amount: 18257, type: 'DEBIT' });
  check('T7 editing Row 38 keeps =0', grid[37][4] === '=0');
  grid = JSON.parse(base.g);

  // T8 Time Lapse rule follows description, not row number
  check('T8 Row 38 by description -> =0', S.buildBalanceFormula(38, 'time lapse clear balance') === '=0');
  check('T8 unrelated row on Row 38 gets normal formula', S.buildBalanceFormula(38, 'Rent').startsWith('=IF(OR(D38'));
  check('T8 Row 39 by description -> =C39', S.buildBalanceFormula(39, 'time lapse start balance') === '=C39');

  // T9 future date beyond last row -> plain append, nothing shifts
  const r9 = await S.appendExpenseRow({ date: '2030-01-01', description: 'SIM future', amount: 1, type: 'DEBIT' });
  check('T9 far-future log appended at the end', r9.newRow === base.e.length + 1, `row ${r9.newRow}`);
  check('T9 today balance unchanged', (await todayBal()) === 114021);
  grid = JSON.parse(base.g);

  // T10 delete guard
  let threw = false; try { await S.deleteExpenseRow(2); } catch { threw = true; }
  check('T10 deleting Row 2 is refused', threw && JSON.stringify(grid) === base.g);

  // T11 what the existing "Sort" button would do today (read of behaviour, simulated)
  await S.sortExpensesSheet();
  check('T11 [sort] today balance unchanged by Sort', (await todayBal()) === 114021, `₹${await todayBal()}`);
  check('T11 [sort] no #REF!', refErrors() === 0);
  grid = JSON.parse(base.g);

  S.__setSheetsClientForTests(null);
  console.log(`\n${pass} passed, ${fail} failed. Mock write calls: ${writes}. Live sheet writes: 0 (readonly scope).`);
})().catch(e => { console.error('ERR', e); process.exit(1); });
