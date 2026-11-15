// Chrome trace of the morph: list every event longer than 60 ms.
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(7000);
await b.startTracing(page, { path: 'tests/shots/trace.json', categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'gpu', 'cc', 'viz', 'blink', 'toplevel'] });
await page.mouse.click(700, 300);
await page.waitForTimeout(6000);
await b.stopTracing();
const t = JSON.parse(fs.readFileSync('tests/shots/trace.json', 'utf8'));
const ev = (t.traceEvents || t).filter((e) => e.dur > 60000 && e.ph === 'X');
ev.sort((a, c) => c.dur - a.dur).slice(0, 25).forEach((e) => console.log(Math.round(e.dur / 1000) + 'ms', e.cat, e.name, 'pid', e.pid, 'tid', e.tid, JSON.stringify(e.args || {}).slice(0, 160)));
await b.close();
