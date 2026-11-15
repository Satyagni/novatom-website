import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(7000);
await page.evaluate(() => { document.getElementById('cursor') && (document.getElementById('cursor').style.display = 'none'); });
await page.screenshot({ path: 'public/og.png' });
await b.close();
