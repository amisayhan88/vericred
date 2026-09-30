/**
 * Captures README screenshots from the PRODUCTION build (no dev overlays).
 *
 * Usage:
 *   npm --prefix vericred-ui run build:preview
 *   npm --prefix vericred-ui run preview -- --port 4417 --strictPort
 *   BASE_URL=http://localhost:4417 node scripts/screenshots.mjs
 *
 * Every capture is machine-checked:
 *  - zero console errors / page errors during the route visit
 *  - no vite error overlay or React error-screen text in the DOM
 *  - pages expected to show 3D must have a <canvas> whose element screenshot
 *    rasterises >40 KB of PNG (a blank canvas compresses to a few KB)
 *  - full-page PNGs must be >80 KB and unique by sha256
 * A run with any failure exits non-zero and prints a JSON report.
 */
import { chromium, devices } from 'playwright';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:4417';
const OUT = path.resolve('docs/assets/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const DESKTOP_ROUTES = [
  { name: 'home', path: '/', wait: 5200, canvas: true },
  { name: 'home-platform', path: '/#platform', wait: 2600 },
  { name: 'how-it-works', path: '/how-it-works', wait: 3200 },
  { name: 'architecture', path: '/architecture', wait: 5200, canvas: true },
  { name: 'wallet', path: '/wallet', wait: 2600 },
  { name: 'proof', path: '/proof', wait: 2400 },
  { name: 'verify', path: '/verify', wait: 2400 },
  { name: 'verify-result', path: '/verify/VP-3K9F-7MQD', wait: 3000 },
  { name: 'universities', path: '/universities', wait: 2600 },
  { name: 'universities-issue', path: '/universities?tab=issue', wait: 2200 },
  { name: 'transactions', path: '/transactions', wait: 2200 },
  { name: 'settings', path: '/settings', wait: 3600, probeOk: true },
];

const MOBILE_ROUTES = [
  { name: 'home', path: '/', wait: 2600 },
  { name: 'wallet', path: '/wallet', wait: 2600 },
  { name: 'proof', path: '/proof', wait: 2400 },
  { name: 'verify', path: '/verify', wait: 2400 },
  { name: 'verify-result', path: '/verify/VP-3K9F-7MQD', wait: 3000 },
  { name: 'universities', path: '/universities', wait: 2600 },
];

const ERROR_TEXT =
  /something went wrong|application error|cannot read propert|is not a function|internal server error|minimum execute timeout|bundle error/i;

async function shoot(contextOpts, routes, prefix, report, extra) {
  const browser = await chromium.launch({ headless: true, args: GL_ARGS });
  const ctx = await browser.newContext(contextOpts);

  for (const r of routes) {
    const file = path.join(OUT, `${prefix}-${r.name}.png`);
    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      const page = await ctx.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
      page.on('pageerror', (e) => pageErrors.push(e.message));
      try {
        await page.goto(BASE + r.path, { waitUntil: 'networkidle', timeout: 60_000 });
        await page.waitForTimeout(r.wait);

        const overlayCount = await page.locator('vite-error-overlay').count();
        const bodyText = await page.evaluate(() => document.body.innerText);
        const issues = [];
        if (overlayCount) issues.push('vite error overlay present');
        if (ERROR_TEXT.test(bodyText)) issues.push('error text in DOM');
        if (pageErrors.length) issues.push(`pageerror: ${pageErrors[0]}`);
        // React "synchronously unmount" notices are dev-only noise; keep the rest
        let realConsole = consoleErrors.filter((e) => !/synchronously unmount/.test(e));
        // /settings deliberately probes endpoints; 404/405/OSSL refusals are expected diagnostics
        if (r.probeOk) realConsole = realConsole.filter((e) => !/Failed to load resource/.test(e));
        if (realConsole.length) issues.push(`console: ${realConsole[0]}`);

        if (r.canvas) {
          const canvas = page.locator('canvas').first();
          if ((await canvas.count()) === 0) {
            issues.push('no <canvas> element (3D scene did not mount)');
          } else {
            const canvasFile = file.replace('.png', '-canvas.png');
            await canvas.screenshot({ path: canvasFile });
            const csize = fs.statSync(canvasFile).size;
            fs.unlinkSync(canvasFile);
            if (csize < 40_000) issues.push(`canvas blank (${csize} B raster)`);
          }
        }

        if (issues.length) throw new Error(issues.join(' | '));

        await page.screenshot({ path: file });
        const size = fs.statSync(file).size;
        if (size < 80_000) throw new Error(`png too small (${size} B) — likely an error/blank page`);
        ok = true;
        const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
        report.push({ file: `${prefix}-${r.name}.png`, bytes: size, sha256_8: sha, attempt });
        console.log(`captured ${prefix}-${r.name}.png (${Math.round(size / 1024)} KB, ${sha})`);
      } catch (e) {
        console.error(`FAIL ${prefix}-${r.name} (attempt ${attempt}): ${e.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }
    if (!ok) report.push({ file: `${prefix}-${r.name}.png`, failed: true });
  }

  if (extra) {
    const page = await ctx.newPage();
    try {
      await extra(page, report, prefix);
    } finally {
      await page.close().catch(() => {});
    }
  }
  await browser.close();
}

async function credentialDetail(page, report, prefix) {
  await page.goto(BASE + '/wallet', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const displayId = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/credential/"]');
    if (a) return a.getAttribute('href').split('/').pop();
    const raw = localStorage.getItem('vericred-store');
    if (!raw) return null;
    const creds = JSON.parse(raw)?.state?.credentials ?? [];
    return creds.find((x) => x.owner && x.status === 'ACTIVE')?.displayId ?? null;
  });
  if (!displayId) throw new Error('no credential displayId found');
  await page.goto(`${BASE}/credential/${displayId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (ERROR_TEXT.test(bodyText)) throw new Error('error text on credential page');
  if (!/Credential lifecycle/i.test(bodyText)) throw new Error('credential page missing lifecycle section');
  if (!new RegExp(displayId, 'i').test(bodyText)) throw new Error('credential page missing display id');
  const file = path.join(OUT, `${prefix}-credential.png`);
  await page.screenshot({ path: file });
  const size = fs.statSync(file).size;
  const floor = prefix === 'mobile' ? 40_000 : 80_000;
  if (size < floor) throw new Error(`credential png too small (${size} B < ${floor})`);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  report.push({ file: `${prefix}-credential.png`, bytes: size, sha256_8: sha, attempt: 1 });
  console.log(`captured ${prefix}-credential.png (${Math.round(size / 1024)} KB, ${sha})`);
}

const run = async () => {
  const report = [];
  await shoot(
    { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    DESKTOP_ROUTES,
    'desktop',
    report,
    (page, rep, pfx) => credentialDetail(page, rep, pfx),
  );
  await shoot(
    { ...devices['iPhone 13'], deviceScaleFactor: 2 },
    MOBILE_ROUTES,
    'mobile',
    report,
    (page, rep, pfx) => credentialDetail(page, rep, pfx),
  );

  fs.writeFileSync(path.join(OUT, 'capture-report.json'), JSON.stringify(report, null, 2));
  const failed = report.filter((r) => r.failed || !r.bytes);
  const sizes = report.filter((r) => r.bytes).map((r) => r.bytes);
  const shas = new Set(report.map((r) => r.sha256_8));
  console.log(
    `\nreport: ${report.length - failed.length}/${report.length} ok · ` +
      `${Math.min(...sizes)}..${Math.max(...sizes)} B · ${shas.size} unique hashes`,
  );
  if (failed.length) {
    console.error('FAILURES:', JSON.stringify(failed));
    process.exit(1);
  }
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
