// Click-through audit: every link and button on every page, nav hover, dropdown, scroll targets, copy checks.
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4173';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ROUTES = ['/', '/technology', '/products', '/nexcon', '/kronig', '/about', '/contact'];
const rows = []; const bad = [];
const log = (area, what, ok, detail = '') => { rows.push({ area, what, ok, detail }); if (!ok) bad.push(`${area}: ${what} ${detail}`); };

async function fresh(path = '/') {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3800);
  return { ctx, page, errs };
}

// 1. every internal link on every page resolves; every anchor target exists
for (const r of ROUTES) {
  const { ctx, page, errs } = await fresh(r);
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) })));
  const seen = new Set();
  for (const l of links) {
    if (seen.has(l.href)) continue; seen.add(l.href);
    if (l.href.startsWith('#')) { const ok = await page.evaluate((h) => !!document.querySelector(h), l.href); log(r, `anchor ${l.href}`, ok); }
    else if (l.href.startsWith('/')) { const res = await page.request.get(BASE + l.href.split('#')[0]); log(r, `link ${l.href} (${l.text})`, res.status() === 200, String(res.status())); }
  }
  log(r, 'no console errors on load', errs.length === 0, errs.join('|'));
  await ctx.close();
}

// 2. nav: hover keeps every label visible (the old roll-away bug), dropdown opens and stays open, items navigate
{
  const { ctx, page } = await fresh('/');
  for (const sel of ['.nav-links > a[href="/technology"]', '.nav-links .menu-trigger', '.nav-links > a[href="/about"]']) {
    await page.hover(sel); await page.waitForTimeout(500);
    const r = await page.evaluate((s) => { const el = document.querySelector(s); const bb = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { w: Math.round(bb.width), h: Math.round(bb.height), op: cs.opacity, vis: cs.visibility, txt: el.textContent.trim(), roll: !!el.querySelector('.roll'), overflow: cs.overflow }; }, sel);
    log('nav', `hover keeps "${r.txt}" visible`, r.w > 20 && r.h > 10 && r.op === '1' && r.vis === 'visible' && !r.roll && r.overflow !== 'hidden', JSON.stringify(r));
  }
  await page.hover('.nav-links .menu-trigger'); await page.waitForTimeout(500);
  const sub = await page.evaluate(() => { const s = document.querySelector('.submenu'); const cs = getComputedStyle(s); return { op: cs.opacity, vis: cs.visibility, items: [...s.querySelectorAll('a')].map((a) => a.textContent.trim()) }; });
  log('nav', 'Products dropdown opens on hover with NexCon-03 and Kronig', sub.op === '1' && sub.vis === 'visible' && sub.items.length === 2 && /NexCon-03/.test(sub.items[0]) && /Kronig/.test(sub.items[1]), JSON.stringify(sub));
  const box = await page.evaluate(() => { const r = document.querySelector('.submenu a').getBoundingClientRect(); return { x: r.x + 20, y: r.y + 12 }; });
  await page.mouse.move(box.x, box.y, { steps: 8 }); await page.waitForTimeout(300);
  log('nav', 'dropdown stays open while the pointer moves into it', await page.evaluate(() => getComputedStyle(document.querySelector('.submenu')).opacity === '1'));
  await page.click('.submenu a[href="/nexcon"]'); await page.waitForTimeout(3000);
  log('nav', 'dropdown -> NexCon-03 page', await page.evaluate(() => location.pathname === '/nexcon' && /NexCon-03/.test(document.querySelector('h1').textContent)));
  const cur = await page.evaluate(() => document.querySelector('.menu-trigger').getAttribute('aria-current'));
  log('nav', 'Products is highlighted while on a product page', cur === 'page', String(cur));
  await page.hover('.nav-links .menu-trigger'); await page.waitForTimeout(400);
  await page.click('.submenu a[href="/kronig"]'); await page.waitForTimeout(3000);
  log('nav', 'dropdown -> Kronig page', await page.evaluate(() => location.pathname === '/kronig' && /Kronig/.test(document.querySelector('h1').textContent)));
  await ctx.close();
}

// 3. every nav, CTA, footer and catalog link navigates (and shows the wipe)
for (const [from, sel, to] of [
  ['/', '.nav-links > a[href="/technology"]', '/technology'], ['/', '.nav-links .menu-trigger', '/products'], ['/', '.nav-links > a[href="/about"]', '/about'],
  ['/', '.nav a.btn[href="/contact"]', '/contact'], ['/', '.hero-actions a.btn[href="/contact"]', '/contact'],
  ['/technology', '.brand', '/'], ['/products', 'a.pr-name[href="/nexcon"]', '/nexcon'], ['/products', 'a.pr-name[href="/kronig"]', '/kronig'],
  ['/nexcon', '.foot nav a[href="/kronig"]', '/kronig'], ['/kronig', '.foot nav a[href="/products"]', '/products'], ['/about', '.foot nav a[href="/contact"]', '/contact'],
]) {
  const { ctx, page } = await fresh(from);
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate((s) => document.querySelector(s).click(), sel);
  await page.waitForTimeout(400);
  const wipe = await page.evaluate(() => getComputedStyle(document.getElementById('wipe')).display);
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => ({ p: location.pathname, h1: document.querySelectorAll('h1').length, y: Math.round(scrollY), field: !!window.__field }));
  log('click', `${from}  ${sel}  ->  ${to}`, st.p === to && st.h1 === 1 && st.field && wipe !== 'none', JSON.stringify(st) + ` wipe=${wipe}`);
  await ctx.close();
}
for (const to of ['/technology', '/products', '/about', '/contact']) {
  const { ctx, page } = await fresh('/');
  const g = await page.evaluate(() => window.__geo);
  await page.evaluate((y) => window.scrollTo(0, y), g.explore.top + 300); await page.waitForTimeout(1500);
  await page.evaluate((h) => document.querySelector(`.explore-list a[href="${h}"]`).click(), to); await page.waitForTimeout(3200);
  log('click', `explore list -> ${to}`, await page.evaluate((t) => location.pathname === t, to));
  await ctx.close();
}

// 4. "How it works" lands where the content is visible, not on the bare crystal
{
  const { ctx, page } = await fresh('/');
  await page.click('.hero-actions a.textlink'); await page.waitForTimeout(3500);
  const r = await page.evaluate(() => { const h = document.getElementById('h-loop').getBoundingClientRect(); return { y: Math.round(scrollY), loopTop: Math.round(window.__geo.loop.top), headingOnScreen: h.top > 0 && h.top < innerHeight && h.height > 0 }; });
  log('scroll', '"How it works" lands on the loop with its heading on screen', Math.abs(r.y - r.loopTop) < 40 && r.headingOnScreen, JSON.stringify(r));
  await ctx.close();
}

// 5. buttons: material picker, section rail, mobile menu
{
  const { ctx, page } = await fresh('/nexcon');
  const names = [];
  for (const i of [1, 2, 3, 0]) { await page.click(`.mat[data-mat="${i}"]`); await page.waitForTimeout(300); names.push(await page.evaluate(() => document.getElementById('structName').textContent)); }
  log('buttons', 'material picker (GaN, AlGaN, SiC, HfO2)', names.join() === 'Wurtzite alloy,4H polytype,Cubic fluorite,Wurtzite', names.join(' > '));
  await ctx.close();
}
{
  const { ctx, page } = await fresh('/');
  const n = await page.evaluate(() => document.querySelectorAll('#rail a').length);
  await page.click('#rail a:nth-child(3)'); await page.waitForTimeout(2800);
  const y = await page.evaluate(() => ({ y: Math.round(scrollY), t: Math.round(window.__geo.loop.top) }));
  log('buttons', `section rail (${n} dots) scrolls to its section`, Math.abs(y.y - y.t) < 60, JSON.stringify(y));
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4200);
  await page.click('#menuBtn'); await page.waitForTimeout(700);
  const items = await page.evaluate(() => [...document.querySelectorAll('#menu a')].map((a) => a.textContent.trim()));
  log('mobile', 'menu lists Technology, Products, NexCon-03, Kronig, Company, Request access', items.join() === 'Technology,Products,NexCon-03,Kronig,About us,Request access', items.join());
  for (const to of ['/nexcon', '/kronig', '/products']) {
    await page.evaluate((h) => document.querySelector(`#menu a[href="${h}"]`).click(), to); await page.waitForTimeout(3200);
    log('mobile', `menu -> ${to}`, await page.evaluate((t) => location.pathname === t && document.getElementById('menu').hidden, to));
    await page.click('#menuBtn'); await page.waitForTimeout(700);
  }
  await ctx.close();
}

// 6. copy checks across the whole site
{
  const texts = [];
  for (const r of ROUTES) { const { ctx, page } = await fresh(r); texts.push(await page.evaluate(() => document.body.innerText)); await ctx.close(); }
  const all = texts.join('\n');
  log('copy', 'Karthik Venkateshan removed everywhere', !/Karthik|Venkateshan/.test(all));
  log('copy', 'months-based roadmap removed everywhere', !/Months? 6|Month 10|Month 12|Month 15|within 15% of its prediction/i.test(all));
  log('copy', 'home page copy is domain-general (no DFT, no "candidate structures")', !/DFT|candidate structures/.test(texts[0]), (texts[0].match(/DFT|candidate structures/g) || []).join());
  const html = await (await b.newPage()).evaluate(() => '');
  const links = [];
  for (const r of ROUTES) { const res = await (await b.newContext()).request.get(BASE + r); links.push(await res.text()); }
  log('copy', 'no links to the removed /materials and /devices routes', !/href="\/(materials|devices)"/.test(links.join('\n')));
}
await b.close();

for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  [${r.area}] ${r.what}${r.ok ? '' : '  ' + r.detail}`);
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} audit checks passed`);
if (bad.length) { console.log('FAILED:'); bad.forEach((x) => console.log(' -', x)); process.exit(1); }
