// Frame pacing through the opener morph: rAF deltas plus the field's own point count / governor.
import { chromium } from 'playwright';
const tier = process.argv[2] || '';
const cpu = +(process.argv[3] || 1);
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } });
const page = await ctx.newPage();
if (cpu > 1) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
await page.goto('http://127.0.0.1:4173/' + (tier ? '?tier=' + tier : ''), { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(7000);
await page.evaluate(() => {
  window.__d = []; window.__n = [];
  let last = performance.now();
  const f = window.__field;
  const loop = (t) => { window.__d.push([+(t - last).toFixed(1), +performance.now().toFixed(0)]); window.__n.push(JSON.stringify([+f.state.m.toFixed(2), +f.state.scale.toFixed(2), +f.state.ripple.toFixed(2), document.documentElement.className, f.drawCount, f.count])); last = t; window.__raf = requestAnimationFrame(loop); };
  window.__raf = requestAnimationFrame(loop);
});
await page.mouse.click(700, 300);
await page.waitForTimeout(6500);
const r = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return { d: window.__d, n: window.__n, keys: Object.keys(window.__field).slice(0, 40) }; });
const ds = r.d.map((x) => x[0]).slice(2);
const sorted = [...ds].sort((a, c) => a - c);
console.log(`tier=${tier || 'auto'} cpu x${cpu}: frames=${ds.length} median=${sorted[Math.floor(ds.length / 2)]}ms p95=${sorted[Math.floor(ds.length * 0.95)]}ms max=${sorted[ds.length - 1]}ms  >25ms: ${ds.filter((x) => x > 25).length}  >50ms: ${ds.filter((x) => x > 50).length}`);
console.log('slowest frames:', r.d.map((x, i) => [x[0], i]).sort((a, c) => c[0] - a[0]).slice(0, 6).map((x) => `${x[0]}ms@frame${x[1]}`).join('  '));
const ns = [...new Set(r.n)];
const worst = r.d.map((x, i) => [x[0], i]).sort((a, c) => c[0] - a[0])[0][1];
for (let i = worst - 3; i <= worst + 2; i++) console.log(i, r.d[i][0] + 'ms', r.n[i]);
await b.close();
