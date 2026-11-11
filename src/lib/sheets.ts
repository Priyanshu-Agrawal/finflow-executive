import { google, sheets_v4 } from 'googleapis';
import { ExpenseEntry, RawLoanRow, RowMove, RowOrderUndo, TransactionType } from './types';
import { GENERAL_EXCLUDE_PATTERN, GENERAL_EXPENSE_PATTERN } from './computations';
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

let sheetsClientOverride: sheets_v4.Sheets | null = null;

/** Test-only: route all Sheets calls to an in-memory client (pass null to reset). */
export function __setSheetsClientForTests(client: sheets_v4.Sheets | null): void {
  sheetsClientOverride = client;
}

function getSheets(): sheets_v4.Sheets {
  if (sheetsClientOverride) return sheetsClientOverride;
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
 * Generates the continuation formula for Column E.
 * The Time Lapse boundary rows (currently Rows 38 & 39) are recognised by their
 * description, not their row number, so the rule follows them if rows shift and can
 * never be applied to an unrelated transaction that lands on Row 38 or 39.
 * Always pass the row's description.
 */
export function buildBalanceFormula(row: number, description?: string): string {
  const desc = (description || '').toLowerCase();
  if (desc.includes('time lapse clear balance')) {
    return '=0';
  }
  if (desc.includes('time lapse start balance')) {
    return `=C${row}`;
  }
  const prev = row - 1;
  return `=IF(OR(D${row}="", D${row}="ADJUSTMENT", D${row}="SETTLEMENT", D${row}="OTHER", D${row}="DIRECT"), E${prev}, IF(D${row}="DEBIT", E${prev}-C${row}, IF(D${row}="CREDIT", E${prev}+C${row}, "")))`;
}

/**
 * Returns the 1-based row where a transaction dated `newDate` (YYYY-MM-DD) belongs:
 * just before the first transaction row (Row 3 onwards) dated later than it, or
 * after the last row if none is later. Same-day entries go after existing ones.
 * `colA` is Expenses!A:A as returned by the API (index 0 = Row 1).
 */
export function findChronologicalInsertRow(colAB: unknown[][], newDate: string): number {
  for (let i = 2; i < colAB.length; i++) {
    const cell = colAB[i]?.[0];
    if (cell === undefined || cell === null || cell === '') continue;
    const d = normalizeDate(cell as string | number);
    if (d > newDate) return i + 1;
    // Same-day cycle summary rows stay below that day's transactions so the
    // cycle total formula (rows above it) includes the new entry.
    if (d === newDate && CYCLE_SUMMARY_RE.test(String(colAB[i]?.[1] ?? ''))) return i + 1;
  }
  return colAB.length + 1;
}

const CYCLE_SUMMARY_RE = /total general expenses|remaining expenses budget/i;

/**
 * Column C formula for a cycle's "Total General Expenses" row: sums the general-expense
 * DEBITs dated from the cycle start (one month before the day after this row's date)
 * to this row's date, among the rows above it. Uses ROW()/OFFSET only, so it keeps
 * working wherever the row moves and never references its own cell.
 * Classification matches computeBudgetPacing (GENERAL_EXPENSE_PATTERN / _EXCLUDE_).
 */
export function buildCycleGeneralTotalFormula(): string {
  const col = (c: string) => `OFFSET(${c}$1,2,0,ROW()-3)`;
  return (
    `=SUMPRODUCT((${col('A')}>=EDATE(INDEX(A:A,ROW())+1,-1))` +
    `*(${col('A')}<=INDEX(A:A,ROW()))` +
    `*(${col('D')}="DEBIT")` +
    `*REGEXMATCH(LOWER(${col('B')}),"${GENERAL_EXPENSE_PATTERN}")` +
    `*(REGEXMATCH(LOWER(${col('B')}),"${GENERAL_EXCLUDE_PATTERN}")=FALSE),${col('C')})`
  );
}

/**
 * Re-links the Column E running-balance formula of the given rows (if they exist).
 * Used after a row insert/delete, where only the row next to the change loses its
 * link to the row above; every other reference is shifted correctly by Sheets.
 */
async function relinkBalanceFormulas(sheets: sheets_v4.Sheets, rows: number[]): Promise<void> {
  for (const row of rows) {
    if (row < 3) continue; // Row 2 holds the opening balance; never rewrite it
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Expenses!A${row}:B${row}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const cells = res.data.values?.[0];
    if (!cells || cells[0] === undefined || cells[0] === '') continue; // no transaction here
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Expenses!E${row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[buildBalanceFormula(row, String(cells[1] ?? ''))]] },
    });
  }
}

/**
 * Logs a single transaction in date order: it is inserted before the first
 * later-dated row (or appended if none), so today's balance reflects it
 * immediately. Formulas elsewhere (e.g. =C240) shift with the inserted row.
 */
export async function appendExpenseRow(data: {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
}): Promise<{ newRow: number }> {
  const sheets = getSheets();

  const metaRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Expenses!A:B',
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const colAB = metaRes.data.values || [];
  const lastRow = colAB.length;
  const targetRow = findChronologicalInsertRow(colAB, normalizeDate(data.date));

  if (targetRow <= lastRow) {
    await insertExpenseRowAt(targetRow, data);
    return { newRow: targetRow };
  }

  const newRow = lastRow + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!A${newRow}:E${newRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[data.date, data.description, data.amount, data.type, buildBalanceFormula(newRow, data.description)]],
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
    const formula = buildBalanceFormula(currentRow, r.description);
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
 * Updates columns A:D of an existing row.
 * - A Column C formula (e.g. =C240, =15000-(C247)) is kept unless the amount was
 *   actually changed, so editing a description or date never flattens it.
 * - Column E is left alone when it already holds a formula (including the opening
 *   balance and Time Lapse rows); it is only (re)written when missing.
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

  const [formulaRes, valueRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Expenses!C${rowIndex}:E${rowIndex}`,
      valueRenderOption: 'FORMULA',
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Expenses!C${rowIndex}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    }),
  ]);
  const currentC = formulaRes.data.values?.[0]?.[0];
  const currentE = formulaRes.data.values?.[0]?.[2];
  const currentCValue = Number(valueRes.data.values?.[0]?.[0]);

  const cIsFormula = typeof currentC === 'string' && currentC.startsWith('=');
  const amountUnchanged = Number.isFinite(currentCValue) && Math.abs(currentCValue - data.amount) < 0.005;
  const amountCell = cIsFormula && amountUnchanged ? currentC : data.amount;

  const eIsFormula = typeof currentE === 'string' && currentE.startsWith('=');
  const row = [data.date, data.description, amountCell, data.type];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: eIsFormula ? `Expenses!A${rowIndex}:D${rowIndex}` : `Expenses!A${rowIndex}:E${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [eIsFormula ? row : [...row, buildBalanceFormula(rowIndex, data.description)]],
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
 * "Deletes" a transaction by clearing its values (A:D) while keeping the row.
 * Other tabs (Loans), column F notes and Dashboard_Data refer to Expenses rows by
 * position; removing the row would turn those references into #REF!. A cleared row
 * carries the balance forward (blank type) and is skipped by the app. Undo refills it.
 */
export async function deleteExpenseRow(rowIndex: number): Promise<void> {
  if (rowIndex < 3) {
    throw new Error('Rows 1-2 (header and opening balance) cannot be deleted');
  }
  const sheets = getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!A${rowIndex}:D${rowIndex}`,
  });
}

/**
 * Undo for deleteExpenseRow: refills a cleared row in place. If the row is not
 * empty (e.g. an undo recorded before soft delete existed), inserts a row instead.
 */
export async function restoreExpenseRow(
  rowIndex: number,
  data: { date: string; description: string; amount: number; type: TransactionType }
): Promise<void> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!A${rowIndex}:E${rowIndex}`,
    valueRenderOption: 'FORMULA',
  });
  const cells = res.data.values?.[0] || [];
  const isEmpty = [0, 1, 2, 3].every((i) => cells[i] === undefined || cells[i] === '');
  if (!isEmpty) {
    await insertExpenseRowAt(rowIndex, data);
    return;
  }
  const eIsFormula = typeof cells[4] === 'string' && String(cells[4]).startsWith('=');
  const row = [data.date, data.description, data.amount, data.type];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: eIsFormula ? `Expenses!A${rowIndex}:D${rowIndex}` : `Expenses!A${rowIndex}:E${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [eIsFormula ? row : [...row, buildBalanceFormula(rowIndex, data.description)]] },
  });
}

/**
 * Inserts a transaction at a specific row index (for restoring deleted row during Undo)
 * and re-establishes Column E formulas
 */
export async function insertExpenseRowAt(
  rowIndex: number,
  data: {
    date: string;
    description: string;
    amount: number;
    type: TransactionType;
  }
): Promise<void> {
  const sheets = getSheets();

  // 1. Insert row dimension
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: 0,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
            inheritFromBefore: true,
          },
        },
      ],
    },
  });

  // 2. Write data + balance formula to the inserted row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!A${rowIndex}:E${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[data.date, data.description, data.amount, data.type, buildBalanceFormula(rowIndex, data.description)]],
    },
  });

  // 3. The row pushed down still points at the row above the insert; re-link it to
  //    the new row. Rows further down were shifted correctly by Sheets.
  await relinkBalanceFormulas(sheets, [rowIndex + 1]);
}

const EXPENSES_SHEET_ID = 0; // gid of the Expenses tab

/** Builds a moveDimension request that moves one Expenses row so it ends up at `to`. */
function moveRowRequest(m: RowMove): sheets_v4.Schema$Request {
  const s0 = m.from - 1;
  const t0 = m.to - 1;
  return {
    moveDimension: {
      source: { sheetId: EXPENSES_SHEET_ID, dimension: 'ROWS', startIndex: s0, endIndex: s0 + 1 },
      // destinationIndex is in coordinates before the row is removed
      destinationIndex: t0 < s0 ? t0 : t0 + 1,
    },
  };
}

/** Reverses a list of moves (for undo). */
export function invertMoves(moves: RowMove[]): RowMove[] {
  return [...moves].reverse().map((m) => ({ from: m.to, to: m.from }));
}

/**
 * Plans the row moves that sort rows 3.. by date (stable: same-day rows keep their
 * order). `keys` are the column A values of rows 3..last; cleared rows inherit the
 * date of the row above so they stay where they are.
 */
export function planSortMoves(keys: unknown[]): RowMove[] {
  let prev = '';
  const dates = keys.map((k) => {
    if (k === undefined || k === null || k === '') return prev;
    prev = normalizeDate(k as string | number);
    return prev;
  });
  const target = dates
    .map((d, i) => ({ d, i }))
    .sort((x, y) => x.d.localeCompare(y.d) || x.i - y.i)
    .map((x) => x.i);
  const current = dates.map((_, i) => i);
  const moves: RowMove[] = [];
  for (let pos = 0; pos < target.length; pos++) {
    const j = current.indexOf(target[pos]);
    if (j !== pos) {
      const [item] = current.splice(j, 1);
      current.splice(pos, 0, item);
      moves.push({ from: j + 3, to: pos + 3 });
    }
  }
  return moves;
}

/** Rewrites Column E (rows 3..lastRow) with the running-balance formula for each row. */
async function rewriteBalanceColumn(sheets: sheets_v4.Sheets, lastRow: number): Promise<void> {
  if (lastRow < 3) return;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!B3:B${lastRow}`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const desc = res.data.values || [];
  const formulas: string[][] = [];
  for (let r = 3; r <= lastRow; r++) {
    formulas.push([buildBalanceFormula(r, String(desc[r - 3]?.[0] ?? ''))]);
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Expenses!E3:E${lastRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: formulas },
  });
}

/** Applies row moves (whole rows, so every reference follows its row) and re-links Column E. */
async function applyRowMoves(sheets: sheets_v4.Sheets, moves: RowMove[]): Promise<void> {
  if (moves.length === 0) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: moves.map(moveRowRequest) },
  });
  const metaRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Expenses!A:A',
  });
  await rewriteBalanceColumn(sheets, (metaRes.data.values || []).length);
}

/**
 * Sorts transactions (Row 3 onwards) by date by MOVING whole rows, the same as
 * dragging rows in Sheets: Loans-tab references, column F notes and Column C
 * formulas keep pointing at the same transactions. Column E is then re-linked.
 * Returns the inverse moves for undo.
 */
export async function sortExpensesSheet(): Promise<{
  sortedCount: number;
  previousOrder: RowOrderUndo;
}> {
  const sheets = getSheets();

  const metaRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Expenses!A:A',
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const colA = metaRes.data.values || [];
  if (colA.length < 4) {
    return { sortedCount: 0, previousOrder: { moves: [] } };
  }

  const moves = planSortMoves(colA.slice(2).map((r) => r?.[0]));
  await applyRowMoves(sheets, moves);

  return {
    sortedCount: colA.length - 2,
    previousOrder: { moves: invertMoves(moves) },
  };
}

/**
 * Undo for sort / reorder: replays the inverse row moves.
 */
export async function restoreExpensesOrder(previousOrder: RowOrderUndo): Promise<void> {
  if (!previousOrder || !Array.isArray(previousOrder.moves)) {
    throw new Error('This undo was recorded by an older version of the app. Refresh the page.');
  }
  await applyRowMoves(getSheets(), previousOrder.moves);
}

/**
 * Moves one transaction row from sourceIndex to targetIndex (rows >= 3) as a whole
 * row, then re-links Column E. Returns the inverse move for undo.
 */
export async function reorderExpenseRows(
  sourceIndex: number,
  targetIndex: number
): Promise<{
  previousOrder: RowOrderUndo;
}> {
  const sheets = getSheets();

  const metaRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Expenses!A:A',
  });
  const lastRow = (metaRes.data.values || []).length;
  if (sourceIndex < 3 || targetIndex < 3 || sourceIndex > lastRow || targetIndex > lastRow) {
    throw new Error(`Invalid source (${sourceIndex}) or target (${targetIndex}) row index`);
  }

  const move: RowMove = { from: sourceIndex, to: targetIndex };
  await applyRowMoves(sheets, [move]);
  return { previousOrder: { moves: invertMoves([move]) } };
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

