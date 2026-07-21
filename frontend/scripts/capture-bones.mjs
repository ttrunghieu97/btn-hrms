#!/usr/bin/env node
// Direct skeleton capture script using Playwright
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const ROUTES = [
  '/overview/operations',
  '/payroll/periods',
  '/payroll/runs',
  '/payroll/payslips',
  '/payroll/salary-structures',
];

const browser = await chromium.launch();
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

// Set build-mode flag before any navigation
await page.addInitScript(() => { window.__BONEYARD_BUILD = true; });

// Use custom header for auth bypass
await page.setExtraHTTPHeaders({ 'x-boneyard-build': '1' });

for (const route of ROUTES) {
  console.log(`\n=== ${route} ===`);
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    console.log(`  URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);

    // Inject boneyard snapshot and capture
    const result = await page.evaluate(() => {
      if (typeof window.__BONEYARD_SNAPSHOT === 'function') {
        const bones = window.__BONEYARD_SNAPSHOT();
        return { captured: true, count: bones?.bones?.length ?? 0 };
      }
      return { captured: false, reason: 'no snapshot function' };
    });
    console.log(`  Capture: ${JSON.stringify(result)}`);
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
}

await browser.close();
