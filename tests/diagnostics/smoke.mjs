import { chromium } from 'playwright';
const url = process.argv[2] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()}`));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
const info = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, hasField: !!window.__field, h1: document.querySelector('h1')?.innerText, ready: document.documentElement.classList.contains('ready') };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: 'tests/shots/smoke-hero.png' });
console.log(logs.join('\n') || 'no console output');
await browser.close();
