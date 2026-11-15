import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu'] });
for (const t of ['low', 'mid', 'high']) {
  const page = await (await b.newContext({ viewport: { width: 1366, height: 700 } })).newPage();
  await page.goto(`http://127.0.0.1:4173/?tier=${t}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  const r = await page.evaluate(async (H) => {
    const fr = []; let last = performance.now(); const s0 = last;
    await new Promise((res) => { const f = (n) => { fr.push(n - last); last = n; window.scrollTo(0, Math.min(1, (n - s0) / 6000) * (H - innerHeight)); n - s0 < 6000 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
    const sorted = [...fr].sort((a, b) => a - b);
    return { fps: Math.round(1000 / (fr.reduce((a, b) => a + b, 0) / fr.length)), p95: Math.round(sorted[Math.floor(sorted.length * .95)]), worst: Math.round(sorted[sorted.length - 1]), dpr: window.__field.dpr, draw: window.__field.drawCount, off: window.__field.disabled };
  }, H);
  console.log('forced', t, 'on a software renderer:', JSON.stringify(r));
  await page.close();
}
await b.close();
