import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const variants = { harmless: '.zzz{color:red}', base: '', harmless2: '.zzz{color:red}', nograin: '.grain{display:none!important}', nowc: 'html.has-opener .nav,html.has-opener .rail,html.has-opener .hero-copy{will-change:auto!important}', novig: '.vignette{display:none!important}', nocursor: '.cursor-dot,.cursor-ring{display:none!important}', nofield: '#gl{display:none!important}' };
for (const [name, css] of Object.entries(variants)) {
  const page = await (await b.newContext({ viewport: { width: 1440, height: 800 } })).newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { window.__d = []; let l = performance.now(); const f = (t) => { window.__d.push(t - l); l = t; window.__r = requestAnimationFrame(f); }; window.__r = requestAnimationFrame(f); });
  await page.mouse.click(700, 300);
  await page.waitForTimeout(5500);
  const d = await page.evaluate(() => { cancelAnimationFrame(window.__r); return window.__d.slice(3); });
  console.log(name.padEnd(9), 'max', Math.round(Math.max(...d)) + 'ms', ' >50ms:', d.filter((x) => x > 50).length);
  await page.context().close();
}
await b.close();
