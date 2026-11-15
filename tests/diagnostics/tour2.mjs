// Visual tour of the multi-page site: scroll sequence on Home, each page, and a mid-transition frame.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:4173';
const mode = process.argv[2] || 'desktop';
const vp = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const out = path.resolve('tests/shots', 'v2-' + mode);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const fileUrl = (f) => f.split(path.sep).join('/');

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mode === 'mobile', hasTouch: mode === 'mobile' });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

const shots = [];
async function snap(name, wait = 0) {
  if (wait) await page.waitForTimeout(wait);
  const f = path.join(out, `${String(shots.length).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  shots.push({ name, f });
}
async function at(name, y, wait = 1600) {
  await page.evaluate((v) => window.scrollTo(0, v), Math.round(y));
  await snap(name, wait);
}

// ---- loader sequence
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await snap('load-a', 500);
await snap('load-b', 900);
await snap('load-c', 700);
await snap('hero-in', 900);
await page.waitForTimeout(2500);
await snap('hero');

const geo = await page.evaluate(() => JSON.parse(JSON.stringify(window.__geo)));
const vh = vp.height;
const spaceRange = geo.space.h - vh;
await at('hero-scroll', geo.space.top * 0.6);
for (const sp of [0.12, 0.3, 0.5, 0.62, 0.75, 0.95]) await at(`space-${Math.round(sp * 100)}`, geo.space.top + sp * spaceRange, 1800);
const loopRange = geo.loop.h - vh;
for (const lp of [0.2, 0.45, 0.62, 0.8, 0.98]) await at(`loop-${Math.round(lp * 100)}`, geo.loop.top + lp * loopRange, 2000);
await at('explore', geo.explore.top + 0.3 * vh, 2200);
await at('footer', geo.page, 1500);

// ---- a transition caught mid-wipe
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
const link = mode === 'mobile' ? null : page.locator('.nav-links a[href="/materials"]');
if (link) {
  await link.click();
  await page.waitForTimeout(330);
  await snap('transition-mid');
  await page.waitForTimeout(2600);
}

// ---- other pages
for (const p of ['technology', 'materials', 'devices', 'company', 'contact']) {
  await page.goto(`${BASE}/${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4200);
  await snap(`${p}-top`);
  const g = await page.evaluate(() => JSON.parse(JSON.stringify(window.__geo)));
  const ids = Object.keys(g.sections || {});
  const pick = ids.slice(0, 4);
  for (const id of pick.slice(1)) await at(`${p}-${id}`, g.sections[id].top + 80, 1800);
}

console.log(logs.join('\n') || 'no console warnings/errors');
console.log(`captured ${shots.length} shots`);

const cols = mode === 'mobile' ? 7 : 4;
const cw = mode === 'mobile' ? 200 : 440;
const per = mode === 'mobile' ? 14 : 12;
for (let i = 0; i * per < shots.length; i++) {
  const group = shots.slice(i * per, (i + 1) * per);
  const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:4px;padding:4px;font:11px sans-serif;color:#9ab">` +
    group.map((s) => `<figure style="margin:0"><img style="width:${cw}px;display:block" src="file:///${fileUrl(s.f)}"><figcaption>${s.name}</figcaption></figure>`).join('') + '</body>';
  const hp = path.join(out, `sheet-${i + 1}.html`);
  fs.writeFileSync(hp, html);
  const sp = await ctx.newPage();
  await sp.setViewportSize({ width: cols * (cw + 4) + 4, height: 300 });
  await sp.goto('file:///' + fileUrl(hp));
  await sp.waitForTimeout(500);
  await sp.screenshot({ path: path.join(out, `sheet-${i + 1}.png`), fullPage: true });
  await sp.close();
}
await browser.close();
