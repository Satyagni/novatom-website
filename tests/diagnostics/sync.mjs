// Opener sync: crystal state and page chrome must agree at any scroll speed, and the cue must land in the finished hero state.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const VH = 800;
const snap = (page) => page.evaluate(() => { const s = window.__field.state; return { y: Math.round(scrollY), a: s.a, b: s.b, m: +s.m.toFixed(2), sc: +s.scale.toFixed(2), ox: +s.offsetX.toFixed(2), ui: +(+getComputedStyle(document.documentElement).getPropertyValue('--ui')).toFixed(2) }; });
async function fresh() { const ctx = await b.newContext({ viewport: { width: 1440, height: VH } }); const page = await ctx.newPage(); await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(6800); return { ctx, page }; }

// 1) click the cue: sample through the whole playback
{
  const { ctx, page } = await fresh();
  const t0 = Date.now();
  await page.click('#scrollCue');
  const rows = [];
  for (let i = 0; i < 34; i++) { await page.waitForTimeout(400); const s = await snap(page); rows.push({ t: +((Date.now() - t0) / 1000).toFixed(1), ...s }); }
  console.log('CLICK PLAYBACK (time, scrollY, state a>b, morph m, nav ui):');
  rows.filter((_, i) => i % 3 === 0).forEach((r) => console.log(`  ${r.t}s  y=${r.y}  ${r.a}>${r.b} m=${r.m}  ui=${r.ui}`));
  const end = rows[rows.length - 1];
  const finishT = (rows.find((r) => r.a === 5 && r.b === 5 && r.ui === 1) || {}).t;
  // consistency: whenever the nav is more than half in, the crystal must be mostly formed (m small, or already 5>5)
  const bad = rows.filter((r) => r.ui > 0.5 && r.a === 7 && r.m < 0.55);
  console.log(`  finished at ~${finishT}s; final state ${end.a}>${end.b} ui=${end.ui} y=${end.y}`);
  console.log(bad.length ? `  CHECK: nav ahead of crystal in ${bad.length} samples` : '  PASS nav never ahead of the crystal');
  console.log(end.a === 5 && end.b === 5 && end.ui === 1 && end.y >= VH * 1.5 ? '  PASS lands in the finished hero state' : '  CHECK final state');
  await ctx.close();
}
// 2) three ways of getting to the same spot must give the same final state
const finals = {};
for (const [label, run] of [
  ['instant jump', async (page) => { await page.evaluate((y) => window.scrollTo(0, y), VH * 1.5 + 2); await page.waitForTimeout(3500); }],
  ['fast wheel burst', async (page) => { for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(30); } await page.waitForTimeout(3800); }],
  ['slow wheel', async (page) => { for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, 50); await page.waitForTimeout(160); } await page.waitForTimeout(3500); }],
]) {
  const { ctx, page } = await fresh();
  await run(page);
  const s = await snap(page);
  finals[label] = s;
  console.log(`${label}: y=${s.y} state ${s.a}>${s.b} m=${s.m} scale=${s.sc} offsetX=${s.ox} ui=${s.ui}`);
  await ctx.close();
}
// 3) instant jump: while it plays catch-up, crystal and chrome move together
{
  const { ctx, page } = await fresh();
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(VH * 0.8));
  const seq = [];
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(150); seq.push(await snap(page)); }
  console.log('INSTANT JUMP to 0.8 screens, catching up (m, ui):', seq.map((s) => `${s.m}/${s.ui}`).join('  '));
  await ctx.close();
}
await b.close();
