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

  // ---- Task 3: the read-only offline copy of the balance ----
  check(!(await page.getByText(/Offline — showing a copy/).isVisible().catch(() => false)), 'no offline banner while online');
  const syncedAt = await page.evaluate(() => Number(localStorage.getItem('finflow_last_synced')));
  check(Number.isFinite(syncedAt) && Date.now() - syncedAt < 60000, 'a recent sync timestamp is recorded while online');
  // The "Synced ..." text is hidden on the phone top bar (space is tight there; the icon stays),
  // same as the "scriptingBear" subtitle — check it on a laptop-width page.
  const laptopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: await ctx.storageState() });
  await laptopCtx.route(/\/api\/financials/, (r) => r.fulfill({ json: api }));
  const lp2 = await laptopCtx.newPage();
  await lp2.goto(`${BASE}/`);
  await lp2.getByText('Balance now').waitFor({ timeout: 20000 });
  const chip = await lp2.getByText(/^Synced (just now|\d+ min ago)$/).first().isVisible().catch(() => false);
  check(chip, 'the top bar shows a "Synced ..." chip matching the recent timestamp (laptop)');
  await laptopCtx.close();

  // The SW writes the cache entry via event.waitUntil after responding; give it a moment, and
  // confirm directly before trusting the UI assertions below (a clearer failure if it's empty).
  let dataCached = false;
  for (let i = 0; i < 10 && !dataCached; i++) {
    dataCached = await page.evaluate(async () => !!(await (await caches.open('finflow-financials-1')).match('/api/financials')));
    if (!dataCached) await page.waitForTimeout(300);
  }
  check(dataCached, 'the financials response is cached while online');

  // NOT a reload: a full navigation while offline hits the SW's generic offline.html fallback
  // (this service worker does not precache the app shell, only the offline page and this one
  // API response — see the plan's deferred items). The richer "see your last balance" experience
  // works while the app is already open and loses its connection, which is what we exercise here.
  await ctx.setOffline(true);
  await page.getByRole('button', { name: /Sync now|Refresh/ }).first().click();
  check(await page.getByText('Balance now').isVisible({ timeout: 15000 }).catch(() => false), 'the balance still shows after losing connection mid-session, from the cached copy');
  check(await page.getByText(/Offline — showing a copy saved/).isVisible().catch(() => false), 'the offline banner is shown while serving the cached copy');

  // Opening the Log sheet offline: submit is disabled with a visible reason, not silently accepted.
  await page.getByRole('button', { name: 'Log', exact: true }).first().click();
  await page.getByRole('dialog', { name: 'Log a transaction' }).waitFor({ timeout: 10000 });
  check(await page.getByText("You're offline").first().isVisible().catch(() => false), 'the Log sheet shows an offline notice');
  const submitBtn = page.locator('[data-modal-form] button[type="submit"]');
  check(await submitBtn.isDisabled(), 'the Log submit button is disabled while offline');
  await page.keyboard.press('Escape');

  // A write attempt offline must fail, never silently "succeed" against a cache.
  const writeOutcome = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/expenses/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ description: 'offline probe', amount: 1 }) });
      return { reached: true, ok: res.ok };
    } catch {
      return { reached: false };
    }
  });
  check(writeOutcome.reached === false || writeOutcome.ok === false, `a write while offline fails rather than appearing to succeed (${JSON.stringify(writeOutcome)})`);

  await ctx.setOffline(false);
  await page.goto(`${BASE}/`);
  await page.getByText('Balance now').waitFor({ timeout: 20000 });

  // Sign-out clears this device's cached copy (phone viewport: Sign out lives in the More menu).
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
  const afterSignOut = await page.evaluate(async () => {
    const cache = await caches.open('finflow-financials-1');
    const hit = await cache.match('/api/financials');
    return { cached: !!hit, lastSynced: localStorage.getItem('finflow_last_synced') };
  });
  check(!afterSignOut.cached, 'the cached financials response is cleared on sign-out');
  check(afterSignOut.lastSynced === null, 'the last-synced timestamp is cleared on sign-out');

  // ---- Task 5: the install prompt ----
  const installCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installCtx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  await installCtx.route(/\/api\/financials/, (r) => r.fulfill({ json: api }));
  const ip = await installCtx.newPage();
  await ip.goto(`${BASE}/`);
  await ip.getByText('Balance now').waitFor({ timeout: 20000 });
  check(!(await ip.getByText('Install FinFlow').isVisible().catch(() => false)), 'no install bar before the browser ever offers to install');

  // Simulate the browser's own beforeinstallprompt offer (real browsers decide when to fire it;
  // we only control what our own listener does once it does).
  await ip.evaluate(() => {
    const evt = new Event('beforeinstallprompt', { cancelable: true });
    evt.prompt = () => Promise.resolve();
    evt.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(evt);
  });
  check(await ip.getByText('Install FinFlow').isVisible({ timeout: 5000 }).catch(() => false), 'the install bar appears once the browser offers to install');

  await ip.getByRole('button', { name: 'Dismiss' }).click();
  check(!(await ip.getByText('Install FinFlow').isVisible().catch(() => false)), 'dismissing hides the bar immediately');
  const dismissedFlag = await ip.evaluate(() => localStorage.getItem('finflow_install_dismissed'));
  check(dismissedFlag === '1', 'the dismissal is remembered');

  await ip.reload();
  await ip.getByText('Balance now').waitFor({ timeout: 20000 });
  await ip.evaluate(() => {
    const evt = new Event('beforeinstallprompt', { cancelable: true });
    evt.prompt = () => Promise.resolve();
    evt.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(evt);
  });
  await ip.waitForTimeout(500);
  check(!(await ip.getByText('Install FinFlow').isVisible().catch(() => false)), 'the bar stays dismissed across a reload, even if offered again');
  await installCtx.close();

  await browser.close();
  console.log(failed ? `\n${failed} FAIL` : '\nALL PASS');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(2);
});
