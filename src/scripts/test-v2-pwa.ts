// Run against a production build: NEXT_DIST_DIR=.next-v2 npx next start -p 3007
// npx tsx --env-file=.env.local src/scripts/test-v2-pwa.ts
import { chromium, request } from 'playwright';

const BASE = process.env.V2_BASE || 'http://localhost:3007';
function check(ok: boolean, msg: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  // --- signed out ---
  const anon = await request.newContext({ baseURL: BASE, maxRedirects: 0 });
  const mf = await anon.get('/manifest.webmanifest');
  check(mf.status() === 200, 'manifest is public (200)');
  const m = mf.ok() ? await mf.json() : {};
  check(m.name === 'FinFlow' && m.short_name === 'FinFlow', 'manifest names');
  check(m.start_url === '/' && m.scope === '/' && m.display === 'standalone', 'manifest opens the real app (/), scope /, standalone');
  check(m.background_color === '#0B0B0C' && m.theme_color === '#0B0B0C', 'manifest uses the dark app colours');
  const icons: Array<{ sizes: string; purpose?: string }> = m.icons || [];
  check(icons.some((i) => i.sizes === '192x192') && icons.some((i) => i.sizes === '512x512' && (i.purpose || 'any') === 'any'), 'manifest has 192 and 512 icons');
  check(icons.some((i) => i.purpose === 'maskable'), 'manifest has a maskable icon');
  const sw = await anon.get('/sw.js');
  check(sw.status() === 200 && /no-cache/.test(sw.headers()['cache-control'] || ''), 'sw.js is public and not cached');
  check(sw.headers()['service-worker-allowed'] === '/', 'sw.js allows scope /');
  check((await anon.get('/offline.html')).status() === 200, 'offline.html is public');
  for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
    const r = await anon.get(`/icons/${f}`);
    check(r.status() === 200 && /image\/png/.test(r.headers()['content-type'] || ''), `/icons/${f} is a public PNG`);
  }
  const probe = await anon.patch('/api/expenses/240.x', { data: {} });
  check(probe.status() === 401, 'auth probe: PATCH /api/expenses/240.x is 401');
  const v2 = await anon.get('/v2');
  check([302, 307, 308].includes(v2.status()) && /\/login/.test(v2.headers()['location'] || ''), '/v2 redirects to /login when signed out');

  // --- signed in, in a browser ---
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/v2`);
  const swState = () => page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.getRegistration().then((r) => (r && r.active ? 'active' : 'none')),
      new Promise<string>((res) => setTimeout(() => res('timeout'), 8000)),
    ]));
  let state = await swState();
  for (let i = 0; i < 5 && state !== 'active'; i++) { await page.waitForTimeout(1000); state = await swState(); }
  check(state === 'active', `service worker is active (${state})`);
  const cached = await page.evaluate(async () => {
    const out: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname);
    return out;
  });
  check(JSON.stringify(cached) === JSON.stringify(['/offline.html']), `only the offline page is cached ${JSON.stringify(cached)}`);

  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 8000 }).catch(() => {});
  await ctx.setOffline(true);
  await page.goto(`${BASE}/v2/plan`).catch(() => {});
  check(await page.getByText(/You.re offline/).isVisible().catch(() => false), 'offline navigation shows the offline page');
  await ctx.setOffline(false);
  await browser.close();
})();
