import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await b.newContext({ viewport: { width: 1440, height: 800 } })).newPage();
await page.goto('http://127.0.0.1:4173/nexcon', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.evaluate(() => document.querySelectorAll('#rail a')[1].click());
for (const t of [2500, 4000, 6500]) { await page.waitForTimeout(t === 2500 ? 2500 : t - (t === 4000 ? 2500 : 4000)); console.log(t, await page.evaluate(() => [...document.querySelectorAll('#recipe > div')].map((r) => (+getComputedStyle(r).opacity).toFixed(2)).join(' '))); }
await b.close();
