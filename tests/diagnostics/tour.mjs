import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const fileUrl = (f) => f.split(path.sep).join('/');
const url = 'http://127.0.0.1:4173/';
const mode = process.argv[2] || 'desktop';
const vp = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const outDir = path.resolve('tests/shots', mode);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: mode === 'mobile', isMobile: mode === 'mobile' });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() !== 'log') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(3200);

const geo = await page.evaluate(() => JSON.parse(JSON.stringify(window.__geo)));
const vh = vp.height;
const shots = [];
async function at(name, y, wait = 1500) {
  await page.evaluate((v) => window.scrollTo(0, v), Math.round(y));
  await page.waitForTimeout(wait);
  const f = path.join(outDir, `${String(shots.length).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  shots.push({ name, f });
}

const loopRange = geo.loop.h - vh;
await at('hero', 0);
await at('space-a', geo.space.top + 0.15 * (geo.space.h - vh));
await at('space-b', geo.space.top + 0.85 * (geo.space.h - vh));
for (const lp of [0.12, 0.30, 0.50, 0.66, 0.80, 0.97]) await at(`loop-${Math.round(lp * 100)}`, geo.loop.top + lp * loopRange, 2200);
await at('ledger-a', geo.ledger.top + 0.25 * (geo.ledger.h - vh), 2000);
await at('ledger-b', geo.ledger.top + 0.75 * (geo.ledger.h - vh), 2000);
await at('nexcon', geo.nexcon.top + (geo.nexcon.h - vh) / 2, 2000);
await page.click('.mat[data-mat="2"]'); await page.waitForTimeout(2200);
await at('nexcon-sic', geo.nexcon.top + (geo.nexcon.h - vh) / 2, 800);
await page.click('.mat[data-mat="3"]'); await page.waitForTimeout(2200);
await at('nexcon-hfo2', geo.nexcon.top + (geo.nexcon.h - vh) / 2, 800);
await page.click('.mat[data-mat="1"]'); await page.waitForTimeout(2200);
await at('nexcon-algan', geo.nexcon.top + (geo.nexcon.h - vh) / 2, 800);
await at('inverse', geo.inverse.top + 0.1 * vh, 4500);
await at('kronig-a', geo.kronig.top, 1800);
await at('kronig-b', geo.kronig.top + 0.9 * vh, 2400);
await at('kronig-c', geo.kronig.top + 1.8 * vh, 2400);
await at('roadmap', geo.roadmap.top, 2500);
await at('miles', geo.roadmap.top + geo.roadmap.h - 1.1 * vh, 2500);
await at('whynow', geo.whynow.top, 3000);
await at('interlude', geo.interlude.top + 0.5 * (geo.interlude.h - vh), 2500);
await at('team', geo.team.top, 1500);
await at('contact', geo.contact.top, 1500);
await at('footer', geo.page, 1200);

console.log(logs.join('\n') || 'no console warnings/errors');
console.log(`captured ${shots.length} shots in ${outDir}`);

// contact sheet(s)
const cols = mode === 'mobile' ? 6 : 3;
const per = mode === 'mobile' ? 12 : 9;
const cw = mode === 'mobile' ? 230 : 640;
for (let i = 0; i * per < shots.length; i++) {
  const group = shots.slice(i * per, (i + 1) * per);
  const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:6px;padding:6px;font:12px sans-serif;color:#fff">` +
    group.map((s) => `<figure style="margin:0"><img style="width:${cw}px;display:block" src="file:///${fileUrl(s.f)}"><figcaption>${s.name}</figcaption></figure>`).join('') + '</body>';
  const sheetPage = await ctx.newPage();
  await sheetPage.setViewportSize({ width: cols * (cw + 6) + 6, height: 400 });
  fs.writeFileSync(path.join(outDir, 'sheet.html'), html);
  await sheetPage.goto('file:///' + path.join(outDir, 'sheet.html').split(path.sep).join('/'));
  await sheetPage.waitForTimeout(500);
  await sheetPage.screenshot({ path: path.join(outDir, `sheet-${i + 1}.png`), fullPage: true });
  await sheetPage.close();
}
await browser.close();
