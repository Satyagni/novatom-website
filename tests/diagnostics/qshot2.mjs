import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const [name, vp, mobile] of [['desktop', { width: 1440, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  await page.evaluate(() => document.getElementById('qband').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => [...document.querySelectorAll('#qlist li')].some((li) => parseFloat(getComputedStyle(li).opacity) > 0.98), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `tests/shots/qband-hollow-${name}.png` });
  await ctx.close();
}
await b.close();
