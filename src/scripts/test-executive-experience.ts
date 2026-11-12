// Run: npx tsx --env-file=.env.local src/scripts/test-executive-experience.ts
// Optional: BASE=http://localhost:3007 (a test build on another port), SHOT_DIR=<folder for the screenshot>.
// Reads only: every write request is blocked. Needs AUTH_USERNAME and AUTH_PASSWORD (from .env.local).
import { chromium } from 'playwright';
import path from 'path';

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '');
const SHOT_DIR = process.env.SHOT_DIR || process.cwd();

async function testFullExperience() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route(/\/api\/(expenses|ledger|loans)/, (route) =>
    route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 200, json: { ok: true } })
  );
  const page = await context.newPage();

  console.log(`1. Opening ${BASE} (should redirect to /login)...`);
  await page.goto(BASE);
  await page.waitForURL('**/login**');

  console.log('2. Signing in...');
  await page.fill('input[name="username"]', process.env.AUTH_USERNAME ?? '');
  await page.fill('input[name="password"]', process.env.AUTH_PASSWORD ?? '');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector('text=Balance now');
  console.log('Home loaded, balance card present.');

  // Home has one navigation (the top menu), no inner tab strip.
  const nav = await page.$$eval('header nav a', (links) => links.map((l) => l.textContent?.trim()));
  console.log('Top menu:', nav.join(', '));
  if (nav.join(',') !== 'Home,Ledger,Excel,Loans,Splits,Budget') throw new Error('Unexpected navigation labels');

  console.log('3. Loans...');
  await page.locator('header nav').getByRole('link', { name: 'Loans', exact: true }).click();
  await page.waitForURL(`${BASE}/loans`);
  await page.waitForSelector('text=Complete Liabilities Portfolio');

  console.log('Checking a loan opens its action sheet...');
  await page.locator('text=Credit Card SBI').first().click();
  await page.waitForSelector('text=External');
  await page.getByRole('button', { name: 'External', exact: true }).click();
  await page.waitForSelector('text=Third-Party Settlement (No Bank Debit!)');
  console.log('External Person Pays tab is present.');
  await page.click('button:has(svg.lucide-x)');

  console.log('4. Ledger...');
  await page.locator('header nav').getByRole('link', { name: 'Ledger', exact: true }).click();
  await page.waitForURL(`${BASE}/expenses`);
  await page.getByRole('heading', { level: 1, name: 'Ledger' }).waitFor();
  const banner = await page.locator('text=earlier transactions before').first().textContent().catch(() => null);
  console.log('Earlier-transactions banner:', banner ? 'present' : 'none');
  const badge = await page.locator('[data-anchor-row] >> text=Today').first().textContent().catch(() => null);
  console.log('Today badge on the anchor row?', badge ? 'yes' : 'no');
  if (!badge) throw new Error('No Today badge on the anchor row');

  const shot = path.join(SHOT_DIR, 'finflow-executive-verified.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('Screenshot:', shot);

  await browser.close();
  console.log('\nALL PLAYWRIGHT TESTS PASSED');
}

testFullExperience().catch((err) => {
  console.error('Playwright test failed:', err);
  process.exit(1);
});
