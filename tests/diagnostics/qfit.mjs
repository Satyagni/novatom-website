import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const [w, h, mob] of [[1920, 950, false], [1440, 800, false], [1280, 650, false], [1024, 700, false], [768, 900, false], [390, 844, true], [320, 700, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4200);
  // every question, shown in turn, must sit fully inside the viewport and inside its band
  const res = await page.evaluate(async () => {
    const items = [...document.querySelectorAll('#qlist li')];
    const out = [];
    for (const li of items) {
      items.forEach((x) => { x.className = ''; });
      li.className = 'is-on';
      await new Promise((r) => setTimeout(r, 900));
      const r = li.getBoundingClientRect();
      const band = document.getElementById('qband').getBoundingClientRect();
      const lines = Math.round(r.height / parseFloat(getComputedStyle(li).lineHeight));
      out.push({ q: li.textContent.slice(0, 22), fitsX: r.left >= 0 && r.right <= innerWidth, fitsBand: r.top >= band.top - 2 && r.bottom <= band.bottom + 2, lines });
    }
    return out;
  });
  const bad = res.filter((x) => !x.fitsX || !x.fitsBand);
  console.log(`${w}x${h}: ${bad.length ? 'PROBLEM ' + JSON.stringify(bad) : 'all 6 questions fit'}  (lines per question: ${res.map((x) => x.lines).join(',')})`);
  if (w === 1440 || w === 390) { await page.evaluate(() => document.getElementById('qband').scrollIntoView({ block: 'center' })); await page.waitForTimeout(900); await page.screenshot({ path: `tests/shots/qband-${w}.png` }); }
  await ctx.close();
}
await b.close();
