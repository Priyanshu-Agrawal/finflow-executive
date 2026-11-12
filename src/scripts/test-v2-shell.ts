// Run: npx tsx --env-file=.env.local src/scripts/test-v2-shell.ts   (dev server on :3007)
import { chromium } from 'playwright';

const BASE = process.env.V2_BASE || 'http://localhost:3007';
const today = new Date().toLocaleDateString('en-CA');
const inr = (v: number) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(v));

function check(ok: boolean, msg: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const login = await ctx.request.post(`${BASE}/api/auth/login`, {
      data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD },
    });
    check(login.ok(), `[${scheme}] signed in`);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    // Reuse the page's own financials response: the Sheets API allows only ~60 reads a minute.
    const financials = page.waitForResponse((r) => r.url().includes('/api/financials') && r.ok(), { timeout: 60000 });
    await page.goto(`${BASE}/v2`);
    await page.getByText('You can spend').waitFor({ timeout: 30000 });
    check(true, `[${scheme}] Today shows "You can spend"`);
    const api = await (await financials).json();
    const expected = inr(api.kpis.currentBalance);
    await page.getByText(expected, { exact: true }).first().waitFor({ timeout: 15000 }).catch(() => {});
    check(await page.getByText(expected, { exact: true }).first().isVisible(), `[${scheme}] balance shown equals the API (${expected})`);
    if (today === '2026-11-12' || today === '2026-11-11') check(expected === '₹1,14,021', `[${scheme}] anchor balance is ₹1,14,021`);

    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const [name, path] of [['Passbook', '/v2/passbook'], ['Plan', '/v2/plan'], ['Owe', '/v2/owe'], ['Today', '/v2']] as const) {
      await nav.getByRole('link', { name, exact: true }).click();
      await page.waitForURL(`${BASE}${path}`, { timeout: 60000 });
      check(await page.getByRole('heading', { level: 1 }).first().isVisible(), `[${scheme}] ${path} has a heading`);
    }
    const colours = await page.getByRole('button', { name: 'Log a spend', exact: true }).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { fg: cs.color, bg: cs.backgroundColor };
    });
    check(colours.fg !== colours.bg, `[${scheme}] Log button icon is visible (${colours.fg} on ${colours.bg})`);
    const inactive = await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Plan', exact: true }).evaluate((el) => getComputedStyle(el).color);
    const active = await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Today', exact: true }).evaluate((el) => getComputedStyle(el).color);
    check(inactive !== active, `[${scheme}] inactive nav items are a different colour from the active one`);
    check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, `[${scheme}] no sideways scroll at 390px`);
    check(errors.length === 0, `[${scheme}] no console errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // Regression: the old UI at / must be unaffected by the v2 providers change.
  const old = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await old.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  const op = await old.newPage();
  await op.goto(`${BASE}/`);
  await op.getByText('Current Liquid Operating Balance').waitFor({ timeout: 30000 }).catch(() => {});
  check(await op.getByText('Current Liquid Operating Balance').isVisible(), 'old UI at / still renders');
  await old.close();

  const wide = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await wide.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  const wp = await wide.newPage();
  await wp.goto(`${BASE}/v2/plan`);
  const box = await wp.getByRole('navigation', { name: 'Main' }).boundingBox();
  check(!!box && box.x === 0 && box.width < 300 && box.height > 600, `[wide] nav is a left rail ${JSON.stringify(box)}`);
  await browser.close();
})();
