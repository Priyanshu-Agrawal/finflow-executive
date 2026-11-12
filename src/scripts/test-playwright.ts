// Run: npx tsx --env-file=.env.local src/scripts/test-playwright.ts   (BASE and SHOT_DIR are optional)
import { chromium } from 'playwright';
import path from 'path';

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '');
const SHOT_DIR = process.env.SHOT_DIR || path.join(process.cwd(), 'public');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.request.post(`${BASE}/api/auth/login`, { data: { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE}/budget`, { waitUntil: 'networkidle' });

  // The Budget page (needs a signed-in session: pass cookies via the browser profile or sign in first)
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({
    path: path.join(SHOT_DIR, 'screenshot-mobile-budget-engine.png'),
    fullPage: false,
  });
  console.log('Mobile Budget Engine screenshot captured');

  await browser.close();
}

main().catch(console.error);
