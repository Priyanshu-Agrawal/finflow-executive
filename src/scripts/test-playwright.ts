import { chromium } from 'playwright';
import path from 'path';

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
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Scroll directly to the Budget Burn section
  await mobilePage.evaluate(() => {
    window.scrollTo({ top: 1100, behavior: 'instant' });
  });
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({
    path: path.join(process.cwd(), 'public', 'screenshot-mobile-budget-engine.png'),
    fullPage: false,
  });
  console.log('Mobile Budget Engine screenshot captured');

  await browser.close();
}

main().catch(console.error);
