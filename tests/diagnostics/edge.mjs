import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--window-position=-3000,0', '--window-size=1500,950'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 800 }, deviceScaleFactor: 1.25 });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text().slice(0, 220)}`); });
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
page.on('requestfailed', (r) => logs.push('[reqfailed] ' + r.url()));
await page.goto('http://127.0.0.1:4173/?debug', { waitUntil: 'domcontentloaded' });
for (const t of [600, 1800, 3500, 6500]) { await page.waitForTimeout(t === 600 ? 600 : 1500); await page.screenshot({ path: `tests/shots/edge-${t}.png` }); }
const info = await page.evaluate(() => ({
  ua: navigator.userAgent.slice(0, 90), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, hover: matchMedia('(hover:hover) and (pointer:fine)').matches,
  tier: window.__tier && { name: window.__tier.name, software: window.__tier.software, gpu: window.__tier.renderer }, field: !!window.__field,
  ready: document.documentElement.className, wipe: getComputedStyle(document.getElementById('wipe')).display, canvasOpacity: document.getElementById('gl').style.opacity,
  scrollH: document.documentElement.scrollHeight, h1vis: getComputedStyle(document.querySelector('h1')).visibility,
}));
console.log(JSON.stringify(info, null, 1));
// move the mouse and scroll like a person
await page.mouse.move(700, 400); await page.mouse.move(900, 450, { steps: 12 });
await page.mouse.wheel(0, 900); await page.waitForTimeout(1500);
await page.mouse.wheel(0, 1600); await page.waitForTimeout(1800);
await page.screenshot({ path: 'tests/shots/edge-scrolled.png' });
console.log(JSON.stringify(await page.evaluate(() => ({ y: Math.round(scrollY), state: window.__field && { a: window.__field.state.a, b: window.__field.state.b, m: +window.__field.state.m.toFixed(2), scale: +window.__field.state.scale.toFixed(2) }, ema: window.__field && Math.round(window.__field.ema) }))));
console.log('LOGS:\n' + (logs.join('\n') || 'none'));
await browser.close();
