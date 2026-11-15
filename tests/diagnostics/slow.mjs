import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6800);
const t0 = Date.now();
await page.click('#scrollCue');
let done = null; const rows = [];
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(400);
  const s = await page.evaluate(() => ({ y: Math.round(scrollY), m: +window.__field.state.m.toFixed(2), ui: +(+getComputedStyle(document.documentElement).getPropertyValue('--ui')).toFixed(2) }));
  rows.push(`${((Date.now() - t0) / 1000).toFixed(1)}s y=${s.y} morph=${s.m} ui=${s.ui}`);
  if (done === null && s.m === 0 && s.ui === 1 && s.y > 1100) done = ((Date.now() - t0) / 1000).toFixed(1);
}
console.log(rows.filter((_, i) => i % 3 === 0).join('\n'));
console.log('click: morph + page fade complete after ~' + done + 's (was ~1.7s)');
// manual wheel: how far must a visitor scroll before the crystal has formed?
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(2500);
const marks = [];
for (const f of [0.15, 0.3, 0.6, 0.9, 1.2, 1.5]) { await page.evaluate((y) => window.scrollTo(0, y), Math.round(f * 800)); await page.waitForTimeout(1400); marks.push(await page.evaluate((ff) => `${ff} screens: morph=${window.__field.state.m.toFixed(2)} (7=name -> 5=crystal) ui=${(+getComputedStyle(document.documentElement).getPropertyValue('--ui')).toFixed(2)}`, f)); }
console.log(marks.join('\n'));
await b.close();
