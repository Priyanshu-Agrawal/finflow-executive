import { google, sheets_v4 } from 'googleapis';
import { ExpenseEntry, RawLoanRow, TransactionType } from './types';
import { normalizeDate } from './date-utils';

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials in environment variables.');
  }

  // Handle escaped newlines from environment variable strings
  let sanitizedKey = privateKey;
  if (sanitizedKey.startsWith('"') && sanitizedKey.endsWith('"')) {
    sanitizedKey = JSON.parse(sanitizedKey);
  }
  sanitizedKey = sanitizedKey.replace(/\\n/g, '\n');

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: sanitizedKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets(): sheets_v4.Sheets {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A';

/**
 * Reads all rows from the Expenses tab
 */
export async function getExpensesFromSheet(): Promise<ExpenseEntry[]> {
  const sheets = getSheets();

  // Fetch values and formulas in parallel
  const [valuesRes, formulasRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Expenses!A1:E1500',
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Expenses!E1:E1500',
      valueRenderOption: 'FORMULA',
    }),
  ]);

  const rawRows = valuesRes.data.values || [];
  const rawFormulas = formulasRes.data.values || [];

  const entries: ExpenseEntry[] = [];

  // Row 1 is header: Date, Description, Transaction Amount, Credit/Debit, Remaining Balance
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0 || row[0] === undefined || row[0] === '') {
      continue;
    }

    const rowIndex = i + 1; // 1-based row in Google Sheets
    const rawDate = String(row[0] || '');
    const date = normalizeDate(row[0]);
    const description = String(row[1] || '').trim();
    const amount = typeof row[2] === 'number' ? row[2] : parseFloat(String(row[2] || '0').replace(/[^0-9.-]+/g, '')) || 0;
    const type = (String(row[3] || 'DEBIT').toUpperCase().trim()) as TransactionType;
    const balance = typeof row[4] === 'number' ? row[4] : parseFloat(String(row[4] || '0').replace(/[^0-9.-]+/g, '')) || 0;

    const formula = rawFormulas[i]?.[0] ? String(rawFormulas[i][0]) : undefined;
    const isFormulaBacked = !!formula && formula.startsWith('=');

    entries.push({
      rowIndex,
      date,
      rawDate,
      description,
      amount,
      type,
      balance,
      isFormulaBacked,
      formula,
    });
  }

  return entries;
}

/**
 * Reads all rows from the Loans tab
 */
export async function getLoansFromSheet(): Promise<{
  rows: RawLoanRow[];
  b2RawValue: number;
}> {
  const sheets = getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Loans!A1:H500',
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rawRows = res.data.values || [];
  const rows: RawLoanRow[] = [];

  let b2RawValue = 18000;
  if (rawRows.length > 1 && rawRows[1][1] !== undefined) {
    const val = rawRows[1][1];
    b2RawValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 18000;
  }

  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.length === 0 || !r[0]) continue;

    const parseNum = (v: any) => {
      if (typeof v === 'number') return v;
      if (!v) return undefined;
      const parsed = parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
      return isNaN(parsed) ? undefined : parsed;
    };

    rows.push({
      date: normalizeDate(r[0]),
      bcaDue: parseNum(r[1]),
      bikeLoan: parseNum(r[2]),
      creditCardSbi: parseNum(r[3]),
      bhaiyaUdhar: parseNum(r[4]),
      diplomaDue: parseNum(r[5]),
      idfcCreditCard: parseNum(r[6]),
      sikarwarDue: parseNum(r[7]),
    });
  }

  return { rows, b2RawValue };
}

/**
 * Generates the continuation formula for Column E
 */
export function buildBalanceFormula(row: number): string {
  const prev = row - 1;
  return `=IF(OR(D${row}="", D${row}="ADJUSTMENT", D${row}="SETTLEMENT", D${row}="OTHER", D${row}="DIRECT"), E${prev}, IF(D${row}="DEBIT", E${prev}-C${row}, IF(D${row}="CREDIT", E${prev}+C${row}, "")))`;
}

/**
 * Appends a single transaction to Expenses tab
 * Writes raw data to A:D and formula to E
 */
export async function appendExpenseRow(data: {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
}): Promise<{ newRow: number }> {
  const sheets = getSheets();

  // Find the last row
  const metaRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Expenses!A:A',
  });

  const lastRow = (metaRes.data.values || []).length;
  const newRow = lastRow + 1;
  const formula = buildBalanceFormula(newRow);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!A${newRow}:E${newRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[data.date, data.description, data.amount, data.type, formula]],
    },
  });

  return { newRow };
}

/**
 * Appends multiple rows (e.g. EMI schedule) chronologically with formulas
 */
export async function batchAppendExpenses(
  rows: Array<{
    date: string;
    description: string;
    amount: number;
    type: TransactionType;
  }>
): Promise<{ startRow: number; count: number }> {
  const sheets = getSheets();

  const metaRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Expenses!A:A',
  });

  const lastRow = (metaRes.data.values || []).length;
  const startRow = lastRow + 1;

  const valuesToWrite = rows.map((r, idx) => {
    const currentRow = startRow + idx;
    const formula = buildBalanceFormula(currentRow);
    return [r.date, r.description, r.amount, r.type, formula];
  });

  const endRow = startRow + rows.length - 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!A${startRow}:E${endRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: valuesToWrite,
    },
  });

  return { startRow, count: rows.length };
}

/**
 * Updates columns A:D of an existing row, preserving/refreshing E formula
 */
export async function updateExpenseRow(
  rowIndex: number,
  data: {
    date: string;
    description: string;
    amount: number;
    type: TransactionType;
  }
): Promise<void> {
  const sheets = getSheets();
  const formula = buildBalanceFormula(rowIndex);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!A${rowIndex}:E${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[data.date, data.description, data.amount, data.type, formula]],
    },
  });
}

/**
 * 1-Click Type cycle: DEBIT -> CREDIT -> SETTLEMENT
 * Only modifies Column D so formula in Column E remains untouched and recalculates.
 */
export async function updateExpenseType(rowIndex: number, newType: TransactionType): Promise<void> {
  const sheets = getSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!D${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[newType]],
    },
  });
}

/**
 * Deletes a row using deleteDimension (preserves downstream formula references)
 */
export async function deleteExpenseRow(rowIndex: number): Promise<void> {
  const sheets = getSheets();

  // Sheet gid=0 is Expenses
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: 0,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // 0-based inclusive
              endIndex: rowIndex,       // 0-based exclusive
            },
          },
        },
      ],
    },
  });
}

/**
 * Reads peer-to-peer expense split matrix from the Ledger tab
 */
export async function getPeerLedgerFromSheet() {
  const sheets = getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Ledger!A1:E100',
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rawRows = res.data.values || [];
  const entries = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length < 2 || !row[0] || !row[1] || row[0] === 'Total') continue;

    const parseNum = (v: any) => {
      if (typeof v === 'number') return v;
      const parsed = parseFloat(String(v || '0').replace(/[^0-9.-]+/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    const amount = parseNum(row[1]);
    if (amount <= 0 && (!row[2] || row[2] === '')) continue;

    entries.push({
      rowIndex: i + 1,
      date: String(row[0] || '').trim(),
      amount,
      description: String(row[2] || '').trim(),
      splitWith: String(row[3] || '').trim(),
      perPersonShare: parseNum(row[4] || row[1]),
    });
  }

  return entries;
}

/**
 * Reads Royal Enfield Meteor accessories & capital costs from Meteor tab
 */
export async function getMeteorDataFromSheet() {
  const sheets = getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Meteor!A1:D35',
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rawRows = res.data.values || [];
  const accessories = [];
  const costs = [];

  let isCapitalSection = false;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const label = String(row[0] || '').trim();
    if (!label) continue;

    if (label.toLowerCase().includes('ex-showroom')) {
      isCapitalSection = true;
    }

    if (isCapitalSection) {
      const parseNum = (v: any) => {
        if (typeof v === 'number') return v;
        const parsed = parseFloat(String(v || '0').replace(/[^0-9.-]+/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      };
      const amt = parseNum(row[1]);
      costs.push({
        label,
        amount: label.toLowerCase().includes('booking') ? -Math.abs(amt) : amt,
      });
    } else {
      accessories.push({
        name: label,
        variant: String(row[1] || '').trim(),
        rePrice: String(row[2] || '').trim(),
        afterMarketPrice: String(row[3] || '').trim(),
      });
    }
  }

  return { accessories, costs };
}

/**
 * Appends a new shared outlay to the Ledger tab
 */
export async function appendPeerLedgerRow(data: {
  date: string;
  amount: number;
  description: string;
  splitWith: string;
  perPersonShare: number;
}): Promise<void> {
  const sheets = getSheets();

  const metaRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Ledger!A:A',
  });

  // Find last row before blank or total
  const rows = metaRes.data.values || [];
  let insertRow = rows.length + 1;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i] || !rows[i][0] || rows[i][0] === '') {
      insertRow = i + 1;
      break;
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Ledger!A${insertRow}:E${insertRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[data.date, data.amount, data.description, data.splitWith, data.perPersonShare]],
    },
  });
}

/**
 * Resets Loans!B2 directly to 18000
 */
export async function resetBCALoanToBaseline(): Promise<void> {
  const sheets = getSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Loans!B2',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[18000]],
    },
  });
}

/**
 * Updates a cell directly in the Loans sheet (e.g. Loans!D2 or Loans!C2)
 */
export async function updateLoanCell(cellRange: string, value: any): Promise<void> {
  const sheets = getSheets();
  const cleanRange = cellRange.startsWith('Loans!') ? cellRange : `Loans!${cellRange}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: cleanRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[value]],
    },
  });
}

