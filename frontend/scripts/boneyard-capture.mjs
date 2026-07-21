#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8080';
const OUT_DIR = join(__dirname, '..', 'src', 'bones');

const PAGES = [
  { name: 'overview-dashboard', url: '/boneyard-snap' },
  { name: 'payroll-dashboard', url: '/boneyard-snap' },
  { name: 'payroll-periods-table', url: '/boneyard-snap' },
  { name: 'payroll-runs-table', url: '/boneyard-snap' },
  { name: 'payslips-table', url: '/boneyard-snap' },
  { name: 'salary-structures-table', url: '/boneyard-snap' },
];

const INIT_SCRIPT = [
  'window.__BONEYARD_BUILD = true;',
  'setInterval(function() {',
  '  try {',
  '    if (window.next && window.next.router) {',
  '      window.next.router.replace = function() { return Promise.resolve(false); };',
  '      window.next.router.push = function() { return Promise.resolve(false); };',
  '    }',
  '  } catch(e) {}',
  '}, 100);',
].join('\n');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
mkdirSync(OUT_DIR, { recursive: true });

for (const p of PAGES) {
  const page = await context.newPage();
  await page.addInitScript(INIT_SCRIPT);
  const url = BASE + p.url;
  console.log('\n=== ' + p.name + ' ===');
  console.log('  ' + url);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    console.log('  Final URL: ' + page.url());

    // Wait for Skeleton components to render
    try {
      await page.waitForSelector('[data-boneyard]', { timeout: 10000 });
    } catch {
      console.log('  No [data-boneyard] elements found');
    }

    // Check for elements
    const info = await page.evaluate(() => {
      var els = document.querySelectorAll('[data-boneyard]');
      var names = [];
      els.forEach(function(el) { names.push(el.getAttribute('data-boneyard')); });
      return {
        skeleton_count: els.length,
        names: names,
        has_snapshot: typeof window.__BONEYARD_SNAPSHOT === 'function',
        url: window.location.href,
      };
    });
    console.log('  Info: ' + JSON.stringify(info));

    // Capture bones
    if (info.has_snapshot && info.skeleton_count > 0) {
      var bones = await page.evaluate(function() {
        return JSON.parse(JSON.stringify(window.__BONEYARD_SNAPSHOT()));
      });
      var outFile = join(OUT_DIR, p.name + '.bones.json');
      writeFileSync(outFile, JSON.stringify(bones, null, 2));
      console.log('  Captured: ' + outFile);
    }
  } catch (err) {
    console.log('  Error: ' + err.message);
  }
  await page.close();
}

await browser.close();
