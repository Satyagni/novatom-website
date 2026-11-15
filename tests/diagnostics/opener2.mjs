// Opener v3: orbits around the wordmark, the faint cue, click-to-play and idle auto-play.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const vp = { width: 1440, height: 800 };
const mk = async () => { const ctx = await b.newContext({ viewport: vp }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); return { ctx, page, errs }; };

// 1) what the opener looks like now, and that the cue is there but faint
{
  const { ctx, page, errs } = await mk();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6800);
  const cue = await page.evaluate(() => { const c = document.getElementById('scrollCue'); const cs = getComputedStyle(c); const r = c.getBoundingClientRect(); return { display: cs.display, op: +cs.opacity, vis: cs.visibility, bottomGap: Math.round(innerHeight - r.bottom), navVis: getComputedStyle(document.getElementById('nav')).visibility }; });
  console.log('cue at top:', JSON.stringify(cue));
  await page.screenshot({ path: 'tests/shots/opener3-top.png' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tests/shots/opener3-top-b.png' });
  console.log('errors:', errs.join('|') || 'none');
  await ctx.close();
}
// 2) clicking the cue plays the morph smoothly
{
  const { ctx, page } = await mk();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6800);
  await page.click('#scrollCue');
  const samples = [];
  for (let i = 0; i < 9; i++) { await page.waitForTimeout(450); samples.push(await page.evaluate(() => ({ y: Math.round(scrollY), m: +window.__field.state.m.toFixed(2), ui: +(+getComputedStyle(document.documentElement).getPropertyValue('--ui')).toFixed(2) }))); }
  console.log('click -> scroll samples (y, morph, ui):', samples.map((s) => `${s.y}/${s.m}/${s.ui}`).join('  '));
  const end = samples[samples.length - 1];
  console.log(end.y > 780 && end.m === 0 && end.ui === 1 ? 'PASS click plays the full morph and lands on the hero' : 'CHECK click result');
  await page.screenshot({ path: 'tests/shots/opener3-after-click.png' });
  await ctx.close();
}
// 3) doing nothing: it plays itself; touching something first cancels that
{
  const { ctx, page } = await mk();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(13500);
  const y = await page.evaluate(() => Math.round(scrollY));
  console.log(y > 600 ? `PASS idle visitor: it played itself (scrollY ${y})` : `CHECK idle: scrollY ${y}`);
  await ctx.close();
}
{
  const { ctx, page } = await mk();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.keyboard.press('Shift');   // a real input cancels the auto-play
  await page.waitForTimeout(9500);
  const y = await page.evaluate(() => Math.round(scrollY));
  console.log(y < 20 ? 'PASS any input cancels the auto-play (stayed on the wordmark)' : `CHECK cancel: scrollY ${y}`);
  await ctx.close();
}
await b.close();
