import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await b.newContext({ viewport: { width: 1440, height: 800 } })).newPage();
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5200);
await page.evaluate(() => window.scrollTo(0, 560));
await page.waitForTimeout(1800);
await page.screenshot({ path: 'tests/shots/marquee.png' });
await b.close();
