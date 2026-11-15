import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11'] });
for (const w of [320, 375]) {
  const page = await b.newPage({ viewport: { width: w, height: 800 } });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const r = await page.evaluate((w) => {
    const out = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== 'fixed') out.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : '').toString().split(' ')[0]} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    });
    return { sw: document.documentElement.scrollWidth, list: out.slice(0, 14) };
  }, w);
  console.log(w, JSON.stringify(r, null, 1));
  await page.close();
}
await b.close();
