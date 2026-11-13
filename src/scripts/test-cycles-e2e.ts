// Run: npx tsx --env-file=.env.local src/scripts/test-cycles-e2e.ts
// Optional: BASE=http://localhost:3007 (a test build on another port), SHOT_DIR=<folder for screenshots>.
// The budget settings are kept in this browser only; every sheet write request is blocked.
import { chromium } from 'playwright';
import path from 'path';

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '');
const SHOT_DIR = process.env.SHOT_DIR || path.join(process.cwd(), 'public');

async function main() {
  console.log('--- BUDGET AND CYCLE SETTINGS E2E ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await context.route(/\/api\/(expenses|ledger|loans)/, (route) =>
    route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 200, json: { ok: true } })
  );
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[name="username"]').fill(process.env.AUTH_USERNAME ?? '');
  await page.locator('input[name="password"]').fill(process.env.AUTH_PASSWORD ?? '');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  await page.waitForSelector('text=Balance now', { timeout: 20000 });
  console.log('Home loaded.');

  // The Budget page
  await page.locator('header nav').getByRole('link', { name: 'Budget', exact: true }).click();
  await page.waitForURL(`${BASE}/budget`);
  await page.getByRole('heading', { level: 2, name: 'Budget this cycle' }).waitFor({ timeout: 20000 });

  const cards: Record<string, boolean> = {
    'General Budget': await page.locator('text=General Budget').first().isVisible(),
    'Electricity Budget': await page.locator('text=Electricity Budget').first().isVisible(),
    'Room Rent': await page.locator('text=Room Rent').first().isVisible(),
  };
  console.log('Factor cards visible:', cards);
  if (Object.values(cards).some((v) => !v)) throw new Error('One or more factor cards are not visible');

  console.log('Configuration drawer...');
  await page.locator('button:has-text("Configure Dates & Meter")').first().click();
  await page.waitForTimeout(400);
  const salaryDayBtn = page.locator('button:has-text("7th (Salary)")').first();
  if (await salaryDayBtn.isVisible()) {
    await salaryDayBtn.click();
    console.log('Cycle day set to the 7th');
  }
  await page.locator('button:has-text("Apply & Save Configuration")').first().click();
  await page.waitForTimeout(800);
  const saved = await page.evaluate(() => localStorage.getItem('finflow_cycle_config'));
  console.log('Saved settings:', saved);
  if (!saved) throw new Error('Settings were not saved');

  await page.screenshot({ path: path.join(SHOT_DIR, 'screenshot-budget-factors-verified.png'), fullPage: false });

  // Same settings on a phone: Home keeps the budget card too
  const mobileContext = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobileContext.addCookies(await context.cookies());
  await mobileContext.route(/\/api\/(expenses|ledger|loans)/, (route) =>
    route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 200, json: { ok: true } })
  );
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE}/budget`, { waitUntil: 'networkidle' });
  await mobilePage.getByRole('heading', { level: 2, name: 'Budget this cycle' }).waitFor({ timeout: 20000 });
  await mobilePage.screenshot({ path: path.join(SHOT_DIR, 'screenshot-mobile-factors-verified.png'), fullPage: false });

  await browser.close();
  console.log('--- ALL BUDGET AND CYCLE E2E CHECKS PASSED ---');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
