import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const [name, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:4173/technology', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5200);
  await page.screenshot({ path: `tests/shots/tech-${name}-1.png` });
  await page.click('.packtab[data-pack="1"]'); await page.waitForTimeout(1600);
  await page.screenshot({ path: `tests/shots/tech-${name}-2.png` });
  const g = await page.evaluate(() => window.__geo);
  await page.evaluate((y) => window.scrollTo(0, y), g.ledger.top + (name === 'desktop' ? 500 : 60)); await page.waitForTimeout(2600);
  await page.screenshot({ path: `tests/shots/tech-${name}-3.png` });
  console.log(name, 'errors:', errs.join(' | ') || 'none');
  await ctx.close();
}
await b.close();
