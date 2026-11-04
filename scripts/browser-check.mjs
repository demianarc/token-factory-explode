import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const OUT = process.env.SCREENSHOTS ?? 'screenshots';
fs.mkdirSync(OUT, { recursive: true });

const CHROME_FULL = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const BROWSER_BIN = fs.existsSync(CHROME_FULL) ? CHROME_FULL : undefined;

const browser = await chromium.launch({
  executablePath: BROWSER_BIN,
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--disable-web-security',
    '--allow-file-access-from-files',
    '--ignore-certificate-errors',
  ],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push({ type: 'pageerror', message: String(e) }));
page.on('console', m => { if (m.type() === 'error') errors.push({ type: 'console', text: m.text() }); });

await page.addInitScript(() => {
  window.__errors = [];
  window.addEventListener('error', e => window.__errors.push({ type: 'error', message: e.message }));
  window.addEventListener('unhandledrejection', e => window.__errors.push({ type: 'unhandled', reason: String(e.reason) }));
});

const tests = [];
function record(name, pass, details = {}) {
  tests.push({ name, pass, details });
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`, JSON.stringify(details));
}
async function wait(ms) { await page.waitForTimeout(ms); }
async function state() { return page.evaluate(() => (window.__EA ? window.__EA.state : null)); }
async function shot(name) { await page.screenshot({ path: path.join(OUT, `${name}.png`), type: 'png' }); }

console.log('Opening:', BASE);
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await wait(2500);
{
  const loadDisplay = await page.evaluate(() => document.getElementById('loading')?.style.display);
  const hasCanvas = await page.evaluate(() => !!document.getElementById('scene')?.getContext('webgl2') || document.getElementById('scene')?.getContext('webgl'));
  const threeInfo = await page.evaluate(() => window.__EA?.state);
  console.log('DEBUG: loadingDisplay=', loadDisplay, 'canvasCtx=', hasCanvas, 'state=', JSON.stringify(threeInfo));
}

{
  const hasEA = await page.evaluate(() => !!window.__EA);
  record('App boot exposes window.__EA', hasEA);
}
{
  const st = await state();
  record('Initial assembly=0', st?.assembly === 0, st);
}
await shot('01-assembled');

await page.evaluate(() => document.getElementById('explodeBtn').click());
await wait(2500);
await shot('02-exploded');
{
  const st = await state();
  record('Explode reaches 100', st?.assembly === 100, { assembly: st?.assembly });
}

await page.evaluate(() => document.getElementById('resetBtn').click());
await wait(1200);
{
  const st = await state();
  record('Reset returns assembly=0', st?.assembly === 0);
}

await page.evaluate(() => {
  const el = document.getElementById('assemblyInput');
  el.value = 55;
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(300);
await shot('03-half-exploded');
{
  const st = await state();
  record('Mid slider 55%', st?.assembly === 55, { assembly: st?.assembly });
}

await page.evaluate(() => {
  const el = document.getElementById('assemblyInput');
  el.value = 0;
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(200);

await page.evaluate(() => {
  const btn = document.querySelector('.part-item[data-id="frontShell"]');
  if (!btn) throw new Error('frontShell part not in list');
  btn.click();
});
await wait(300);
await shot('04-select-front-shell');
{
  const st = await state();
  record('Selection from parts list', st?.selected === 'frontShell', { selected: st?.selected });
}

await page.evaluate(() => document.querySelector('.btn-preset[data-preset="lens"]').click());
await wait(1500);
await shot('05-lens-detail');

await page.evaluate(() => {
  const el = document.getElementById('apertureInput');
  el.value = 8;
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(500);
{
  const st = await state();
  record('Aperture set to 8', st?.aperture === 'f/8.0', { aperture: st?.aperture });
}
{
  const val = await page.textContent('#apertureDisplay');
  record('Aperture DOM updated', val === 'f/8.0', { dom: val });
}

for (const m of ['technical', 'xray', 'materials']) {
  await page.evaluate((m) => document.querySelector(`.btn-mode[data-mode="${m}"]`).click(), m);
  await wait(250);
  {
    const st = await state();
    record(`Mode switch ${m}`, st?.mode === m);
  }
}
await shot('06-materials-restored');

{
  const partTotal = await page.evaluate(() => document.querySelectorAll('.part-item').length);
  record('Part list populated', partTotal > 20, { partTotal });
}

await shot('07-go-back-hero');
await page.evaluate(() => document.querySelector('.btn-preset[data-preset="hero"]').click());
await wait(1200);

await page.evaluate(() => document.getElementById('clearSelBtn').click());
{
  const st = await state();
  record('Selection cleared', st?.selected === null, { selected: st?.selected });
}

await page.evaluate(() => {
  document.getElementById('assemblyInput').value = 65;
  document.getElementById('assemblyInput').dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('.btn-preset[data-preset="lens"]').click();
});
await wait(1000);
await page.evaluate(() => document.getElementById('shutterBtn').click());
await wait(300);
await shot('08-shutter-released');

await page.evaluate(() => document.getElementById('lightRayToggle').click());
await wait(300);

await page.evaluate(() => document.getElementById('showcaseBtn').click());
await wait(800);
await shot('09-showcase-start');
await page.evaluate(() => document.getElementById('cancelShowcase').click());
await wait(300);

await page.evaluate(() => document.getElementById('resetBtn').click());
await wait(500);
{
  const nav = await page.evaluate(() => JSON.stringify(performance.getEntriesByType('navigation')[0]));
  console.log('NAV:', nav);
  const errs = await page.evaluate(() => window.__errors);
  record('No page errors', errs.length === 0, { errs });
}

await page.setViewportSize({ width: 375, height: 812 });
await wait(500);
await shot('10-mobile');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
record('Mobile no horizontal overflow', !overflow);

await browser.close();

const fails = tests.filter(t => !t.pass);
console.log('\n==========');
console.log(`Total: ${tests.length} | Passed: ${tests.length - fails.length} | Failed: ${fails.length}`);
if (fails.length) { for (const f of fails) console.log('-', f.name, JSON.stringify(f.details)); }
console.log('Console errors from page:', errors.length);
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ tests, errors }, null, 2));
process.exit(fails.length > 0 ? 1 : 0);
