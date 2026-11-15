// Clicking a loop stage scrolls to its fully formed state (desktop and phone), by mouse and keyboard.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
let bad = 0;
const NAMES = ['Define', 'Hypothesise', 'Screen', 'Make and measure', 'Learn'];
for (const [label, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4200);
  const g = await page.evaluate(() => window.__geo);
  await page.evaluate((y) => window.scrollTo(0, y), g.loop.top + 20);   // arrive in the loop from above
  await page.waitForTimeout(1500);
  // order out of sequence on purpose: 4, 2, 5, 1, 3
  for (const k of [4, 2, 5, 1, 3]) {
    await page.click(`.step-btn[data-go="${k}"]`, { force: true });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(() => {
      const s = window.__field.state; const stage = s.a + s.m;
      return { active: document.querySelector('.step.is-active h3')?.textContent.trim(), stage: +stage.toFixed(2), a: s.a, b: s.b, current: document.querySelector('.step-btn[aria-current="step"]')?.dataset.go, bodyVisible: (() => { const p = document.querySelector('.step.is-active .step-body p'); return p ? p.getBoundingClientRect().height > 10 : false; })() };
    });
    const ok = new RegExp(NAMES[k - 1]).test(r.active) && Math.abs(r.stage - k) < 0.12 && r.current === String(k) && r.bodyVisible;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: click stage ${k} (${NAMES[k - 1]}) -> ${JSON.stringify(r)}`);
  }
  // keyboard: focus a stage and press Enter
  await page.focus('.step-btn[data-go="2"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(2600);
  const kb = await page.evaluate(() => document.querySelector('.step.is-active h3')?.textContent.trim());
  const okKb = /Hypothesise/.test(kb); if (!okKb) bad++;
  console.log(`${okKb ? 'PASS' : 'FAIL'}  ${label}: keyboard Enter on stage 2 -> "${kb}"`);
  if (label === 'desktop') { await page.click('.step-btn[data-go="4"]', { force: true }); await page.waitForTimeout(2600); await page.screenshot({ path: 'tests/shots/step4-desktop.png' }); }
  if (label === 'phone') { await page.click('.step-btn[data-go="4"]', { force: true }); await page.waitForTimeout(2600); await page.screenshot({ path: 'tests/shots/step4-phone.png' }); }
  await ctx.close();
}
await b.close();
console.log(bad ? `${bad} problem(s)` : 'loop stages: all good');
