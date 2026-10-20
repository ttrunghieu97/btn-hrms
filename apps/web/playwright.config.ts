import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

function resolveLocalChromiumExecutable(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  const cacheDir = path.join(os.homedir(), ".cache", "ms-playwright");
  if (!fs.existsSync(cacheDir)) return undefined;
  const entries = fs.readdirSync(cacheDir).sort().reverse();
  for (const entry of entries) {
    if (entry.startsWith("chromium-")) {
      const candidate = path.join(cacheDir, entry, "chrome-linux64", "chrome");
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

const executablePath = resolveLocalChromiumExecutable();
const webPort = Number(process.env.E2E_WEB_PORT || 8080);
const apiPort = Number(process.env.E2E_API_PORT || 3001);
const skipAuthSetup = process.env.E2E_SKIP_AUTH_SETUP === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 60000,
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: [
    {
      command: `pnpm --dir ../api start:dev`,
      url: `http://127.0.0.1:${apiPort}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        PORT: String(apiPort),
        FRONTEND_URL: `http://localhost:${webPort},http://127.0.0.1:${webPort}`,
        CORS_ORIGIN: `http://localhost:${webPort},http://127.0.0.1:${webPort}`,
        ENABLED_NAV_GROUPS: "*",
      },
    },
    {
      command: process.env.E2E_WEB_PORT
        ? `npx next start --port ${webPort}`
        : `npx next dev --webpack --port ${webPort}`,
      url: `http://localhost:${webPort}/auth/sign-in`,
      reuseExistingServer: !process.env.CI && !process.env.E2E_WEB_PORT,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_API_URL: "/api/v1",
        NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${apiPort}/api/v1`,
        INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
        API_URL: `http://127.0.0.1:${apiPort}`,
        NEXT_PUBLIC_ENABLED_MODULES: "*",
      },
    },
  ],
  projects: skipAuthSetup
    ? [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
        {
          name: "setup",
          testMatch: /auth\.setup\.ts/,
        },
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            storageState: "playwright/.auth/admin.json",
          },
          dependencies: ["setup"],
        },
      ],
});
