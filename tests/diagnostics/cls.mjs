import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const [label, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(3), src: (e.sources || []).map((s) => { const n = s.node; return n ? `${n.nodeName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : ''}` : '?'; }) }); }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  const s = await page.evaluate(() => window.__shifts);
  console.log(label, 'total', s.reduce((a, x) => a + x.v, 0).toFixed(3));
  s.forEach((x) => console.log('  ', x.t + 'ms', x.v, x.src.join(', ')));
  await ctx.close();
}
await b.close();
