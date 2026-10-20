import fs from "node:fs";
import { test as setup, expect } from "@playwright/test";
import {
  AUTH_DIR,
  STORAGE_STATE,
  attachRuntimeErrorTracker,
} from "./fixtures";

const SEED_PASSWORD = process.env.SEED_PASSWORD || "123456";

const PERSONAS = [
  {
    role: "admin" as const,
    username: "admin",
    storagePath: STORAGE_STATE.admin,
  },
  {
    role: "manager" as const,
    username: "manager",
    storagePath: STORAGE_STATE.manager,
  },
  {
    role: "employee" as const,
    username: "employee",
    storagePath: STORAGE_STATE.employee,
  },
];

for (const persona of PERSONAS) {
  setup(`authenticate as ${persona.role} (${persona.username})`, async ({ page }) => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const tracker = attachRuntimeErrorTracker(page);

    await page.goto("/auth/sign-in");
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await usernameInput.fill(persona.username);
    await passwordInput.fill(SEED_PASSWORD);

    const permSessionPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/auth/permission-session") &&
        res.request().method() === "POST",
    );

    await submitButton.click();
    const permRes = await permSessionPromise;
    expect(permRes.status()).toBe(200);

    await page.waitForURL((url) => !url.pathname.startsWith("/auth/sign-in"), {
      timeout: 20000,
    });

    const cookies = await page.context().cookies();
    const cookieNames = new Set(cookies.map((c) => c.name));
    expect(cookieNames.has("access_token")).toBe(true);
    expect(cookieNames.has("refresh_token")).toBe(true);
    expect(cookieNames.has("session_perms")).toBe(true);

    await page.context().storageState({ path: persona.storagePath });
    tracker.assertClean();
  });
}
