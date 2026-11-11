import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

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

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = env.SPREADSHEET_ID;

  let allPassed = true;

  // 1. Verify Expenses!C15 === 30375
  const resC15 = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Expenses!C15',
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const valC15 = resC15.data.values?.[0]?.[0];
  const passedC15 = valC15 === 30375;
  console.log(`[CHECK 1] Expenses!C15: expected 30375, got ${valC15} -> ${passedC15 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passedC15) allPassed = false;

  // 2. Verify Expenses!D235 === 'SETTLEMENT'
  const resD235 = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Expenses!D235',
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const valD235 = resD235.data.values?.[0]?.[0];
  const passedD235 = valD235 === 'SETTLEMENT';
  console.log(`[CHECK 2] Expenses!D235: expected 'SETTLEMENT', got '${valD235}' -> ${passedD235 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passedD235) allPassed = false;

  // 3. Verify Loans!B2 === 18000
  const resB2 = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Loans!B2',
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const valB2 = resB2.data.values?.[0]?.[0];
  const passedB2 = valB2 === 18000;
  console.log(`[CHECK 3] Loans!B2: expected 18000, got ${valB2} -> ${passedB2 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passedB2) allPassed = false;

  // 4. Verify Column E Formula Lineage (Row 235 & Row 236)
  const resFormulas = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Expenses!E235:E236',
    valueRenderOption: 'FORMULA',
  });
  const formula235 = resFormulas.data.values?.[0]?.[0];
  const hasFormula235 = formula235 && String(formula235).startsWith('=IF(OR(D235=');
  console.log(`[CHECK 4] Column E dynamic formula lineage: ${hasFormula235 ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!hasFormula235) allPassed = false;

  // 5. Verify November 10 liquid balance resolves to ₹1,07,021 (with prepaid Bike EMI of ₹11,771 on Nov 6)
  const resBalance = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Expenses!E240',
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const valBalance = Math.round(Number(resBalance.data.values?.[0]?.[0]));
  const passedBalance = valBalance === 107021;
  console.log(`[CHECK 5] Liquid balance on 2026-11-10 (Row 240): expected 107021, got ${valBalance} -> ${passedBalance ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passedBalance) allPassed = false;

  console.log('-------------------------------------------');
  console.log(`FINAL AUDIT VERDICT: ${allPassed ? 'VERDICT: PASS ✅' : 'VERDICT: FAIL ❌'}`);
}

runIntegrityAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
