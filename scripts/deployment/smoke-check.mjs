#!/usr/bin/env node
const apiBaseUrl = process.env.SMOKE_API_URL || process.env.NEXT_PUBLIC_API_URL;
const webUrl = process.env.SMOKE_WEB_URL || process.env.APP_URL;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);

const checks = [];

if (apiBaseUrl) {
  const base = apiBaseUrl.replace(/\/$/, "");
  checks.push({ name: "api health", url: `${base}/health` });
  checks.push({ name: "api strict readiness", url: `${base}/ready/strict` });
}

if (webUrl) checks.push({ name: "web", url: webUrl });

if (checks.length === 0) {
  console.error("Set SMOKE_API_URL and/or SMOKE_WEB_URL.");
  process.exit(1);
}

async function check({ name, url }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`${name}: OK ${url}`);
  } finally {
    clearTimeout(timeout);
  }
}

const failures = [];
for (const item of checks) {
  try {
    await check(item);
  } catch (error) {
    failures.push(`${item.name}: ${item.url} failed (${error.message})`);
  }
}

if (failures.length > 0) {
  console.error("Smoke check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Smoke check passed.");
