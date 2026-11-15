import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const pages = ['/', '/technology', '/products', '/nexcon', '/kronig', '/about', '/contact'];
const VH = 800;
for (const path of pages) {
  const page = await (await b.newContext({ viewport: { width: 1440, height: VH } })).newPage();
  await page.goto('http://127.0.0.1:4173' + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6500);
  if (path === '/') { await page.mouse.click(700, 300); await page.waitForTimeout(4800); }
  const names = await page.evaluate(() => [...document.querySelectorAll('#rail a')].map((a) => a.textContent + '|' + a.getAttribute('href')));
  console.log('\n' + path, '-', names.length, 'dots');
  for (let i = 0; i < names.length; i++) {
    await page.evaluate((i) => document.querySelectorAll('#rail a')[i].click(), i);
    await page.waitForTimeout(3300);
    const r = await page.evaluate((i) => {
      const a = document.querySelectorAll('#rail a')[i]; const el = document.getElementById(a.getAttribute('href').slice(1));
      const vh = innerHeight; const bb = el.getBoundingClientRect();
      const h = el.querySelector('h1, h2'); const hb = h && h.getBoundingClientRect();
      // lowest content element inside the section that is actually painted
      let lowest = 0; el.querySelectorAll('*').forEach((c) => { const r = c.getBoundingClientRect(); const cs = getComputedStyle(c); if (r.height > 4 && r.width > 4 && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.top < vh * 1.5 && r.top > -vh) lowest = Math.max(lowest, r.bottom); });
      const on = [...document.querySelectorAll('#rail a')].findIndex((x) => x.classList.contains('is-on'));
      const s = window.__field.state;
      return { y: Math.round(scrollY), secTop: Math.round(bb.top), secH: Math.round(bb.height), head: hb ? [Math.round(hb.top), Math.round(hb.bottom)] : null, activeDot: on, atBottom: Math.round(scrollY + vh) >= document.documentElement.scrollHeight - 2, st: `${s.a}>${s.b} m${s.m.toFixed(2)}` };
    }, i);
    const tag = path === '/' ? 'home' : path.slice(1);
    await page.screenshot({ path: `tests/shots/dots-${tag}-${i}.png` });
    console.log(`  ${i} ${names[i].split('|')[0].padEnd(22)} ${JSON.stringify(r)}`);
  }
  await page.context().close();
}
await b.close();
