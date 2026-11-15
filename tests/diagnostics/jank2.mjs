// Which of the three chrome elements stalls the first frame they become visible?
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const [sel, extra] of [['.hero-copy', 'translateY(20px)'], ['.hero-copy', 'none'], ['.nav', ''], ['.rail', '']]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6500);
  const worst = await page.evaluate(([sel, extra]) => new Promise((res) => {
    let last = performance.now(), mx = 0, n = 0;
    const el = document.querySelector(sel);
    const loop = (t) => {
      if (n > 3) mx = Math.max(mx, t - last);
      last = t; n++;
      if (n === 30) el.style.opacity = '0.5'; if (extra) el.style.transform = extra;
      if (n < 70) requestAnimationFrame(loop); else res(Math.round(mx));
    };
    requestAnimationFrame(loop);
  }), [sel, extra]);
  console.log(sel, extra, 'worst frame after revealing:', worst + 'ms');
  await ctx.close();
}
await b.close();
