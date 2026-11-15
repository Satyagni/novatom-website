// Attribute the stall with the Long Animation Frames API.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(7000);
await page.evaluate((v) => { window.__nobonds = v; }, process.argv[2] === 'nobonds');
await page.evaluate(() => {
  window.__loaf = [];
  if (location.search.includes('x')) {}
  if (window.__nobonds) window.__field._drawBonds = () => {};
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push({ t: Math.round(e.startTime), dur: Math.round(e.duration), block: Math.round(e.blockingDuration), render: Math.round(e.renderStart - e.startTime), style: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0), scripts: e.scripts.map((s) => `${s.invoker || s.sourceFunctionName}:${Math.round(s.duration)}`).join(' | ') }); } ).observe({ type: 'long-animation-frame', buffered: false });
  window.__t0 = performance.now();
});
await page.waitForTimeout(+(process.argv[3] || 0));
console.log('click at', await page.evaluate(() => Math.round(performance.now() - window.__t0)));
await page.mouse.click(700, 300);
await page.waitForTimeout(6500);
const r = await page.evaluate(() => ({ loaf: window.__loaf, t0: Math.round(window.__t0) }));
console.log('t0', r.t0);
r.loaf.forEach((e) => console.log(JSON.stringify(e)));
await b.close();
