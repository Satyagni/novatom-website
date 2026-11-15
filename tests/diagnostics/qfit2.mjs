// 1) every question fits at every viewport (cycle paused via ?motion=reduce so nothing interferes)
// 2) in the live cycle, two questions are never readable at the same time
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
let problems = 0;
for (const [w, h, mob] of [[1920, 950, false], [1440, 800, false], [1280, 650, false], [1024, 700, false], [768, 900, false], [390, 844, true], [320, 700, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/?motion=reduce', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const res = await page.evaluate(async () => {
    const items = [...document.querySelectorAll('#qlist li')];
    const out = [];
    for (const li of items) {
      items.forEach((x) => { x.className = ''; });
      li.className = 'is-on';
      await new Promise((r) => setTimeout(r, 120));
      const r = li.getBoundingClientRect();
      const band = document.getElementById('qband').getBoundingClientRect();
      out.push({ q: li.textContent.slice(0, 24), fitsX: r.left >= -1 && r.right <= innerWidth + 1, fitsBand: r.top >= band.top - 2 && r.bottom <= band.bottom + 2, lines: Math.round(r.height / parseFloat(getComputedStyle(li).lineHeight)) });
    }
    return out;
  });
  const bad = res.filter((x) => !x.fitsX || !x.fitsBand);
  if (bad.length) problems++;
  console.log(`${w}x${h}: ${bad.length ? 'PROBLEM ' + JSON.stringify(bad) : `all ${res.length} questions fit`}  (lines: ${res.map((x) => x.lines).join(',')})`);
  await ctx.close();
}
// live cycle
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const r = await page.evaluate(async () => {
    const items = [...document.querySelectorAll('#qlist li')];
    let maxReadable = 0, changes = 0, last = '';
    const seen = new Set();
    const end = performance.now() + 15000;
    while (performance.now() < end) {
      const readable = items.filter((li) => parseFloat(getComputedStyle(li).opacity) > 0.25);
      maxReadable = Math.max(maxReadable, readable.length);
      const cur = readable.map((x) => x.textContent).join('|');
      if (cur && cur !== last) { changes++; last = cur; }
      readable.forEach((x) => seen.add(x.textContent));
      await new Promise((res) => setTimeout(res, 40));
    }
    return { maxReadable, changes, distinct: seen.size, counter: document.getElementById('qNow').textContent };
  });
  console.log('live cycle (15 s):', JSON.stringify(r), r.maxReadable <= 1 ? 'OK, never two readable at once' : 'PROBLEM: overlap');
  if (r.maxReadable > 1) problems++;
  await ctx.close();
}
await b.close();
console.log(problems ? `${problems} problem(s)` : 'question band: all good');
