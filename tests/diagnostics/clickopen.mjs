// Click-to-enter opener: timing, frames, replay button, and the no-drift check.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6800);
const snap = () => page.evaluate(() => { const s = window.__field.state; return { y: Math.round(scrollY), a: s.a, b: s.b, m: +s.m.toFixed(2), ui: +(+getComputedStyle(document.documentElement).getPropertyValue('--ui')).toFixed(2), lock: document.documentElement.classList.contains('opener-lock'), rot: +s.rot.toFixed(2) }; });
console.log('name screen:', JSON.stringify(await snap()));
await page.screenshot({ path: 'tests/shots/click-0-name.png' });
// fake a long session: the old bug let the slow spin grow with time and tilt the name
await page.evaluate(() => { window.__clockSkew = 1; });
await page.mouse.click(700, 300);
const t0 = Date.now();
const marks = [300, 900, 1700, 2600, 3600, 4800, 6200];
for (let i = 0; i < marks.length; i++) {
  await page.waitForTimeout(Math.max(0, marks[i] - (Date.now() - t0)));
  console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(await snap()));
  await page.screenshot({ path: `tests/shots/click-m${i + 1}.png` });
}
// replay from the floating button
console.log('replay button visible:', await page.evaluate(() => { const r = document.querySelector('.replay'); const cs = getComputedStyle(r); return cs.display !== 'none' && +cs.opacity > 0.3; }));
await page.click('.replay');
await page.waitForTimeout(1500);
console.log('rewinding:', JSON.stringify(await snap()));
await page.screenshot({ path: 'tests/shots/replay-mid.png' });
await page.waitForTimeout(2600);
console.log('back on name screen:', JSON.stringify(await snap()));
await page.screenshot({ path: 'tests/shots/replay-name.png' });
await page.mouse.click(600, 400);
await page.waitForTimeout(6500);
console.log('re-entered:', JSON.stringify(await snap()));
console.log('errors:', errs.join('|') || 'none');
await b.close();
