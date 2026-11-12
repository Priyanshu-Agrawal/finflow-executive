// Run against a production build on :3007. NEVER writes to the live sheet: every write endpoint is
// intercepted and answered by a tiny in-test fake server; reads reuse one captured financials response.
import { chromium, type Page } from 'playwright';

const BASE = process.env.V2_BASE || 'http://localhost:3007';
const today = new Date().toLocaleDateString('en-CA');
const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA'); })();
function check(ok: boolean, msg: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));

    // --- fake server -------------------------------------------------------------------------
    const writes: Array<{ method: string; url: string; body: any }> = [];
    let rows: any[] = [];
    let failNext = false;
    const slot = (date: string) => { const r = rows.find((x) => x.rowIndex >= 3 && x.date > date); return r ? r.rowIndex : rows[rows.length - 1].rowIndex + 1; };
    const insert = (e: any) => { const n = slot(e.date); rows = [...rows.map((r) => (r.rowIndex >= n ? { ...r, rowIndex: r.rowIndex + 1 } : r)), { ...e, rowIndex: n, rawDate: e.date, balance: 0, isFormulaBacked: true }].sort((a, b) => a.rowIndex - b.rowIndex); return n; };
    let base: any = null;
    await page.route('**/api/expenses/log', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      writes.push({ method: 'POST', url: '/api/expenses/log', body });
      await new Promise((r) => setTimeout(r, 900)); // slow server: the optimistic row must already be on screen
      if (failNext) { failNext = false; return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Sheets said no' }) }); }
      const newRow = insert(body);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, newRow }) });
    });
    await page.route('**/api/expenses/schedule-emi', (route) => {
      writes.push({ method: 'POST', url: '/api/expenses/schedule-emi', body: JSON.parse(route.request().postData() || '{}') });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, startRow: rows.length + 2, count: 6 }) });
    });
    await page.route(/\/api\/expenses\/\d+$/, (route) => {
      const n = Number(route.request().url().split('/').pop());
      writes.push({ method: route.request().method(), url: `/api/expenses/${n}`, body: null });
      rows = rows.filter((r) => r.rowIndex !== n).map((r) => (r.rowIndex > n ? { ...r, rowIndex: r.rowIndex - 1 } : r));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const first = page.waitForResponse((r) => r.url().includes('/api/financials') && r.ok(), { timeout: 60000 });
    await page.goto(`${BASE}/v2`);
    base = await (await first).json();
    rows = base.expenses.map((r: any) => ({ ...r }));
    await page.route('**/api/financials*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...base, expenses: rows }) }));
    await page.getByTestId('balance-now').waitFor();

    const dialog = page.getByRole('dialog', { name: 'Log' });
    const open = async () => { await page.getByRole('button', { name: 'Log a spend' }).click(); await dialog.waitFor(); };
    const key = async (k: string) => dialog.getByRole('button', { name: k, exact: true }).click();
    const save = () => dialog.getByRole('button', { name: /^(Log|Schedule|Enter an amount)/ });

    // --- open, focus, Escape ---------------------------------------------------------------
    await open();
    check(await dialog.evaluate((d) => d.contains(document.activeElement)), `[${scheme}] focus moves into the sheet`);
    await page.keyboard.press('Escape');
    check(await dialog.isHidden(), `[${scheme}] Escape closes the sheet`);
    await open();
    await page.mouse.click(190, 20);
    check(await dialog.isHidden(), `[${scheme}] tapping outside closes the sheet`);

    // --- keypad and the save button ----------------------------------------------------------
    await open();
    check((await save().innerText()).includes('Enter an amount') && (await save().isDisabled()), `[${scheme}] save says "Enter an amount" until there is one`);
    await key('0');
    check((await save().innerText()).includes('Enter an amount'), `[${scheme}] a leading zero is ignored`);
    for (const k of ['2', '5', '0']) await key(k);
    check((await dialog.getByTestId('log-amount').innerText()) === '₹250', `[${scheme}] keypad shows ₹250`);
    check((await save().innerText()) === 'Log ₹250', `[${scheme}] save reads "Log ₹250"`);
    await dialog.getByRole('button', { name: 'General Expenses', exact: true }).first().click();
    check((await dialog.getByLabel('What for').inputValue()) === 'General Expenses', `[${scheme}] a usual description fills "What for"`);

    // --- save is optimistic -----------------------------------------------------------------
    const before = await page.getByText('₹250').count();
    await save().click();
    await page.getByTestId('logged-today').getByText('₹250').first().waitFor({ timeout: 700 }).catch(() => {});
    check((await page.getByTestId('logged-today').getByText('₹250').count()) >= 1 && writes.length <= 1, `[${scheme}] the row shows before the server answers (${before} before)`);
    check(await dialog.isHidden(), `[${scheme}] the sheet closes on save`);
    await page.getByRole('button', { name: 'Undo' }).waitFor({ timeout: 5000 });
    check(JSON.stringify(writes[0]?.body) === JSON.stringify({ date: today, description: 'General Expenses', amount: 250, type: 'DEBIT' }), `[${scheme}] posted exactly one entry with the right body`);
    check(writes.filter((w) => w.url === '/api/expenses/log').length === 1, `[${scheme}] posted once`);

    // --- undo deletes it, redo logs it again -------------------------------------------------
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Redo' }).waitFor({ timeout: 8000 });
    check(writes.some((w) => w.method === 'DELETE'), `[${scheme}] Undo deletes the logged row`);
    check((await page.getByTestId('logged-today').count()) === 0 || (await page.getByTestId('logged-today').getByText('₹250').count()) === 0, `[${scheme}] the row is gone after Undo`);

    // --- a failed save rolls back ------------------------------------------------------------
    failNext = true;
    await open();
    for (const k of ['1', '0', '0']) await key(k);
    await dialog.getByLabel('What for').fill('Tea');
    await save().click();
    await page.getByTestId('logged-today').getByText('Tea').waitFor({ timeout: 700 }).catch(() => {});
    const chip = page.locator('.v2-chip');
    await chip.getByText(/Couldn.t save/).waitFor({ timeout: 8000 }).catch(() => {});
    check(await chip.getByText(/Couldn.t save/).isVisible().catch(() => false), `[${scheme}] after a failed save the sync chip says "Couldn't save" (not Synced)`);
    check((await page.getByText('Tea', { exact: true }).count()) === 0, `[${scheme}] the failed row is removed again`);

    // --- date and type choices --------------------------------------------------------------
    await open(); await key('5');
    await dialog.getByRole('button', { name: 'Yesterday' }).click();
    await save().click();
    await page.waitForFunction(() => true); await page.waitForTimeout(1200);
    check(writes.at(-1)?.body?.date === yesterday, `[${scheme}] Yesterday posts yesterday's date`);

    await open(); await key('7'); await dialog.getByRole('button', { name: 'Received' }).click();
    await save().click(); await page.waitForTimeout(1200);
    check(writes.at(-1)?.body?.type === 'CREDIT', `[${scheme}] Received posts CREDIT`);

    await open(); await key('9');
    await dialog.getByRole('button', { name: 'Pick date' }).click();
    await dialog.getByLabel('Date').fill('2026-12-01');
    await save().click(); await page.waitForTimeout(1200);
    check(writes.at(-1)?.body?.date === '2026-12-01', `[${scheme}] a picked date is passed through`);

    // --- repeat monthly ---------------------------------------------------------------------
    await open();
    for (const k of ['2', '5', '0']) await key(k);
    await dialog.getByRole('button', { name: 'Repeat monthly' }).click();
    check(await dialog.getByText(/Adds 6 monthly rows/).isVisible(), `[${scheme}] Repeat monthly explains itself`);
    check((await save().innerText()) === 'Schedule 6 × ₹250', `[${scheme}] save reads "Schedule 6 × ₹250"`);
    await save().click(); await page.waitForTimeout(800);
    const emi = writes.at(-1);
    check(emi?.url === '/api/expenses/schedule-emi' && emi.body.months === 6 && emi.body.monthlyAmount === 250, `[${scheme}] Repeat monthly posts the schedule`);

    // --- offline: logging is disabled and nothing is shown optimistically ---------------------------
    await ctx.setOffline(true);
    await open();
    const offlineSave = dialog.getByRole('button', { name: "You're offline" });
    check(await offlineSave.isVisible() && (await offlineSave.isDisabled()), `[${scheme}] offline: save is disabled and says so`);
    check(await dialog.getByText(/You.re offline\. Changes can.t be saved/).isVisible(), `[${scheme}] offline: the sheet explains why`);
    await ctx.setOffline(false);
    await page.waitForFunction(() => navigator.onLine);
    await page.keyboard.press('Escape');

    await open();
    check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, `[${scheme}] no sideways scroll with the sheet open`);
    check(errors.length === 0, `[${scheme}] no console errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  await browser.close();
})();
