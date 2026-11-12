// One-off: renders the FinFlow app icons with Playwright + system Chrome.  node src/scripts/make-icons.cjs
const { chromium } = require('playwright');
const path = require('path');

const svg = (n) => `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0B0B0C"/>
  <g fill="#F59E0B"><rect x="170" y="140" width="56" height="232" rx="8"/><rect x="170" y="140" width="180" height="56" rx="8"/><rect x="170" y="236" width="150" height="52" rx="8"/></g>
</svg>`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const out = path.join(__dirname, '../../public/icons');
  for (const [file, n] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const page = await browser.newPage({ viewport: { width: n, height: n } });
    await page.setContent(`<body style="margin:0">${svg(n)}</body>`);
    await page.screenshot({ path: path.join(out, file), clip: { x: 0, y: 0, width: n, height: n } });
    await page.close();
  }
  await browser.close();
})();
