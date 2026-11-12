// Run against a production build: NEXT_DIST_DIR=.next-v2 npx next start -p 3007
// npx tsx --env-file=.env.local src/scripts/test-v2-today.ts      (V2_BASE overrides the address)
// Read-only: the financials response is captured once per context and re-served to stubbed pages.
import { chromium, type Browser, type Page } from 'playwright';

const BASE = process.env.V2_BASE || 'http://localhost:3007';
const today = new Date().toLocaleDateString('en-CA');
const inr = (v: number) => (v < 0 ? '−' : '') + '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(Math.round(v)));
const signed = (v: number) => (v < 0 ? '−' : '+') + '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(Math.round(v)));
const SET_ASIDE = /remaining .*budget|total general/i;

function check(ok: boolean, msg: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) process.exitCode = 1;
}
const text = async (page: Page, id: string) => ((await page.getByTestId(id).first().innerText({ timeout: 8000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();

async function signedIn(browser: Browser, scheme: 'light' | 'dark') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  return ctx;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  let captured: any = null;

  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await signedIn(browser, scheme);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    const fin = page.waitForResponse((r) => r.url().includes('/api/financials') && r.ok(), { timeout: 60000 }).catch(() => null);
    await page.goto(`${BASE}/v2`);
    const api = await (await fin)?.json();
    if (!api) { check(false, `[${scheme}] financials loaded`); await ctx.close(); continue; }
    captured = api;
    const k = api.kpis, bp = api.budgetPacing;

    check((await page.getByRole('heading', { level: 1 }).first().innerText().catch(() => '')) === 'You can spend', `[${scheme}] h1 "You can spend"`);
    check((await text(page, 'safe-spend')) === inr(bp.safeTotalDailyBurn), `[${scheme}] safe spend equals API (${inr(bp.safeTotalDailyBurn)})`);
    check((await text(page, 'balance-now')) === inr(k.currentBalance), `[${scheme}] balance now equals API (${inr(k.currentBalance)})`);
    check((await text(page, 'lowest-point')) === inr(k.postNovBalance), `[${scheme}] lowest point equals cushion (${inr(k.postNovBalance)})`);

    const ahead = api.expenses.filter((r: any) => r.type === 'DEBIT' && r.date > today && r.date < k.cushionUntil);
    const bills = ahead.filter((r: any) => !SET_ASIDE.test(r.description));
    const aside = ahead.filter((r: any) => SET_ASIDE.test(r.description));
    const billsText = await text(page, 'bills-list');
    check(bills.every((b: any) => billsText.includes(b.description)), `[${scheme}] every bill before salary is listed (${bills.length})`);
    check(aside.every((b: any) => !billsText.includes(b.description)), `[${scheme}] set-aside rows are not in the bills list`);
    check((await text(page, 'bills-total')) === inr(bills.reduce((s: number, b: any) => s + b.amount, 0)), `[${scheme}] bills total excludes set-aside rows`);
    if (aside.length) check((await text(page, 'set-aside-list')).includes(aside[0].description), `[${scheme}] set-aside rows are listed apart`);

    const hard = page.getByRole('button', { name: /hard month/i });
    check(!(await page.getByTestId('hard-month').isVisible().catch(() => false)), `[${scheme}] hard month limit is hidden until tapped`);
    await hard.click();
    check((await text(page, 'hard-month')).includes(inr(bp.worstCaseDailyBurn)), `[${scheme}] hard month shows ${inr(bp.worstCaseDailyBurn)} after the tap`);

    const cur = api.savingsTrend.find((c: any) => c.kind === 'current'), nxt = api.savingsTrend.find((c: any) => c.kind === 'projected');
    if (cur) check((await text(page, 'saving-current')) === signed(cur.saving), `[${scheme}] this cycle saving ${signed(cur.saving)}`);
    if (nxt) check((await text(page, 'saving-next')) === signed(nxt.saving), `[${scheme}] next cycle saving ${signed(nxt.saving)}`);
    const label = (await page.getByTestId('savings-bars').getAttribute('aria-label')) || '';
    check(label.includes('Saved per salary cycle') && (!cur || label.includes(signed(cur.saving))), `[${scheme}] savings bars have a text alternative`);
    const kinds = await page.locator('[data-testid="savings-bars"] [data-sign]').evaluateAll((els) => els.map((e) => e.getAttribute('data-sign')));
    check(kinds.length === api.savingsTrend.length && kinds.every((s) => s === 'saved' || s === 'over'), `[${scheme}] each bar is saved (blue) or over (orange)`);

    check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, `[${scheme}] no sideways scroll`);
    check(!/NaN|undefined/.test(await page.locator('main').innerText()), `[${scheme}] no NaN or undefined on screen`);
    check(errors.length === 0, `[${scheme}] no console errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  if (captured) {
    // Quota error: friendly message, not a blank page.
    const ctx = await signedIn(browser, 'light');
    const page = await ctx.newPage();
    await page.route('**/api/financials*', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: "Quota exceeded for quota metric 'Read requests'" }) }));
    await page.goto(`${BASE}/v2`);
    await page.getByText(/Sheets is busy/).first().waitFor({ timeout: 15000 }).catch(() => {});
    check(await page.getByRole('status').getByText(/Sheets is busy, retrying in a moment/).isVisible().catch(() => false), '[quota] sync chip says Sheets is busy');
    check(await page.getByText(/Sheets is busy\. Trying again/).isVisible().catch(() => false), '[quota] Today explains and does not go blank');
    await ctx.close();

    // Empty cycle: no future rows and no savings history.
    const ctx2 = await signedIn(browser, 'light');
    const p2 = await ctx2.newPage();
    const empty = { ...captured, savingsTrend: [], expenses: captured.expenses.filter((r: any) => r.date <= today) };
    await p2.route('**/api/financials*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(empty) }));
    await p2.goto(`${BASE}/v2`);
    await p2.getByTestId('balance-now').waitFor({ timeout: 15000 }).catch(() => {});
    const body = await p2.locator('main').innerText();
    check(/No bills before salary/.test(body), '[empty] says there are no bills before salary');
    check(/Savings history appears after your first full cycle/.test(body), '[empty] says savings history is not there yet');
    check(!/NaN|undefined/.test(body), '[empty] no NaN or undefined');
    await ctx2.close();
  }
  await browser.close();
})();
