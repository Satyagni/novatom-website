import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = []; page.on('console', (m) => logs.push(m.text())); page.on('pageerror', (e) => logs.push('ERR ' + e.message));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
console.log(JSON.stringify(await page.evaluate(() => ({ tier: window.__tier && { name: window.__tier.name, bonds: window.__tier.bonds, count: window.__tier.count }, want: window.__field?.wantBonds, eboN: window.__field?.eboN, hasEbos: !!window.__field?.ebos, err: window.__field?.gl.getError() }))));
console.log(logs.join('\n'));
await browser.close();
