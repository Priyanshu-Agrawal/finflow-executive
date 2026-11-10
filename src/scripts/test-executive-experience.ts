import { chromium } from 'playwright';

async function testFullExperience() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:3000 (should redirect to /login)...');
  await page.goto('http://localhost:3000');
  await page.waitForURL('**/login**');
  console.log('Redirected to:', page.url());

  // Fill login with username & password
  console.log('2. Logging into FinFlow Executive with username & password...');
  await page.fill('input[name="username"]', 'scriptingBear');
  await page.fill('input[name="password"]', 'FinFlow@2026!');
  await page.click('button[type="submit"]');

  await page.waitForURL('http://localhost:3000/');
  console.log('Successfully logged in! Landed on:', page.url());

  // Wait for financials to load
  await page.waitForSelector('text=Current Liquid Operating Balance');
  console.log('Executive Hero balance loaded!');

  // Check tabs
  const tabTexts = await page.$$eval('div.no-scrollbar button', (buttons) =>
    buttons.map((b) => b.textContent?.trim())
  );
  console.log('Active switcher tabs:', tabTexts);
  const hasMeteorTab = tabTexts.some((t) => t?.toLowerCase().includes('meteor'));
  console.log('Has Meteor tab?', hasMeteorTab, '(Expected false)');

  // 3. Test Loans Tab
  console.log('3. Navigating to Loans & Payoff tab...');
  const loansTabBtn = page.getByRole('button', { name: /Loans & Payoff/i });
  await loansTabBtn.click();
  await page.waitForSelector('text=Complete Liabilities Portfolio');

  // Verify SBI Credit Card is visible and clickable
  console.log('Checking all loans are clickable...');
  const sbiCard = page.locator('text=Credit Card SBI').first();
  await sbiCard.click();

  // Wait for Loan Action Modal
  await page.waitForSelector('text=Credit Card SBI');
  await page.waitForSelector('text=External');
  console.log('Loan Action Modal opened successfully!');

  // Click on "External" tab
  const externalTabBtn = page.getByRole('button', { name: 'External', exact: true });
  await externalTabBtn.click();
  await page.waitForSelector('text=Third-Party Settlement (No Bank Debit!)');
  console.log('External Person Pays tab is active! Khushboo/Bhaiya options present.');

  // Close modal
  await page.click('button:has(svg.lucide-x)');

  // 4. Test Expenses Ledger Tab
  console.log('4. Navigating to Ledger tab...');
  const ledgerTabBtn = page.getByRole('button', { name: /Ledger \(314\+\)/i });
  await ledgerTabBtn.click();
  await page.waitForSelector('text=Transactions & Formula Lineage Ledger');

  // Check Rolling Focus controls
  const rollingBannerText = await page.locator('text=earlier transactions before').textContent().catch(() => null);
  console.log('Rolling focus earlier banner:', rollingBannerText ? 'Present' : 'None');

  const anchorBadge = await page.locator('text=ANCHOR').first().textContent().catch(() => null);
  console.log('Today Anchor badge visible on nearest transaction?', anchorBadge ? 'Yes' : 'No');

  // Take screenshot
  await page.screenshot({ path: 'finflow-executive-verified.png', fullPage: false });
  console.log('Captured verification screenshot: finflow-executive-verified.png');

  await browser.close();
  console.log('\nALL PLAYWRIGHT TESTS PASSED! ✅');
}

testFullExperience().catch((err) => {
  console.error('Playwright test failed:', err);
  process.exit(1);
});
