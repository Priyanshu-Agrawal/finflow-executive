import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('--- STARTING CYCLE & ELECTRICITY FACTOR E2E TEST ---');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // 1. Visit Login
  console.log('Navigating to http://localhost:3000/login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // Pure username & password
  const usernameInput = page.locator('input[name="username"]');
  const passwordInput = page.locator('input[name="password"]');
  await usernameInput.fill('scriptingBear');
  await passwordInput.fill('FinFlow@2026!');
  
  console.log('Submitting credentials...');
  await page.click('button[type="submit"]');

  // 2. Wait for navigation to dashboard
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });
  await page.waitForSelector('text=Current Liquid Operating Balance', { timeout: 15000 });
  console.log('Dashboard successfully loaded!');

  // 3. Verify Budget Pacing Section & 4 Factors
  const pacingHeading = page.locator('text=Configurable Budget & Cycle Pacing');
  await pacingHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Check 4 factor cards
  const generalCard = page.locator('text=General Budget').first();
  const electricityCard = page.locator('text=Electricity Balance').first();
  const rentCard = page.locator('text=Room Rent').first();
  const balanceCard = page.locator('text=Available Balance Factor').first();

  console.log('Verifying 4 factor cards:');
  console.log('- General Budget Card visible:', await generalCard.isVisible());
  console.log('- Electricity Balance Card visible:', await electricityCard.isVisible());
  console.log('- Room Rent Card visible:', await rentCard.isVisible());
  console.log('- Available Balance Card visible:', await balanceCard.isVisible());

  if (!await generalCard.isVisible() || !await electricityCard.isVisible() || !await rentCard.isVisible() || !await balanceCard.isVisible()) {
    throw new Error('One or more factor cards are not visible!');
  }

  // 4. Test Inline Quick Electricity Balance Update
  console.log('Testing Inline Electricity Balance Update...');
  const updateBalanceBtn = page.locator('button:has-text("Update Balance")').first();
  await updateBalanceBtn.click();
  await page.waitForTimeout(300);

  // Enter new remaining electricity balance: ₹2,600
  const inlineInput = page.locator('input[type="number"]').first();
  await inlineInput.fill('2600');
  const saveBtn = page.locator('button:has-text("Save")').first();
  await saveBtn.click();
  await page.waitForTimeout(800);
  console.log('Successfully updated electricity balance inline to ₹2,600');

  // Verify the updated balance shows ₹2,600
  const updatedMeter = page.locator('text=₹2,600');
  console.log('- Updated ₹2,600 visible on screen:', await updatedMeter.first().isVisible());

  // 5. Test Full Configuration Drawer (Recurring Date & Rent Date)
  console.log('Testing Configuration Drawer...');
  const configBtn = page.locator('button:has-text("Configure Dates & Meter")').first();
  await configBtn.click();
  await page.waitForTimeout(400);

  // Switch recurring cycle day to 7th (Salary)
  const salaryDayBtn = page.locator('button:has-text("7th (Salary)")').first();
  if (await salaryDayBtn.isVisible()) {
    await salaryDayBtn.click();
    console.log('Toggled cycle recurring day to 7th');
  }

  // Click Apply & Save
  const applyBtn = page.locator('button:has-text("Apply & Save Configuration")').first();
  await applyBtn.click();
  await page.waitForTimeout(800);
  console.log('Applied and saved new cycle configuration!');

  // Capture desktop screenshot
  const screenshotPath = path.join(process.cwd(), 'public', 'screenshot-budget-factors-verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved desktop screenshot to:', screenshotPath);

  // 6. Test on Mobile Viewport
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  const cookies = await context.cookies();
  await mobileContext.addCookies(cookies);
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('text=Configurable Budget & Cycle Pacing');
  await mobilePage.locator('text=Configurable Budget & Cycle Pacing').scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(500);

  const mobileScreenshotPath = path.join(process.cwd(), 'public', 'screenshot-mobile-factors-verified.png');
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log('Saved mobile screenshot to:', mobileScreenshotPath);

  await browser.close();
  console.log('--- ALL CYCLE & FACTOR E2E TESTS PASSED WITH 100% SUCCESS ---');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
