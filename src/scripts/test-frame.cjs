// Behaviour of the shared AppFrame (Step A, Task 3). Run against a test build:
//   node --env-file=.env.local src/scripts/test-frame.cjs --base=http://localhost:3007
// Reads /api/financials once, serves it to every page, blocks writes. Plain .cjs (see audit-ui.cjs).
const { chromium } = require('playwright');

const BASE = ((process.argv.find((a) => a.startsWith('--base=')) || '--base=http://localhost:3000').slice(7)).replace(/\/$/, '');
let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed++;
};
const inr = (v) => (v < 0 ? '−' : '') + '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(Math.round(v)));
const short = (iso) => `${Number(iso.slice(8))} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(iso.slice(5, 7)) - 1]}`;

const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const login = await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  check(login.ok(), 'signed in');
  const today = new Date().toLocaleDateString('en-CA');
  const fin = await ctx.request.get(`${BASE}/api/financials?refDate=${today}&generalBudget=15000&electricityBudget=3200&budgetRecurringDay=7&rentRecurringDay=15&rentAmount=15000`);
  const api = await fin.json();
  await ctx.route(/\/api\/financials/, (r) => r.fulfill({ json: api }));
  await ctx.route(/\/api\/(expenses|ledger|loans)/, (r) => (r.request().method() === 'GET' ? r.continue() : r.fulfill({ json: { ok: true } })));

  let anchor = null;
  for (const e of api.expenses) if (e.date && e.date <= today) anchor = e;

  const page = await ctx.newPage();
  const finRequests = [];
  page.on('request', (r) => r.url().includes('/api/financials') && finRequests.push(new URL(r.url())));
  const ready = async () => {
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(700);
  };
  const pill = () => page.locator('header button[aria-label^="Change the date"]');

  // 1. one query on load, none extra when moving between pages
  await page.goto(`${BASE}/expenses`);
  await ready();
  check(finRequests.length === 1, `one financials request on load (got ${finRequests.length})`);
  check((await pill().innerText()).trim() === 'Today', 'date pill says Today on load');

  // 2. date picked on one page survives navigation
  await pill().click();
  await page.locator('#frame-date').fill('2026-11-09');
  await page.waitForTimeout(600);
  check((await pill().innerText()).trim() === '9 Nov', 'picked date shows in the pill as "9 Nov"');
  check(finRequests.at(-1).searchParams.get('refDate') === '2026-11-09', 'query refetched for the picked date');
  const before = finRequests.length;
  await page.locator('header nav').getByRole('link', { name: 'Excel', exact: true }).click();
  await page.waitForURL(`${BASE}/excel`);
  await ready();
  check((await pill().innerText()).trim() === '9 Nov', 'picked date survives moving to Excel');
  await page.locator('header nav').getByRole('link', { name: 'Loans', exact: true }).click();
  await page.waitForURL(`${BASE}/loans`);
  await ready();
  check((await pill().innerText()).trim() === '9 Nov', 'picked date survives moving to Loans');
  check(finRequests.length === before, `no extra financials request while navigating (${finRequests.length - before} extra)`);

  // 3. Today resets it
  await pill().click();
  await page.getByRole('button', { name: /^Today \(/ }).click();
  await page.waitForTimeout(500);
  check((await pill().innerText()).trim() === 'Today', 'Today puts the date back');

  // 4. the "last logged day" shortcut is built from the data
  await pill().click();
  const preset = page.getByRole('button', { name: /^Last logged day/ });
  check((await preset.count()) === 1, 'last-logged-day shortcut is shown');
  if (anchor) {
    const t = (await preset.innerText()).replace(/\s+/g, ' ');
    check(t.includes(inr(anchor.balance)) && t.includes(String(Number(anchor.date.slice(8)))), `shortcut matches the sheet: row ${anchor.rowIndex}, ${anchor.date}, ${inr(anchor.balance)} (shows "${t}")`);
    check(!(await page.locator('body').innerText()).includes('Audit Anchor'), 'no hard-coded "Audit Anchor" text');
  }
  await page.keyboard.press('Escape');
  await pill().click(); // close

  // 5. Log sheet opens from the top bar and Escape closes it
  await page.getByRole('button', { name: 'Log', exact: true }).first().click();
  check(await page.getByRole('dialog', { name: 'Log a transaction' }).isVisible(), 'Log opens as a dialog');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(!(await page.getByRole('dialog').count()), 'Escape closes it');

  // 6. Home shows the API balance and keeps its tabs working
  await page.goto(`${BASE}/`);
  await ready();
  const body = await page.locator('body').innerText();
  check(body.includes(inr(api.kpis.currentBalance)), `Home shows the balance from the API (${inr(api.kpis.currentBalance)})`);
  if (today === '2026-11-12' || today === '2026-11-11') check(inr(api.kpis.currentBalance) === '₹1,14,021', 'anchor balance is ₹1,14,021');

  // 6b. Task 4: Home has no inner tab strip, every hero sentence comes from the data
  const strip = await page.locator('main button').filter({ hasText: /Overview|Budget Burn|Ledger \(|Excel Mode|Loans & Payoff|Peer Split/ }).count();
  check(strip === 0, 'Home has no inner tab strip');
  const lower = body.toLowerCase();
  const bills = api.expenses.filter((e) => e.type === 'DEBIT' && e.date > today && e.date <= addDays(today, 5));
  check(bills.length > 0 && bills.every((b) => lower.includes(b.description.toLowerCase()) && body.includes(inr(b.amount))), `bills caption lists the real bills: ${bills.map((b) => b.description + ' ' + inr(b.amount)).join(', ')}`);
  check(body.includes('By ' + short(addDays(today, 5))), `deadline reads "By ${short(addDays(today, 5))}"`);
  const sum = bills.reduce((a, b) => a + b.amount, 0);
  check(Math.round(sum) === api.kpis.upcomingBills, `bills caption adds up to the KPI (${inr(sum)} = ${inr(api.kpis.upcomingBills)})`);
  check(body.includes(inr(api.kpis.postNovBalance)) && body.includes(inr(api.kpis.projectedEndBalance)), 'cushion and projected end equal the API');
  const open = api.loans.filter((l) => !l.isPaidOff && l.targetPayoffDate);
  const emi = Math.round(open.reduce((a, l) => a + (l.monthlyEmi || 0), 0));
  check(open.length === 0 || body.includes('freeing ' + inr(emi) + ' a month'), `debt-free line shows the EMIs freed (${inr(emi)})`);
  check(!/58k|100\.7%|August 2027/.test(body), 'no hard-coded hero text left');
  for (const href of ['/budget', '/loans']) check((await page.locator(`main a[href="${href}"]`).count()) > 0, `Home links to ${href}`);

  // 6c. Budget is its own page and shows the real safe daily spend
  await page.goto(`${BASE}/budget`);
  await ready();
  check((await page.getByRole('heading', { level: 1 }).first().innerText()).trim() === 'Budget', 'Budget page has its own title');
  check((await page.locator('body').innerText()).includes(inr(api.budgetPacing.safeTotalDailyBurn)), `Budget shows the safe daily spend (${inr(api.budgetPacing.safeTotalDailyBurn)})`);

  // 7. a saved budget setting is used from the first request (no duplicate request with defaults)
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
  await ctx2.route(/\/api\/financials/, (r) => r.fulfill({ json: api }));
  const p2 = await ctx2.newPage();
  await p2.addInitScript(() => localStorage.setItem('finflow_cycle_config', JSON.stringify({ generalBudget: 12000 })));
  const reqs2 = [];
  p2.on('request', (r) => r.url().includes('/api/financials') && reqs2.push(new URL(r.url())));
  await p2.goto(`${BASE}/loans`);
  await p2.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30000 });
  await p2.waitForTimeout(700);
  check(reqs2.length === 1 && reqs2[0].searchParams.get('generalBudget') === '12000', `saved budget is used on the first request (requests: ${reqs2.length}, generalBudget=${reqs2[0] && reqs2[0].searchParams.get('generalBudget')})`);

  await browser.close();
  console.log(failed ? `\n${failed} FAIL` : '\nALL PASS');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(2);
});
