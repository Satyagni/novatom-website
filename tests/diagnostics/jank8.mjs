import { chromium } from 'playwright';
const variants = { base: '', nowc: 'html.has-opener .nav,html.has-opener .rail,html.has-opener .hero-copy{will-change:auto!important}', nograin: '.grain{display:none!important}', noblend: '.grain{mix-blend-mode:normal!important}', hideact: '.hero-actions{visibility:hidden!important}', hidebtn: '.hero-actions .btn{visibility:hidden!important}', hidelink: '.hero-actions a:not(.btn){visibility:hidden!important}', hideeyebrow: '.hero-copy > *:not(h1):not(.lede):not(.hero-actions){visibility:hidden!important}', hidehero: '.hero-copy{visibility:hidden!important}', hidenav: '.nav{visibility:hidden!important}', hiderail: '.rail{visibility:hidden!important}', hideh1: '.hero-copy h1{visibility:hidden!important}', hidelede: '.hero-copy .lede{visibility:hidden!important}' };
const only = process.argv.slice(2);
for (const [name, css] of Object.entries(variants)) {
  if (only.length && !only.includes(name)) continue;
  const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await (await b.newContext({ viewport: { width: 1440, height: 800 } })).newPage();
  if (css) await page.addInitScript((c) => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }); }, css);
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  await page.evaluate(() => { window.__d = []; let l = performance.now(); const f = (t) => { window.__d.push(t - l); l = t; window.__r = requestAnimationFrame(f); }; window.__r = requestAnimationFrame(f); });
  await page.mouse.click(700, 300);
  await page.waitForTimeout(5500);
  const d = await page.evaluate(() => { cancelAnimationFrame(window.__r); return window.__d.slice(3); });
  console.log(name.padEnd(9), 'max', Math.round(Math.max(...d)) + 'ms', ' >50ms:', d.filter((x) => x > 50).length);
  await b.close();
}
