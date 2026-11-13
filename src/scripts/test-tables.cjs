// Behaviour of the Ledger, Splits and Excel tables (Step A, Tasks 5 and 7). Run against a test build:
//   node --env-file=.env.local src/scripts/test-tables.cjs --base=http://localhost:3007
// One financials read, writes blocked. Plain .cjs (see audit-ui.cjs).
const { chromium } = require('playwright');

const BASE = ((process.argv.find((a) => a.startsWith('--base=')) || '--base=http://localhost:3000').slice(7)).replace(/\/$/, '');
let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed++;
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const boot = await browser.newContext();
  const login = await boot.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  check(login.ok(), 'signed in');
  const today = new Date().toLocaleDateString('en-CA');
  const api = await (await boot.request.get(`${BASE}/api/financials?refDate=${today}&generalBudget=15000&electricityBudget=3200&budgetRecurringDay=7&rentRecurringDay=15&rentAmount=15000`)).json();
  const state = await boot.storageState();
  await boot.close();

  async function open(vp, path) {
    const ctx = await browser.newContext({ viewport: vp, storageState: state });
    await ctx.route(/\/api\/financials/, (r) => r.fulfill({ json: api }));
    await ctx.route(/\/api\/(expenses|ledger|loans)/, (r) => (r.request().method() === 'GET' ? r.continue() : r.fulfill({ json: { ok: true } })));
    const page = await ctx.newPage();
    await page.goto(BASE + path);
    await page.locator('main table tbody tr').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(900);
    return { ctx, page };
  }
  const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height }; }, sel);

  for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['laptop', { width: 1440, height: 900 }]]) {
    // ---- Ledger
    {
      const { ctx, page } = await open(vp, '/expenses');
      const scroller = 'main table >> xpath=ancestor::div[contains(@class,"overflow-auto")][1]';
      const sc = page.locator(scroller).first();
      await sc.evaluate((el) => { el.scrollTop = 600; });
      await page.waitForTimeout(200);
      const head = await rect(page, 'main table thead');
      const box = await sc.evaluate((el) => el.getBoundingClientRect().top);
      check(Math.abs(head.top - box) <= 1, `[${name}] Ledger header stays at the top of the table after scrolling (header ${Math.round(head.top)}, table ${Math.round(box)})`);

      // the table fills the screen, so the page only scrolls on a short window: use one
      await page.setViewportSize({ width: vp.width, height: name === 'phone' ? 520 : 560 });
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
      const natural = (await rect(page, '[data-sticky-bar]')).top;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(250);
      const scrolled = await page.evaluate(() => window.scrollY);
      check(scrolled > 50, `[${name}] the page scrolls on a short window (${Math.round(scrolled)}px)`);
      const bar = await rect(page, '[data-sticky-bar]');
      const top = await rect(page, 'header');
      // it rides with the page until it reaches the top bar, then stays right under it
      const want = Math.max(top.bottom, natural - scrolled);
      check(Math.abs(bar.top - want) <= 1.5, `[${name}] control bar never goes above the top bar (${Math.round(bar.top)}, expected ${Math.round(want)}, top bar ends ${Math.round(top.bottom)})`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);

      // the type filter and the search narrow the rows
      const rowsBefore = await page.locator('main table tbody tr').count();
      await page.getByRole('button', { name: 'Credit', exact: true }).click();
      await page.waitForTimeout(300);
      const types = await page.locator('main table tbody tr td:nth-child(7) button').allInnerTexts();
      check(types.length > 0 && types.every((t) => t.trim() === 'CREDIT'), `[${name}] Credit filter shows only CREDIT rows (${types.length})`);
      await page.getByRole('button', { name: 'All', exact: true }).first().click();
      await page.getByRole('searchbox', { name: 'Search the ledger' }).fill('Rent');
      await page.waitForTimeout(300);
      const rentRows = await page.locator('main table tbody tr td:nth-child(5)').allInnerTexts();
      check(rentRows.length > 0 && rentRows.length < rowsBefore && rentRows.every((t) => /rent/i.test(t)), `[${name}] search narrows to matching rows (${rentRows.length})`);
      await page.getByRole('searchbox', { name: 'Search the ledger' }).fill('');

      // options: always there on a laptop, behind a button on a phone
      const sortBtn = page.getByRole('button', { name: 'Newest first' });
      if (name === 'phone') {
        check(!(await sortBtn.isVisible()), `[${name}] sort controls are hidden until Options is opened`);
        await page.getByRole('button', { name: 'Options' }).click();
        await page.waitForTimeout(200);
      }
      check(await sortBtn.isVisible(), `[${name}] sort, scope and "Sort sheet" controls are reachable`);

      // The Ledger's own Today badge follows the same rule.
      const ledgerBadge = (await page.locator('[data-anchor-row]').innerText()).includes('Today');
      check(ledgerBadge, `[${name}] the Ledger's anchor row is labelled Today when the reference date is today`);
      await sortBtn.click();
      await page.waitForTimeout(300);
      const dates = await page.locator('main table tbody tr td:nth-child(4)').allInnerTexts();
      check(dates.length > 2, `[${name}] Newest first still lists rows (${dates.length})`);
      await page.getByRole('button', { name: 'Sort sheet by date' }).waitFor({ state: 'visible' });
      check(await page.getByRole('button', { name: 'Sort sheet by date' }).isEnabled(), `[${name}] "Sort sheet by date" is available`);
      await page.getByRole('button', { name: 'Oldest first' }).click();

      // every row action is still there
      const first = page.locator('main table tbody tr').first();
      for (const t of ['Edit Transaction (Columns A-D)', 'Duplicate Transaction', 'Delete Row']) {
        check((await first.locator(`button[title="${t}"]`).count()) === 1, `[${name}] row action "${t}" is present`);
      }
      check((await first.locator('td[draggable="true"]').count()) === 1, `[${name}] drag handle is present`);

      // Today button sits above the phone bottom bar
      await page.evaluate(() => { const s = document.querySelector('[data-anchor-row]'); for (let p = s && s.parentElement; p; p = p.parentElement) { if (getComputedStyle(p).overflowY === 'auto') { p.scrollTop = 0; break; } } });
      await page.waitForTimeout(400);
      const fab = page.getByRole('button', { name: "Go to today's row" });
      check(await fab.isVisible(), `[${name}] Today button appears when the anchor is out of view`);
      if (name === 'phone') {
        const f = await fab.boundingBox();
        const b = await page.locator('nav[aria-label="Bottom"]').boundingBox();
        check(f.y + f.height <= b.y, `[${name}] Today button is above the bottom bar (${Math.round(f.y + f.height)} <= ${Math.round(b.y)})`);
        check(f.height >= 44, `[${name}] Today button is at least 44px tall (${Math.round(f.height)})`);
      }
      await fab.click();
      await page.waitForTimeout(1500);
      check(!(await fab.isVisible()), `[${name}] Today button hides once the anchor row is in view`);
      await ctx.close();
    }

    // ---- Splits
    {
      const { ctx, page } = await open(vp, '/ledger');
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      check(w <= vp.width, `[${name}] Splits is not wider than the screen (${w}px in ${vp.width}px)`);
      const heads = await page.locator('main table thead th').allInnerTexts();
      check(heads.every((h) => h.trim().length > 0) && heads.join('|') === 'Row|Date|Event|Split with|Total spent|My share', `[${name}] Splits headers are complete: ${heads.join(' | ')}`);
      const sc = page.locator('main table >> xpath=ancestor::div[contains(@class,"overflow-auto")][1]').first();
      await sc.evaluate((el) => { el.scrollTop = 300; });
      await page.waitForTimeout(200);
      const head = await rect(page, 'main table thead');
      const box = await sc.evaluate((el) => el.getBoundingClientRect().top);
      check(Math.abs(head.top - box) <= 1, `[${name}] Splits header stays at the top of the table`);
      const before = await page.locator('main table tbody tr').count();
      await page.getByRole('button', { name: 'Harsh', exact: true }).click();
      await page.waitForTimeout(300);
      const after = await page.locator('main table tbody tr').count();
      check(after > 0 && after <= before, `[${name}] person filter works (${before} -> ${after})`);
      check(await page.getByRole('button', { name: 'Add shared spend' }).isVisible(), `[${name}] "Add shared spend" is reachable`);

      // The table's max-height is worked out from the room there will be once the top bar and
      // control bar are stuck, not from how far down the unscrolled page it happens to sit
      // (cards above it must not starve it). The box's own height may be shorter than that cap
      // when there are too few rows to fill it (as right now, after filtering to one person).
      const geom = await page.evaluate(() => {
        const scroller = document.querySelector('main table').closest('[class*="overflow-auto"]');
        const topbar = document.querySelector('header').getBoundingClientRect().height;
        const bar = document.querySelector('[data-sticky-bar]').getBoundingClientRect().height;
        return { maxHeight: parseFloat(scroller.style.maxHeight) || 0, topbar, bar, viewport: window.innerHeight };
      });
      const gap = name === 'laptop' ? 24 : 104;
      const expected = geom.viewport - geom.topbar - geom.bar - gap;
      check(Math.abs(geom.maxHeight - expected) <= 2, `[${name}] Splits table's max-height is the room below the stuck controls (${Math.round(geom.maxHeight)}px, expected ~${Math.round(expected)}px)`);
      check(geom.maxHeight > 240, `[${name}] Splits table is not stuck at the fallback minimum height (${Math.round(geom.maxHeight)}px)`);
      await ctx.close();
    }

    // ---- Excel
    {
      const { ctx, page } = await open(vp, '/excel');
      check(!(await page.getByRole('button', { name: "Go to today's row" }).isVisible()), `[${name}] Excel opens on the anchor row without the Today button`);
      const rows = await page.locator('main table tbody tr').count();
      check(rows >= 300, `[${name}] Excel still lists every row (${rows})`);
      const anchorDate = (await page.locator('[data-anchor-row] td').nth(1).innerText()).trim();
      const dateRe = name === 'phone' ? /^\d{1,2} [A-Z][a-z]{2}$/ : /^\d{1,2} [A-Z][a-z]{2} \d{4}$/;
      check(dateRe.test(anchorDate), `[${name}] Excel dates read like "${name === 'phone' ? '12 Nov' : '12 Nov 2026'}" (got "${anchorDate}")`);
      const rowH = await page.locator('[data-anchor-row]').evaluate((el) => el.getBoundingClientRect().height);
      check(rowH < 50, `[${name}] a date does not wrap to a second line (row is ${Math.round(rowH)}px)`);
      if (name === 'phone') {
        const sc = page.locator('main table >> xpath=ancestor::div[contains(@class,"overflow-auto")][1]').first();
        await sc.evaluate((el) => { el.scrollLeft = 400; });
        await page.waitForTimeout(250);
        const pos = await page.evaluate(() => {
          const row = document.querySelector('[data-anchor-row]');
          const rn = row.children[0].getBoundingClientRect();
          const desc = row.children[2].getBoundingClientRect();
          const th = document.querySelectorAll('main table thead th')[2].getBoundingClientRect();
          return { rnLeft: rn.left, rnRight: rn.right, descLeft: desc.left, descRight: desc.right, thLeft: th.left, descText: row.children[2].innerText.trim() };
        });
        check(Math.abs(pos.descLeft - pos.rnRight) <= 1.5, `[phone] Description stays pinned next to the row number while scrolling sideways (${Math.round(pos.descLeft)} vs ${Math.round(pos.rnRight)})`);
        check(Math.abs(pos.thLeft - pos.descLeft) <= 1.5, `[phone] its header stays aligned with it`);
        // Once actually scrolled (sticky engaged), the two pinned columns together must not eat
        // the whole phone width: enough should stay visible to still show the next column.
        const pinned = pos.descRight - pos.rnLeft;
        check(pinned <= 210, `[phone] the pinned row-number + Description columns leave room for the rest of the sheet while scrolled (pinned width ${Math.round(pinned)}px of ${vp.width}px)`);
        await sc.evaluate((el) => { el.scrollLeft = 0; });
      }
      // The Today badge only says "Today" when the chosen date actually is today.
      const anchorBadge = (await page.locator('[data-anchor-row]').innerText()).includes('Today');
      check(anchorBadge, `[${name}] Excel's anchor row is labelled Today when the reference date is today`);
      await ctx.close();
    }
  }
  await browser.close();
  console.log(failed ? `\n${failed} FAIL` : '\nALL PASS');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(2);
});
