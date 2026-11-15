import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const [name, url] of [['dist', 'file:///C:/Development/NovAtom%20Labs/novatom-website/dist/index.html'], ['root', 'file:///C:/Development/NovAtom%20Labs/novatom-website/index.html']]) {
  const page = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  const errs = [];
  page.on('console', (m) => { if (['error'].includes(m.type())) errs.push(m.text().slice(0, 140)); });
  page.on('requestfailed', (r) => errs.push('FAILED ' + r.url().slice(-60)));
  await page.goto(url, { waitUntil: 'load' }).catch((e) => errs.push(e.message));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `tests/shots/file-${name}.png` });
  console.log(name, 'errors:', errs.slice(0, 5).join(' | ') || 'none');
  await page.close();
}
await b.close();
