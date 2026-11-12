import { chromium } from 'playwright';

// Run: npx tsx --env-file=.env.local src/scripts/test-lan-mobile-login.ts
async function main() {
  console.log('--- TESTING LAN IP MOBILE AUTHENTICATION ---');
  const targetUrl = (process.env.BASE || 'http://10.95.71.75:3000').replace(/\/$/, ''); // BASE=http://localhost:3007 to test a build on another port

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  // Emulate an iPhone 14 Pro mobile device
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await mobileContext.newPage();

  console.log(`Navigating to ${targetUrl}/login on simulated iPhone...`);
  await page.goto(`${targetUrl}/login`, { waitUntil: 'networkidle' });

  // Verify username and password
  const usernameInput = page.locator('input[name="username"]');
  const passwordInput = page.locator('input[name="password"]');
  await usernameInput.fill(process.env.AUTH_USERNAME ?? '');
  await passwordInput.fill(process.env.AUTH_PASSWORD ?? '');

  console.log('Submitting credentials over LAN HTTP...');
  await page.click('button[type="submit"]');

  // Verify that it redirects to dashboard without getting stuck on "Verifying Session..."
  console.log('Waiting for navigation to dashboard...');
  await page.waitForURL(`${targetUrl}/`, { timeout: 10000 });
  await page.waitForSelector('text=Balance now', { timeout: 15000 });
  console.log('SUCCESS! Navigated to dashboard on LAN IP mobile device!');

  // Check the stored cookies
  const cookies = await mobileContext.cookies();
  const accessCookie = cookies.find(c => c.name === 'finflow_access_token');
  const refreshCookie = cookies.find(c => c.name === 'finflow_refresh_token');

  console.log('Cookie verification:');
  console.log('- finflow_access_token stored:', Boolean(accessCookie));
  console.log('- access_token secure flag:', accessCookie?.secure);
  console.log('- finflow_refresh_token stored:', Boolean(refreshCookie));
  console.log('- refresh_token secure flag:', refreshCookie?.secure);

  if (!accessCookie || accessCookie.secure) {
    throw new Error('Access cookie was either not stored or inappropriately marked secure on HTTP!');
  }

  // Refresh page on LAN mobile to ensure session persists cleanly
  console.log('Testing session persistence across page reload...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('text=Balance now', { timeout: 10000 });
  console.log('Session successfully persisted on mobile device over LAN IP!');

  await browser.close();
  console.log('--- LAN MOBILE AUTH TEST PASSED 100% ---');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
