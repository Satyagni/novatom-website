import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const [path, id] of [['/nexcon', 'inverse'], ['/about', 'team'], ['/nexcon', 'nexcon'], ['/products', 'catalog']]) {
  const page = await (await b.newContext({ viewport: { width: 1440, height: 800 } })).newPage();
  await page.goto('http://127.0.0.1:4173' + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  console.log(path, id, await page.evaluate((id) => {
    const el = document.getElementById(id); const top = el.getBoundingClientRect().top + scrollY;
    let min = 1e9, max = 0;
    el.querySelectorAll('h1,h2,h3,p,li,tr,figure,table,dl,svg,.recipe,.k-grid').forEach((c) => { const r = c.getBoundingClientRect(); if (r.height < 4) return; min = Math.min(min, r.top + scrollY - top); max = Math.max(max, r.bottom + scrollY - top); });
    return { secH: el.offsetHeight, contentTop: Math.round(min), contentBottom: Math.round(max) };
  }, id));
}
await b.close();
