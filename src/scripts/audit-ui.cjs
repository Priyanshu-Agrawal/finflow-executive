// Measured audit of the ten consistency rules of the old-UI polish (Step A).
//
//   npm run audit:ui                                   (against http://localhost:3000)
//   npm run audit:ui -- --base=http://localhost:3007   (a test build)
//   npm run audit:ui -- --report                       (also writes /tmp/audit.json and screenshots to /tmp/audit-shots)
//   npm run audit:ui -- --verbose                      (list more offenders for the type-system rule)
//
// Signs in once, reads /api/financials ONCE (Sheets allows ~60 reads a minute) and serves that
// same response to every page through the browser context. Write routes are intercepted: this
// script can never change the live sheet. Plain .cjs on purpose: browser-side functions passed
// to page.evaluate break under tsx.
//
// Conventions the app must follow so the audit can see them (added to the markup by Step A):
//   [data-allow-mono]  wraps the Excel grid, the formula bar and row-number cells: the only places
//                      where monospace text and ISO dates are allowed.
//   [data-allow-serif] wraps the FinFlow wordmark and the Home hero balance.
//   [data-sticky-bar]  the sticky control bar of a page (StickyBar).
//   [data-anchor-row]  the table row for the anchor date (Ledger and Excel), the target of Today.
//   The floating Today button is a position:fixed button whose text is exactly "Today".
const { chromium } = require('playwright');
const fs = require('fs');

const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith('--base=')) || '--base=http://localhost:3000').slice(7).replace(/\/$/, '');
const REPORT = args.includes('--report');
const VERBOSE = args.includes('--verbose'); // list more offenders per failing check

const ROUTES = [
  { path: '/', label: 'Home' },
  { path: '/budget', label: 'Budget' },
  { path: '/expenses', label: 'Ledger' },
  { path: '/excel', label: 'Excel' },
  { path: '/loans', label: 'Loans' },
  { path: '/ledger', label: 'Splits' },
  { path: '/log', label: 'Log' },
];
const NAV_LABELS = ['Home', 'Ledger', 'Excel', 'Loans', 'Splits', 'Budget'];
const PHONE_BAR = ['Home', 'Ledger', 'Excel', 'Loans'];
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'laptop', width: 1440, height: 900 },
];
const CREDIT = [59, 130, 246]; // #3b82f6
const HARD_CODED = ['58k', '100.7%', 'August 2027', 'Audit Anchor'];

const results = []; // {rule, route, vp, ok, detail}
let pageStatus = 200; // a page that does not answer 200 fails every rule (no vacuous passes)
function rec(rule, route, vp, ok, detail) {
  if (pageStatus !== 200 && route !== 'tokens') {
    ok = false;
    detail = `HTTP ${pageStatus}`;
  }
  results.push({ rule, route, vp, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${rule} ${vp.padEnd(6)} ${route.padEnd(10)} ${detail || ''}`);
}

// ---- helpers that run inside the page (plain functions, serialised by Playwright) ----------
function pageScan(opts) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    return c ? s + '.' + c : s;
  };
  const out = {};
  const main = document.querySelector('main');
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgb = (c) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };

  // text nodes with their styles
  const items = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || /^(script|style|noscript)$/i.test(el.tagName)) continue;
    if (!visible(el) || el.closest('.sr-only')) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    items.push({
      t: t.slice(0, 50),
      sel: sel(el),
      fs,
      th: !!el.closest('th, thead'),
      upper: cs.textTransform === 'uppercase' || (/^[A-Z][A-Z0-9 &/.-]{3,}$/.test(t) && /[A-Z]{4}/.test(t)),
      ls: fs ? ls / fs : 0,
      ff: cs.fontFamily,
      rgb: rgb(cs.color),
      mono: !!el.closest('[data-allow-mono]'),
      serif: !!el.closest('[data-allow-serif]'),
    });
  }
  out.items = items;
  out.vw = vw;
  out.scrollWidth = document.documentElement.scrollWidth;
  out.wide = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 1 && visible(el)) {
      // ignore anything inside a scroll container of its own
      let p = el.parentElement;
      let inScroller = false;
      while (p && p !== document.body) {
        const ox = getComputedStyle(p).overflowX;
        if ((ox === 'auto' || ox === 'scroll' || ox === 'hidden') && p.getBoundingClientRect().right <= vw + 1) { inScroller = true; break; }
        p = p.parentElement;
      }
      if (!inScroller) out.wide.push(sel(el) + ' right=' + Math.round(r.right));
    }
    if (out.wide.length > 8) break;
  }

  // headings
  const h1s = [...document.querySelectorAll('h1')].filter(visible);
  out.h1 = h1s.map((h) => h.textContent.replace(/\s+/g, ' ').trim());
  out.dupHeadings = [];
  if (h1s[0]) {
    const t = h1s[0].textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    for (const h of document.querySelectorAll('h2, h3, h4')) {
      if (visible(h) && h.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === t) out.dupHeadings.push(h.textContent.trim());
    }
  }

  // navigation
  const header = document.querySelector('header');
  out.header = header ? getComputedStyle(header).position : null;
  out.topMenu = [...document.querySelectorAll('header nav a')].filter(visible).map((a) => a.textContent.replace(/\s+/g, ' ').trim());
  const bottom = [];
  for (const a of document.querySelectorAll('a[href]')) {
    if (!visible(a)) continue;
    let p = a;
    let fixed = false;
    while (p && p !== document.body) {
      if (getComputedStyle(p).position === 'fixed') { fixed = true; break; }
      p = p.parentElement;
    }
    if (fixed && a.getBoundingClientRect().top > vh * 0.7) bottom.push(a.textContent.replace(/\s+/g, ' ').trim());
  }
  out.bottomBar = bottom;
  const tabButtons = main
    ? [...main.querySelectorAll('button')].filter((b) => visible(b) && /Overview|Budget Burn|Ledger \(|Excel Mode|Loans & Payoff|Peer Split/.test(b.textContent))
    : [];
  out.tabStrip = tabButtons.length;

  // tables and sticky bars
  out.tables = [...document.querySelectorAll('main table')]
    .filter((t) => visible(t) && !t.closest('.sr-only') && !t.classList.contains('sr-only'))
    .map((t) => {
      const head = t.querySelector('thead');
      const th = t.querySelector('thead th');
      const hp = head ? getComputedStyle(head).position : 'none';
      const tp = th ? getComputedStyle(th).position : 'none';
      return { sticky: hp === 'sticky' || tp === 'sticky', headBottom: head ? Math.round(head.getBoundingClientRect().bottom + window.scrollY) : null, sel: sel(t) };
    });
  const bar = document.querySelector('[data-sticky-bar]');
  out.stickyBar = bar ? getComputedStyle(bar).position : null;

  // colours
  out.greenClasses = [...document.querySelectorAll('body *')]
    .filter((el) => visible(el) && /(^|\s)(text|border|bg)-(emerald|green)-/.test(el.getAttribute('class') || ''))
    .slice(0, 6)
    .map((el) => sel(el) + ' "' + el.textContent.trim().slice(0, 20) + '"');
  out.greenText = items.filter((i) => {
    const [r, g, b] = i.rgb;
    return g - r > 40 && g - b > 15 && g > 120;
  }).slice(0, 6).map((i) => i.sel + ' "' + i.t + '"');
  out.credits = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.children.length > 0 || el.closest('.sr-only')) continue;
    const t = el.textContent.trim();
    if ((/^CREDIT$/.test(t) && el.closest('td')) || /^\+\s?₹/.test(t)) out.credits.push({ t: t.slice(0, 20), rgb: rgb(getComputedStyle(el).color), sel: sel(el) });
  }

  // tap targets and labels
  const bar2 = [];
  const controls = [...document.querySelectorAll('button, a[href], [role="button"], select, input:not([type="hidden"])')].filter(visible);
  out.small = [];
  out.unlabelled = [];
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    const inTable = !!el.closest('table');
    let fixedBottom = false;
    let p = el;
    while (p && p !== document.body) {
      if (getComputedStyle(p).position === 'fixed' && p.getBoundingClientRect().top > vh * 0.7) { fixedBottom = true; break; }
      p = p.parentElement;
    }
    const zone = !!el.closest('header') || fixedBottom || (!!el.closest('main') && !inTable);
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    const named = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.labels && el.labels.length) || (el.tagName === 'INPUT' && el.getAttribute('placeholder'));
    if (zone && r.height < 43.5 && !(el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio'))) {
      out.small.push(sel(el) + ' h=' + Math.round(r.height) + ' "' + text.slice(0, 18) + '"');
    }
    if (!text && !named && el.tagName !== 'INPUT') out.unlabelled.push(sel(el));
    if (el.tagName === 'INPUT' && !named && !text && !(el.type === 'checkbox' && el.closest('th'))) out.unlabelled.push(sel(el));
  }
  out.smallCount = out.small.length;
  out.small = out.small.slice(0, 6);
  out.unlabelledCount = out.unlabelled.length;
  out.unlabelled = out.unlabelled.slice(0, 6);
  void bar2;
  out.bodyText = document.body.innerText;
  return out;
}

async function openMore(page) {
  const btn = page.locator('header button[aria-label*="more" i], header button[aria-label*="menu" i]').first();
  if (!(await btn.count())) return null;
  await btn.click();
  await page.waitForTimeout(300);
  const links = await page.evaluate(() => [...document.querySelectorAll('header a')].filter((a) => a.getBoundingClientRect().width > 0).map((a) => a.textContent.replace(/\s+/g, ' ').trim()));
  await btn.click(); // close it again so it does not push the page down for the other rules
  await page.waitForTimeout(200);
  return links;
}

function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const near = (rgb, want, tol) => rgb.every((v, i) => Math.abs(v - want[i]) <= tol);

function ruleR5R6(scan, phone, path, vpName) {
  // R5 one type system
  {
    const small = scan.items.filter((i) => i.fs < 12 && !(i.th && !phone && i.fs >= 11));
    const tracked = scan.items.filter((i) => i.upper && i.ls > 0.05);
    const mono = scan.items.filter((i) => /mono|courier|consolas/i.test(i.ff) && !i.mono);
    const serif = scan.items.filter((i) => /newsreader|georgia|times/i.test(i.ff.replace(/sans-serif/gi, '')) && !i.serif);
    const parts = [];
    const show = (label, arr) => {
      if (!arr.length) return;
      const seen = new Set();
      const uniq = arr.filter((i) => { const k = i.sel + i.t; return seen.has(k) ? false : (seen.add(k), true); });
      parts.push(`${arr.length} ${label}: ` + uniq.slice(0, VERBOSE ? 14 : 3).map((i) => `${i.sel} "${i.t.slice(0, 22)}"`).join(' | '));
    };
    show('under 12px', small);
    show('wide-tracked caps', tracked);
    show('mono outside Excel grid', mono);
    show('serif outside wordmark/hero', serif);
    rec('R5', path, vpName, parts.length === 0, parts.join(' ; '));
  }

  // R6 dates
  {
    const iso = scan.items.filter((i) => /\d{4}-\d{2}-\d{2}/.test(i.t) && !i.mono);
    rec('R6', path, vpName, iso.length === 0, iso.length ? `${iso.length} ISO dates, e.g. ${iso.slice(0, 3).map((i) => `${i.sel} "${i.t.slice(0, 24)}"`).join(' | ')}` : '');
  }

}

function ruleR9(scan, phone, path, vpName) {
  // R9 tap targets and labels
  {
    const parts = [];
    if (phone && scan.smallCount) parts.push(`${scan.smallCount} controls under 44px: ${scan.small.slice(0, 4).join(' | ')}`);
    if (scan.unlabelledCount) parts.push(`${scan.unlabelledCount} unlabelled icon controls: ${scan.unlabelled.slice(0, 3).join(' | ')}`);
    rec('R9', path, vpName, parts.length === 0, parts.join(' ; '));
  }

}

async function waitReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForFunction(() => !/Synchroni[sz]ing|Loading ledger|Initializing|Loading loan|Loading\.\.\./i.test(document.body.innerText) && document.querySelector('main, h1'), null, { timeout: 25000 })
    .catch(() => {});
  await page.waitForTimeout(900);
}

async function checkToday(page, route, vpName) {
  const rule = 'R4';
  const fab = () =>
    page.evaluateHandle(() => {
      for (const b of document.querySelectorAll('button')) {
        const r = b.getBoundingClientRect();
        if (r.width > 0 && b.textContent.trim() === 'Today' && getComputedStyle(b).position === 'fixed') return b;
      }
      return null;
    });
  const hasFab = async () => !!(await (await fab()).asElement());
  const wants = route.path === '/expenses' || route.path === '/excel';
  if (!wants) {
    const present = await hasFab();
    // not scrolled: the FAB must not exist on screens without a dated list, even after scrolling
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    rec(rule, route.path, vpName, !present && !(await hasFab()), present ? 'floating Today button on a screen without a dated list' : '');
    return;
  }
  // scroll the anchor away (container and page), then look for the floating button
  await page.evaluate(() => {
    const row = document.querySelector('[data-anchor-row], [id^="excel-row-"]');
    for (let p = row && row.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) p.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  let found = await hasFab();
  if (!found) {
    await page.evaluate(() => {
      const row = document.querySelector('[data-anchor-row], [id^="excel-row-"]');
      for (let p = row && row.parentElement; p; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) p.scrollTop = p.scrollHeight;
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);
    found = await hasFab();
  }
  if (!found) return rec(rule, route.path, vpName, false, 'no floating Today button after scrolling the anchor row out of view');
  const inline = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => /Focus Today|Nearest/i.test(b.textContent)).length);
  const btn = (await fab()).asElement();
  await btn.click();
  await page.waitForTimeout(1500);
  const pos = await page.evaluate(() => {
    const row = document.querySelector('[data-anchor-row]');
    if (!row) return { missing: true };
    let scroller = null;
    for (let p = row.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) { scroller = p; break; }
    }
    const rt = row.getBoundingClientRect().top;
    const top = scroller ? scroller.getBoundingClientRect().top : 0;
    const h = scroller ? scroller.clientHeight : window.innerHeight;
    return { frac: (rt - top) / h };
  });
  if (pos.missing) return rec(rule, route.path, vpName, false, 'no [data-anchor-row] element to place at 30%');
  const ok = Math.abs(pos.frac - 0.3) <= 0.05 && inline === 0;
  rec(rule, route.path, vpName, ok, `anchor at ${(pos.frac * 100).toFixed(0)}% (want 30±5)${inline ? '; inline "Focus Today" button still present' : ''}`);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext();
  const login = await ctx.request.post(`${BASE}/api/auth/login`, {
    data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD },
  });
  if (!login.ok()) {
    console.error('FAIL  could not sign in:', login.status());
    process.exit(2);
  }
  const today = new Date().toLocaleDateString('en-CA');
  const fin = await ctx.request.get(`${BASE}/api/financials?refDate=${today}&generalBudget=15000&electricityBudget=3200&budgetRecurringDay=7&rentRecurringDay=15`);
  if (!fin.ok()) {
    console.error('FAIL  /api/financials returned', fin.status(), '(Sheets quota? wait a minute and retry)');
    process.exit(2);
  }
  const api = await fin.json();
  // serve the one captured response to every page; never let a write through
  await ctx.route(/\/api\/financials/, (route) => route.fulfill({ json: api }));
  await ctx.route(/\/api\/(expenses|ledger|loans)/, (route) =>
    route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 200, json: { ok: true, audit: 'write blocked' } })
  );

  // anchor row = last row dated on or before today, reading down until the first later date
  let anchor = null;
  for (const e of api.expenses) {
    if (e.date && e.date > today) break;
    if (e.date) anchor = e;
  }
  const bills = api.expenses.filter((e) => {
    if (e.type !== 'DEBIT' || !e.date) return false;
    const d = new Date(today + 'T00:00:00');
    const lo = new Date(d); lo.setDate(lo.getDate() + 1);
    const hi = new Date(d); hi.setDate(hi.getDate() + 5);
    const ed = new Date(e.date + 'T00:00:00');
    return ed >= lo && ed <= hi;
  });
  const shotDir = '/tmp/audit-shots';
  if (REPORT) fs.mkdirSync(shotDir, { recursive: true });
  const report = { base: BASE, today, anchor: anchor && { row: anchor.rowIndex, date: anchor.date, balance: anchor.balance }, bills: bills.map((b) => b.description), pages: [] };

  rec('R7', 'tokens', 'static', contrast(CREDIT, [11, 11, 12]) >= 4.5 && contrast(CREDIT, [18, 18, 20]) >= 4.5,
    `credit blue contrast ${contrast(CREDIT, [11, 11, 12]).toFixed(2)} on #0B0B0C, ${contrast(CREDIT, [18, 18, 20]).toFixed(2)} on #121214 (need 4.5)`);

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const resp = await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded' });
      await waitReady(page);
      const status = resp ? resp.status() : 0;
      pageStatus = status;
      const phone = vp.name === 'phone';
      const hasTable = ['/expenses', '/excel', '/ledger'].includes(route.path);
      const scan = await page.evaluate(pageScan, {});
      report.pages.push({ vp: vp.name, path: route.path, status, h1: scan.h1, topMenu: scan.topMenu, bottomBar: scan.bottomBar });
      if (REPORT) await page.screenshot({ path: `${shotDir}/${vp.name}${route.path === '/' ? '-home' : route.path.replace(/\//g, '-')}.png` });

      // R1 one navigation, one name
      {
        let ok = status === 200;
        let detail = ok ? '' : `HTTP ${status}`;
        if (ok && !phone) {
          const t = scan.topMenu;
          const good = NAV_LABELS.every((l) => t.includes(l)) && t.length === NAV_LABELS.length && JSON.stringify(t.slice(0, 5)) === JSON.stringify(NAV_LABELS.slice(0, 5));
          if (!good) { ok = false; detail = `top menu is [${t.join(', ')}]`; }
        }
        if (ok && phone) {
          const b = scan.bottomBar;
          if (JSON.stringify(b) !== JSON.stringify(PHONE_BAR)) { ok = false; detail = `bottom bar is [${b.join(', ')}]`; }
          else {
            const more = await openMore(page);
            if (!more) { ok = false; detail = 'no labelled "More" button for Splits and Budget'; }
            else if (!['Splits', 'Budget'].every((l) => more.includes(l))) { ok = false; detail = `More menu has [${more.join(', ')}]`; }
          }
        }
        if (ok && scan.h1[0] !== route.label) { ok = false; detail = `h1 is "${scan.h1[0] || '(none)'}", want "${route.label}"`; }
        if (ok && route.path === '/' && scan.tabStrip >= 3) { ok = false; detail = `Home still has an inner tab strip (${scan.tabStrip} tabs)`; }
        rec('R1', route.path, vp.name, ok, detail);
      }

      // R2 one page frame; phone density
      {
        let ok = scan.h1.length === 1 && scan.dupHeadings.length === 0;
        let detail = ok ? '' : scan.h1.length !== 1 ? `${scan.h1.length} h1 elements` : `second heading repeats the title: ${scan.dupHeadings[0]}`;
        if (ok && phone && (route.path === '/expenses' || route.path === '/excel')) {
          await page.evaluate(() => window.scrollTo(0, 0));
          const hb = await page.evaluate(() => {
            const th = document.querySelector('main table thead');
            return th ? Math.round(th.getBoundingClientRect().bottom + window.scrollY) : null;
          });
          if (hb === null) { ok = false; detail = 'no table header to measure'; }
          else if (hb > 300) { ok = false; detail = `first data row starts ${hb}px down (max 300)`; }
        }
        rec('R2', route.path, vp.name, ok, detail);
      }

      // R3 sticky
      {
        let ok = scan.header === 'sticky' || scan.header === 'fixed';
        let detail = ok ? '' : `top bar is ${scan.header}`;
        if (ok && hasTable && scan.tables.length === 0) { ok = false; detail = 'no table found'; }
        const loose = scan.tables.filter((t) => !t.sticky);
        if (ok && loose.length) { ok = false; detail = `table header not sticky: ${loose.map((t) => t.sel).join(', ')}`; }
        if (ok && (route.path === '/expenses' || route.path === '/ledger') && scan.stickyBar !== 'sticky') { ok = false; detail = `page control bar is ${scan.stickyBar || 'missing'}`; }
        rec('R3', route.path, vp.name, ok, detail);
      }

      // R4 Today button
      await checkToday(page, route, vp.name);
      await page.evaluate(() => window.scrollTo(0, 0));

      ruleR5R6(scan, phone, route.path, vp.name);

      // R7 credits
      {
        const parts = [];
        if (scan.greenClasses.length) parts.push(`green classes: ${scan.greenClasses.slice(0, 3).join(' | ')}`);
        if (scan.greenText.length) parts.push(`green text: ${scan.greenText.slice(0, 3).join(' | ')}`);
        const needCredits = route.path === '/expenses' || route.path === '/excel';
        if (needCredits && scan.credits.length === 0) parts.push('no credit amounts or CREDIT badges found to check');
        const notBlue = scan.credits.filter((c) => !near(c.rgb, CREDIT, 12));
        if (notBlue.length) parts.push(`${notBlue.length} credits not blue, e.g. ${notBlue[0].sel} "${notBlue[0].t}" rgb(${notBlue[0].rgb})`);
        rec('R7', route.path, vp.name, parts.length === 0, parts.join(' ; '));
      }

      // R8 no sideways scroll
      rec('R8', route.path, vp.name, scan.scrollWidth <= scan.vw, scan.scrollWidth > scan.vw ? `page is ${scan.scrollWidth}px wide in ${scan.vw}px; wide: ${scan.wide.slice(0, 4).join(' | ')}` : '');

      ruleR9(scan, phone, route.path, vp.name);

      // R10 no hard-coded money text (open the date popover too: it holds the old preset)
      {
        const pill = page.locator('header button:has(svg)').filter({ hasText: /Today|\d{1,2} \w{3}/ }).first();
        let popText = '';
        if (await pill.count()) {
          await pill.click().catch(() => {});
          await page.waitForTimeout(300);
          popText = await page.evaluate(() => document.body.innerText);
        }
        const text = scan.bodyText + '\n' + popText;
        const parts = [];
        for (const s of HARD_CODED) if (text.includes(s)) parts.push(`contains "${s}"`);
        if (anchor) {
          const ok1 = new Set([formatLong(anchor.date), formatShort(anchor.date)]);
          for (const m of text.matchAll(/Anchor:\s*(\d{1,2} \w{3}( \d{4})?)/g)) if (!ok1.has(m[1])) parts.push(`"Anchor: ${m[1]}" but the anchor row is ${anchor.date}`);
        }
        if (route.path === '/') {
          const lower = text.toLowerCase();
          const missing = bills.filter((b) => !lower.includes(b.description.toLowerCase()));
          if (bills.length && missing.length) parts.push(`upcoming-bills caption lacks real bills: ${missing.map((b) => b.description).join(', ')}`);
        }
        rec('R10', route.path, vp.name, parts.length === 0, parts.join(' ; '));
      }
      if (errors.length) console.log(`note  page errors on ${route.path} (${vp.name}): ${errors.slice(0, 2).join(' | ')}`);
      await page.close();
    }
  }


  // Dialogs: the Log and Schedule EMI sheets follow the same type, date and label rules.
  for (const vp of VIEWPORTS) {
    for (const dlg of [
      { name: '/expenses+Log', open: (page) => page.getByRole('button', { name: 'Log', exact: true }).first().click() },
      { name: '/expenses+EMI', open: (page) => page.getByRole('button', { name: 'Schedule EMI' }).first().click() },
    ]) {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      pageStatus = 200;
      await page.goto(BASE + '/expenses', { waitUntil: 'domcontentloaded' });
      await waitReady(page);
      await dlg.open(page);
      await page.waitForTimeout(500);
      const opened = await page.getByRole('dialog').count();
      if (!opened) {
        rec('R5', dlg.name, vp.name, false, 'dialog did not open');
      } else {
        const scan = await page.evaluate(pageScan, {});
        ruleR5R6(scan, vp.name === 'phone', dlg.name, vp.name);
        ruleR9(scan, vp.name === 'phone', dlg.name, vp.name);
      }
      await page.close();
    }
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  const byRule = {};
  for (const r of results) {
    byRule[r.rule] = byRule[r.rule] || { pass: 0, fail: 0 };
    byRule[r.rule][r.ok ? 'pass' : 'fail']++;
  }
  console.log('\nSummary (pass/fail per rule):');
  for (const k of Object.keys(byRule).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))) console.log(`  ${k.padEnd(4)} ${byRule[k].pass} pass, ${byRule[k].fail} fail`);
  console.log(`${failed.length === 0 ? 'ALL PASS' : failed.length + ' FAIL'} of ${results.length} checks`);
  if (REPORT) {
    report.results = results;
    fs.writeFileSync('/tmp/audit.json', JSON.stringify(report, null, 2));
    console.log('report: /tmp/audit.json, screenshots: ' + shotDir);
  }
  process.exit(failed.length ? 1 : 0);
})();

function formatShort(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}`;
}
function formatLong(iso) {
  return `${formatShort(iso)} ${iso.slice(0, 4)}`;
}
