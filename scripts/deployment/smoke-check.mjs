#!/usr/bin/env node
const apiBaseUrl = process.env.SMOKE_API_URL || process.env.NEXT_PUBLIC_API_URL;
const webUrl = process.env.SMOKE_WEB_URL || process.env.APP_URL;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);

const checks = [];

if (apiBaseUrl) {
  const base = apiBaseUrl.replace(/\/$/, "");

  checks.push({ name: "api v1 root", url: `${base}/` });
  checks.push({ name: "api health", url: `${base}/health` });
  checks.push({ name: "api ready", url: `${base}/ready` });
  checks.push({ name: "api strict readiness", url: `${base}/ready/strict` });
  checks.push({ name: "api auth session", url: `${base}/auth/session` });
}

if (webUrl) {
  const base = webUrl.replace(/\/$/, "");
  checks.push({ name: "web root", url: `${base}/` });
  checks.push({ name: "web login", url: `${base}/auth/login` });
  checks.push({ name: "web dashboard", url: `${base}/dashboard` });
  checks.push({ name: "web favicon", url: `${base}/favicon.ico` });
  checks.push({ name: "web robots", url: `${base}/robots.txt` });
}

if (checks.length === 0) {
  console.error("Set SMOKE_API_URL and/or SMOKE_WEB_URL.");
  process.exit(1);
}

async function check({ name, url }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();
  try {
    const response = await fetch(url, { signal: controller.signal });
    const durationMs = Math.round(performance.now() - startTime);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`${name}: OK ${url} (${durationMs}ms)`);
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
