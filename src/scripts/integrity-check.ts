// Read-only live-sheet checks. Rows are found by date + description (findRowByDateDescription,
// anchorRowFor), never by a fixed row number: logging inserts by date, so any row after an
// insertion point drifts. A check pinned to "row 240" would fail the moment a back-dated entry
// landed above it, even though nothing was actually wrong.
import { sheets as googleSheets } from '@googleapis/sheets';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { getExpensesFromSheet } from '../lib/sheets';
import { findRowByDateDescription } from '../lib/sheet-row-finder';
import { anchorRowFor } from '../lib/anchor';

const TODAY = '2026-11-11'; // the anchor date CHECK 5 verifies (see HANDOVER_2026-11-12.md)

async function runIntegrityAudit() {
  console.log('--- STARTING FINFLOW INTEGRITY AUDIT ---');

  const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const env: Record<string, string> = {};
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2];
      if (val.startsWith('"') && val.endsWith('"')) val = JSON.parse(val);
      env[match[1]] = val;
    }
  }
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'SPREADSHEET_ID']) {
    if (!process.env[k] && env[k]) process.env[k] = env[k];
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = googleSheets({ version: 'v4', auth });
  const spreadsheetId = env.SPREADSHEET_ID;

  let allPassed = true;
  const fail = (msg: string) => {
    console.log(msg);
    allPassed = false;
  };

  // One bulk read (via the app's own getExpensesFromSheet: 2 requests, values + formulas),
  // reused by every Expenses check below — far fewer reads than one per pinned cell.
  const expenses = await getExpensesFromSheet();

  // 1. The BCA EMI row (the earliest-dated row these checks look at) still carries its amount.
  const bcaEmi = findRowByDateDescription(expenses, '2025-09-08', 'BCA EMI');
  const passed1 = bcaEmi?.amount === 30375;
  console.log(`[CHECK 1] 'BCA EMI' (2025-09-08): expected amount 30375, got ${bcaEmi?.amount ?? '(row not found)'} -> ${passed1 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed1) fail('  Row not found or amount changed — a back-dated entry may have landed here, or the row was edited.');

  // 2. The cycle-total row for the 7 Nov – 6 Dec cycle is still a SETTLEMENT (carries forward,
  // never debits the running balance).
  const cycleTotalNov = findRowByDateDescription(expenses, '2026-11-06', 'Total General Expenses');
  const passed2 = cycleTotalNov?.type === 'SETTLEMENT';
  console.log(`[CHECK 2] 'Total General Expenses' (2026-11-06): expected type SETTLEMENT, got ${cycleTotalNov?.type ?? '(row not found)'} -> ${passed2 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed2) fail('  Row not found or its type changed.');

  // 3. Loans!B2 (BCA baseline) — a different tab, untouched by Expenses row moves, so it can
  // safely stay a fixed cell.
  const resB2 = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Loans!B2', valueRenderOption: 'UNFORMATTED_VALUE' });
  const valB2 = resB2.data.values?.[0]?.[0];
  const passed3 = valB2 === 18000;
  console.log(`[CHECK 3] Loans!B2: expected 18000, got ${valB2} -> ${passed3 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed3) fail('');

  // 4. Column E keeps its continuation formula (not a static number) on the cycle-total row and
  // the row right after it in sheet order.
  const bikeEmiNov = cycleTotalNov ? expenses.find((e) => e.rowIndex === cycleTotalNov.rowIndex + 1) : undefined;
  const formula4 = cycleTotalNov?.formula;
  const formulaBacked4 = cycleTotalNov?.isFormulaBacked && bikeEmiNov?.isFormulaBacked;
  console.log(`[CHECK 4] Column E dynamic formula lineage (around 'Total General Expenses' 2026-11-06): ${formulaBacked4 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!formulaBacked4) fail(`  Formula on that row: ${formula4 ?? '(none)'}`);

  // 5. Today's liquid balance: the same rule the app itself uses for "today" (the last row dated
  // on or before the reference date, reading the sheet top-down).
  const anchor = anchorRowFor(expenses, TODAY);
  const valBalance = anchor ? Math.round(anchor.balance) : NaN;
  const passed5 = valBalance === 114021;
  console.log(`[CHECK 5] Liquid balance on ${TODAY} (found at row ${anchor?.rowIndex ?? '?'}, '${anchor?.description ?? '?'}'): expected 114021, got ${valBalance} -> ${passed5 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed5) fail('  The non-negotiable: today\'s balance must not change because of our work.');

  // 6. The December 6 cycle budget chain: Total General Expenses (SETTLEMENT) followed by
  // Remaining Expenses Budget (DEBIT), whose balance is the settlement's balance minus itself.
  const cycleTotalDec = findRowByDateDescription(expenses, '2026-12-06', 'Total General Expenses');
  const remainingDec = findRowByDateDescription(expenses, '2026-12-06', 'Remaining Expenses Budget');
  const passed6 = !!(
    cycleTotalDec &&
    remainingDec &&
    Math.round(cycleTotalDec.amount) === 4000 &&
    cycleTotalDec.type === 'SETTLEMENT' &&
    Math.round(remainingDec.amount) === 11000 &&
    remainingDec.type === 'DEBIT' &&
    Math.abs(remainingDec.balance - (cycleTotalDec.balance - remainingDec.amount)) < 1e-6
  );
  if (remainingDec) console.log(`  Remaining Expenses Budget projected balance: ₹${Math.round(remainingDec.balance)}`);
  console.log(`[CHECK 6] December 6 Cycle Budget & Projection ('Total General Expenses' / 'Remaining Expenses Budget', 2026-12-06): ${passed6 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed6) fail('  One of the two rows was not found, or the chain is broken.');

  console.log('-------------------------------------------');
  console.log(`FINAL AUDIT VERDICT: ${allPassed ? 'VERDICT: PASS ✅' : 'VERDICT: FAIL ❌'}`);
  if (!allPassed) process.exitCode = 1;
}

runIntegrityAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
