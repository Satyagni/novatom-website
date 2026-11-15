import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);
console.log(JSON.stringify(await page.evaluate(() => ({ tier: window.__tier, canvas: getComputedStyle(document.getElementById('gl')).display }))));
await page.screenshot({ path: 'tests/shots/fallback-software.png' });
await b.close();
