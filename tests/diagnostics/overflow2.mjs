import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11'] });
const page = await b.newPage({ viewport: { width: 320, height: 800 } });
await page.goto('http://127.0.0.1:4173/technology', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);
const r = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('main *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > 321 && !el.closest('.ledger')) out.push(`${el.tagName.toLowerCase()}.${String(el.className && el.className.baseVal === undefined ? el.className : '').split(' ')[0]} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
  });
  return { sw: document.documentElement.scrollWidth, list: out.slice(0, 12) };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
// software errors
const s = await (await import('playwright')).chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu'] });
const p2 = await s.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p2.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(`[${m.type()}] ${m.text().slice(0, 200)}`); });
await p2.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(4500);
console.log('software console:', errs.join('\n') || 'none');
await s.close();
