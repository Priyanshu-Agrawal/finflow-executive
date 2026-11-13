// Step B: the service worker, the offline financials copy, and the install prompt.
// Run: node --env-file=.env.local src/scripts/test-pwa.cjs --base=http://localhost:3007
// One real sheet read (via /api/financials, captured once and re-served); every write that could
// reach the server is given a payload the server itself rejects (400), so even a failed
// offline-emulation step can never actually write to the live sheet.
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

// Playwright's isVisible({ timeout }) ignores the timeout — it's an immediate, non-waiting
// check — so a check written as `.isVisible({ timeout: N })` right after an action that
// triggers a re-render can run before React has painted, and fail even though the element
// would have appeared a moment later. This actually waits.
async function waitVisible(locator, timeout = 10000) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}
async function waitHidden(locator, timeout = 10000) {
  try {
    await locator.waitFor({ state: 'hidden', timeout });
    return true;
  } catch {
    return false;
  }
}

async function financialsIsCached(page) {
  let cached = false;
  for (let i = 0; i < 10 && !cached; i++) {
    cached = await page.evaluate(async () => !!(await (await caches.open('finflow-financials-1')).match('/api/financials')));
    if (!cached) await page.waitForTimeout(300);
  }
  return cached;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const login = await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  check(login.ok(), 'signed in');
  const today = new Date().toLocaleDateString('en-CA');
  const api = await (await ctx.request.get(`${BASE}/api/financials?refDate=${today}&generalBudget=15000&electricityBudget=3200&budgetRecurringDay=7&rentRecurringDay=15`)).json();

  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.getByText('Balance now').waitFor({ timeout: 20000 });
  check(await swActive(page) === 'active', 'the service worker is active for the old UI at /');

  // Let it finish caching, then reload once more so the SW is this page's controller (a fetch
  // issued before that point is never intercepted at all).
  await page.waitForTimeout(1000);
  await page.reload();
  await page.getByText('Balance now').waitFor({ timeout: 20000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 8000 }).catch(() => {});
  check(await financialsIsCached(page), 'the financials response is cached while online');

  // A genuine live fetch is never flagged as the offline copy.
  const liveCheck = await page.evaluate(async () => {
    const res = await fetch('/api/financials?refDate=2026-01-01&generalBudget=15000&electricityBudget=3200&budgetRecurringDay=7&rentRecurringDay=15');
    return { ok: res.ok, offlineHeader: res.headers.get('x-finflow-offline-copy') };
  });
  check(liveCheck.ok && liveCheck.offlineHeader === null, 'a live /api/financials read is not flagged as the offline copy');
  check(!(await page.getByText(/Offline — showing a copy/).isVisible().catch(() => false)), 'no offline banner while online');
  const syncedAt = await page.evaluate(() => Number(localStorage.getItem('finflow_last_synced')));
  check(Number.isFinite(syncedAt) && Date.now() - syncedAt < 60000, 'a recent sync timestamp is recorded while online');

  // /login is never answered by the service worker (it returns early for that path without
  // touching the cache at all) — checked in this same context, which has the SW registered,
  // not a fresh one that would make the assertion pass vacuously.
  const loginRespPromise = page.waitForResponse((r) => new URL(r.url()).pathname === '/login');
  await page.goto(`${BASE}/login`);
  const loginResp = await loginRespPromise;
  check(loginResp.fromServiceWorker() === false, '/login is never answered by the service worker');
  await page.goto(`${BASE}/`);
  await page.getByText('Balance now').waitFor({ timeout: 20000 });

  // ---- The read-only offline copy of the balance ----
  // Scenario A: "online but the request actually fails" (flaky wifi, a captive portal, DNS, the
  // server down) — navigator.onLine never changes. This is the exact case the executor's first
  // version of this test did not cover, and where the banner previously failed to appear at all
  // (lastSyncedAt was being recorded as "just now" from the stale cached response instead).
  const beforeLieFiSynced = await page.evaluate(() => localStorage.getItem('finflow_last_synced'));
  await ctx.route(/\/api\/financials/, (route) => route.abort('failed'));
  const onlineDuringLieFi = await page.evaluate(() => navigator.onLine);
  check(onlineDuringLieFi === true, 'navigator.onLine stays true for this scenario (the point of the test)');
  await page.getByRole('button', { name: /Sync now|Refresh/ }).first().click();
  check(await waitVisible(page.getByText(/Offline — showing a copy saved/)), 'the offline banner appears when a request fails even though the browser still thinks it is online');
  check(await waitVisible(page.getByText('Balance now')), 'the balance still shows, from the cached copy');
  const afterLieFiSynced = await page.evaluate(() => localStorage.getItem('finflow_last_synced'));
  check(afterLieFiSynced === beforeLieFiSynced, 'the synced-at time is not bumped to "now" by a response that is actually the stale cached copy');
  await ctx.unroute(/\/api\/financials/);
  await page.getByRole('button', { name: /Sync now|Refresh/ }).first().click();
  check(await waitHidden(page.getByText(/Offline — showing a copy saved/)), 'the banner clears once a real request succeeds again');

  // The banner must not be hidden behind a page's sticky control bar, which sticks at the same
  // --topbar-h position: StickyBar.tsx reads --offline-banner-h (published by the banner) to
  // stack below it instead of painting over it once the page scrolls.
  await ctx.route(/\/api\/financials/, (route) => route.abort('failed'));
  await page.goto(`${BASE}/expenses`);
  await page.waitForTimeout(500);
  const stacking = await page.evaluate(() => {
    const banner = document.querySelector('[role="status"]');
    const bar = document.querySelector('[data-sticky-bar]');
    if (!banner || !bar) return null;
    const b = banner.getBoundingClientRect();
    const s = bar.getBoundingClientRect();
    return { bannerBottom: b.bottom, barTop: s.top };
  });
  check(!!stacking && stacking.barTop >= stacking.bannerBottom - 1, `the Ledger's control bar sticks below the offline banner, not over it (${JSON.stringify(stacking)})`);
  await ctx.unroute(/\/api\/financials/);
  await page.goto(`${BASE}/`);
  await page.getByText('Balance now').waitFor({ timeout: 20000 });

  // Scenario B: genuinely offline (airplane mode) — also exercised end to end, since the
  // financials query's networkMode: 'always' means even a truly offline attempt still reaches
  // the service worker (TanStack Query's default would otherwise pause it before any fetch, and
  // the old in-memory data would just sit there with no signal that it is not current).
  await ctx.setOffline(true);
  await page.getByRole('button', { name: /Sync now|Refresh/ }).first().click();
  check(await waitVisible(page.getByText('Balance now'), 15000), 'the balance still shows while genuinely offline, from the cached copy');
  check(await waitVisible(page.getByText(/Offline — showing a copy saved/)), 'the offline banner is shown while genuinely offline');

  // Opening the Log sheet offline: submit is disabled with a visible reason, not silently accepted.
  // (Done before the navigation-away check below, which replaces this page with the static
  // offline.html document — there is no React app left to open a dialog in after that.)
  await page.getByRole('button', { name: 'Log', exact: true }).first().click();
  await page.getByRole('dialog', { name: 'Log a transaction' }).waitFor({ timeout: 10000 });
  check(await waitVisible(page.getByText("You're offline").first()), 'the Log sheet shows an offline notice');
  const submitBtn = page.locator('[data-modal-form] button[type="submit"]');
  check(await submitBtn.isDisabled(), 'the Log submit button is disabled while offline');
  await page.keyboard.press('Escape');

  // A write attempt offline must fail outright, never silently "succeed" or get queued for
  // later replay. The payload is one the server itself rejects with 400 (amount <= 0) — so even
  // if offline emulation failed for some reason, this can never actually write a row.
  const writeOutcome = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/expenses/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ description: 'offline probe (rejected by validation, never reaches the sheet)', amount: 0 }) });
      return { reached: true, ok: res.ok, status: res.status };
    } catch {
      return { reached: false };
    }
  });
  check(writeOutcome.reached === false, `a write attempted while offline never reaches the server at all (${JSON.stringify(writeOutcome)})`);

  // An uncached route, offline, falls back to the generic offline page (this service worker does
  // not precache the app shell — only the offline page and this one API response — so a cold
  // open of a never-visited route while offline cannot show real data). This replaces the page
  // with a plain static document, so it runs last in this offline sequence.
  await page.goto(`${BASE}/log`).catch(() => {});
  check(await waitVisible(page.getByText(/You.re offline/)), 'an uncached route falls back to the offline page while offline');

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

  // The "Synced ..." text is hidden on the phone top bar (space is tight there; the icon stays),
  // same as the "scriptingBear" subtitle — check it on a laptop-width page.
  const laptopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await laptopCtx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  await laptopCtx.route(/\/api\/financials/, (r) => r.fulfill({ json: api }));
  const lp2 = await laptopCtx.newPage();
  await lp2.goto(`${BASE}/`);
  await lp2.getByText('Balance now').waitFor({ timeout: 20000 });
  const chip = await lp2.getByText(/^Synced (just now|\d+ min ago)$/).first().isVisible().catch(() => false);
  check(chip, 'the top bar shows a "Synced ..." chip matching the recent timestamp (laptop)');
  await laptopCtx.close();

  // ---- The install prompt (owner decision, 13 Nov: mobile only — laptop/desktop already has
  // the website and should never see this, even if the browser offers to install there) ----
  const fireInstallOffer = (p) =>
    p.evaluate(() => {
      const evt = new Event('beforeinstallprompt', { cancelable: true });
      evt.prompt = () => Promise.resolve();
      evt.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(evt);
    });

  const laptopInstallCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await laptopInstallCtx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  await laptopInstallCtx.route(/\/api\/financials/, (r) => r.fulfill({ json: api }));
  const lip = await laptopInstallCtx.newPage();
  await lip.goto(`${BASE}/`);
  await lip.getByText('Balance now').waitFor({ timeout: 20000 });
  await fireInstallOffer(lip);
  await lip.waitForTimeout(500);
  check(!(await lip.getByText('Install FinFlow').isVisible().catch(() => false)), 'no install bar on laptop, even when the browser offers to install');
  await laptopInstallCtx.close();

  const installCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installCtx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  await installCtx.route(/\/api\/financials/, (r) => r.fulfill({ json: api }));
  const ip = await installCtx.newPage();
  await ip.goto(`${BASE}/`);
  await ip.getByText('Balance now').waitFor({ timeout: 20000 });
  check(!(await ip.getByText('Install FinFlow').isVisible().catch(() => false)), 'no install bar before the browser ever offers to install');

  // Simulate the browser's own beforeinstallprompt offer (real browsers decide when to fire it;
  // we only control what our own listener does once it does).
  await fireInstallOffer(ip);
  check(await waitVisible(ip.getByText('Install FinFlow'), 5000), 'the install bar appears on a phone once the browser offers to install');

  await ip.getByRole('button', { name: 'Dismiss' }).click();
  check(!(await ip.getByText('Install FinFlow').isVisible().catch(() => false)), 'dismissing hides the bar immediately');
  const dismissedFlag = await ip.evaluate(() => localStorage.getItem('finflow_install_dismissed'));
  check(dismissedFlag === '1', 'the dismissal is remembered');

  await ip.reload();
  await ip.getByText('Balance now').waitFor({ timeout: 20000 });
  await fireInstallOffer(ip);
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
