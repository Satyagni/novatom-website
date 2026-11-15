// What does it look like on real laptop windows? Several viewport sizes and display scalings.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:4173';
const out = path.resolve('tests/shots/sizes');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const fileUrl = (f) => f.split(path.sep).join('/');
const configs = [
  { name: '1366x657@1', w: 1366, h: 657, dpr: 1 },
  { name: '1536x730@1.25', w: 1536, h: 730, dpr: 1.25 },
  { name: '1920x947@1', w: 1920, h: 947, dpr: 1 },
];
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const all = [];
for (const c of configs) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5200);
  const g = await page.evaluate(() => JSON.parse(JSON.stringify(window.__geo)));
  const shots = [];
  const snap = async (name, y, wait = 1700) => {
    if (y != null) await page.evaluate((v) => window.scrollTo(0, v), Math.round(y));
    await page.waitForTimeout(wait);
    const f = path.join(out, `${c.name}-${name}.png`);
    await page.screenshot({ path: f });
    shots.push({ name: `${c.name} ${name}`, f });
  };
  await snap('hero', null, 100);
  await snap('dive', g.space.top + 0.3 * (g.space.h - c.h));
  await snap('10^8', g.space.top + 0.95 * (g.space.h - c.h));
  await snap('loop3', g.loop.top + 0.6 * (g.loop.h - c.h), 2000);
  await snap('explore', g.explore.top + 0.3 * c.h);
  for (const p of ['technology', 'devices', 'contact']) {
    await page.goto(`${BASE}/${p}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4200);
    await snap(p, null, 100);
  }
  console.log(c.name, 'errors:', errs.join(' | ') || 'none');
  all.push(...shots);
  await ctx.close();
}
const cw = 600;
const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(4,${cw}px);gap:4px;padding:4px;font:11px sans-serif;color:#9ab">` + all.map((s) => `<figure style="margin:0"><img style="width:${cw}px;display:block" src="file:///${fileUrl(s.f)}"><figcaption>${s.name}</figcaption></figure>`).join('') + '</body>';
fs.writeFileSync(path.join(out, 'sheet.html'), html);
const sp = await browser.newPage({ viewport: { width: 4 * (cw + 4) + 4, height: 300 } });
await sp.goto('file:///' + fileUrl(path.join(out, 'sheet.html')));
await sp.waitForTimeout(700);
await sp.screenshot({ path: path.join(out, 'sheet.png'), fullPage: true });
await browser.close();
