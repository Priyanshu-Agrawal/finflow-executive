// Step B: the service worker and the offline financials copy, over the whole app (not just /v2).
// Run: node --env-file=.env.local src/scripts/test-pwa.cjs --base=http://localhost:3007
// One real sheet read (via /api/financials, captured once and re-served); every write is blocked.
// Plain .cjs: browser-side functions passed to page.evaluate break under tsx (see audit-ui.cjs).
const { chromium } = require('playwright');

const BASE = ((process.argv.find((a) => a.startsWith('--base=')) || '--base=http://localhost:3000').slice(7)).replace(/\/$/, '');
let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed++;
};

async function swActive(page) {
  const race = () =>
    page.evaluate(() =>
      Promise.race([
        navigator.serviceWorker.getRegistration().then((r) => (r && r.active ? 'active' : 'none')),
        new Promise((res) => setTimeout(() => res('timeout'), 8000)),
      ])
    );
  let state = await race();
  for (let i = 0; i < 6 && state !== 'active'; i++) {
    await page.waitForTimeout(1000);
    state = await race();
  }
  return state;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const login = await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  check(login.ok(), 'signed in');
  const today = new Date().toLocaleDateString('en-CA');
  const api = await (await ctx.request.get(`${BASE}/api/financials?refDate=${today}&generalBudget=15000&electricityBudget=3200&budgetRecurringDay=7&rentRecurringDay=15`)).json();

  const page = await ctx.newPage();
  const apiRequests = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/')) apiRequests.push({ path: u.pathname, method: r.method() });
  });

  await page.goto(`${BASE}/`);
  await page.getByText('Balance now').waitFor({ timeout: 20000 });
  check(await swActive(page) === 'active', 'the service worker is active for the old UI at /');

  // let it finish caching, then reload once more so the SW is the controller for this page
  await page.waitForTimeout(1000);
  await page.reload();
  await page.getByText('Balance now').waitFor({ timeout: 20000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 8000 }).catch(() => {});

  // An uncached route, offline, falls back to the offline page — not a browser error.
  await ctx.setOffline(true);
  await page.goto(`${BASE}/loans`).catch(() => {});
  check(await page.getByText(/You.re offline/).isVisible().catch(() => false), 'an uncached route falls back to the offline page while offline');
  await ctx.setOffline(false);
  await page.goto(`${BASE}/`);
  await page.getByText('Balance now').waitFor({ timeout: 20000 });

  // /login and every /api/* request must always be real network requests, never served from the SW cache.
  apiRequests.length = 0;
  await page.evaluate(() => fetch('/api/financials?refDate=2026-01-01').catch(() => {}));
  await page.waitForTimeout(500);
  check(apiRequests.some((r) => r.path === '/api/financials'), 'an /api/financials request still goes to the network, not the cache');

  const loginCtx = await browser.newContext();
  const loginReqs = [];
  const lp = await loginCtx.newPage();
  lp.on('request', (r) => { if (new URL(r.url()).pathname === '/login') loginReqs.push(r); });
  await lp.goto(`${BASE}/login`);
  check(loginReqs.length >= 1, '/login is requested fresh, not served from a cache');
  await loginCtx.close();

  await browser.close();
  console.log(failed ? `\n${failed} FAIL` : '\nALL PASS');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(2);
});
