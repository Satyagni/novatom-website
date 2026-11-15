import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
// 1) a visitor whose OS has reduce-motion ON, exactly like the screenshots
const ctx = await b.newContext({ viewport: { width: 1440, height: 800 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const g = await page.evaluate(() => window.__geo);
await page.evaluate((y) => window.scrollTo(0, y), g.space.top - 60);
await page.waitForTimeout(800);
await page.screenshot({ path: 'tests/shots/motion-reduced-space.png' });
console.log('OS reduced ->', JSON.stringify(await page.evaluate(() => ({ cls: document.documentElement.className, btn: document.getElementById('motionBtn').textContent, pressed: document.getElementById('motionBtn').getAttribute('aria-pressed') }))));
// 2) click the toggle: animations come on, and it sticks
await page.evaluate(() => window.scrollTo(0, 0));
await page.click('#motionBtn');
await page.waitForTimeout(5200);
const on = await page.evaluate(() => ({ cls: document.documentElement.className, btn: document.getElementById('motionBtn').textContent, lenis: document.documentElement.classList.contains('lenis'), field: !!window.__field, frozen: window.__field && window.__field.frozen, stored: localStorage.getItem('motion') }));
console.log('after toggle ->', JSON.stringify(on));
const g2 = await page.evaluate(() => window.__geo);
await page.evaluate((y) => window.scrollTo(0, y), g2.space.top + 0.3 * (g2.space.h - 800));
await page.waitForTimeout(2000);
console.log('dive state ->', JSON.stringify(await page.evaluate(() => ({ scale: +window.__field.state.scale.toFixed(2), a: window.__field.state.a, b: window.__field.state.b }))));
await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3500);
console.log('after reload (persisted) ->', JSON.stringify(await page.evaluate(() => ({ cls: document.documentElement.className, lenis: document.documentElement.classList.contains('lenis') }))), 'errors:', errs.join('|') || 'none');
// 3) ?motion=full link
const p2 = await (await b.newContext({ viewport: { width: 1440, height: 800 }, reducedMotion: 'reduce' })).newPage();
await p2.goto('http://127.0.0.1:4173/?motion=full', { waitUntil: 'domcontentloaded' }); await p2.waitForTimeout(3500);
console.log('?motion=full ->', JSON.stringify(await p2.evaluate(() => ({ cls: document.documentElement.className, lenis: document.documentElement.classList.contains('lenis') }))));
await b.close();
