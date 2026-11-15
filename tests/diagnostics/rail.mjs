import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await b.newContext({ viewport: { width: 1440, height: 800 } })).newPage();
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6800);
await page.mouse.click(700, 300);
await page.waitForTimeout(5200);
const n = await page.evaluate(() => document.querySelectorAll('#rail a').length);
for (let i = 0; i < n; i++) {
  await page.evaluate((i) => document.querySelectorAll('#rail a')[i].click(), i);
  await page.waitForTimeout(3200);
  const r = await page.evaluate((i) => {
    const a = document.querySelectorAll('#rail a')[i]; const id = a.getAttribute('href').slice(1); const el = document.getElementById(id); const bb = el.getBoundingClientRect();
    const s = window.__field.state; const g = window.__geo.sections && window.__geo.sections[id];
    return { id, y: Math.round(scrollY), top: Math.round(bb.top), h: Math.round(bb.height), geoTop: g && Math.round(g.top), state: `${s.a}>${s.b} m=${s.m.toFixed(2)}`, on: [...document.querySelectorAll('#rail a')].findIndex((x) => x.classList.contains('is-on')) };
  }, i);
  console.log(i, JSON.stringify(r));
  await page.screenshot({ path: `tests/shots/rail-${i}.png` });
}
await b.close();
