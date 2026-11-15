// What the wordmark opener looks like at a few scroll positions (desktop and phone).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const shots = [];
for (const [name, vp, mobile] of [['desktop', { width: 1440, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6500);
  const info = await page.evaluate(() => ({ opener: document.documentElement.classList.contains('has-opener'), ui: getComputedStyle(document.documentElement).getPropertyValue('--ui'), a: window.__field && window.__field.state.a, b: window.__field && window.__field.state.b, navOp: getComputedStyle(document.getElementById('nav')).opacity, navVis: getComputedStyle(document.getElementById('nav')).visibility }));
  console.log(name, 'at top:', JSON.stringify(info));
  for (const f of [0, 0.22, 0.45, 0.7, 1.0, 1.25]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(f * vp.height));
    await page.waitForTimeout(f === 0 ? 400 : 1700);
    const p = `tests/shots/opener-${name}-${Math.round(f * 100)}.png`;
    await page.screenshot({ path: p });
    shots.push({ p, label: `${name} ${Math.round(f * 100)}% of a screen` });
  }
  console.log(name, 'errors:', errs.join(' | ') || 'none');
  await ctx.close();
}
const cw = 460;
const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(6,${cw}px);gap:4px;padding:4px;font:11px sans-serif;color:#9ab">` + shots.map((s) => `<figure style="margin:0"><img style="width:${cw}px;display:block" src="file:///${path.resolve(s.p).split(path.sep).join('/')}"><figcaption>${s.label}</figcaption></figure>`).join('') + '</body>';
fs.writeFileSync('tests/shots/opener-sheet.html', html);
const sp = await b.newPage({ viewport: { width: 6 * (cw + 4) + 4, height: 300 } });
await sp.goto('file:///' + path.resolve('tests/shots/opener-sheet.html').split(path.sep).join('/'));
await sp.waitForTimeout(600);
await sp.screenshot({ path: 'tests/shots/opener-sheet.png', fullPage: true });
await b.close();
