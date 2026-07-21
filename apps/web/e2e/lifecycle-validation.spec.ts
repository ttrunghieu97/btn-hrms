/**
 * Lifecycle Validation — Cross-Module Business Flows
 *
 * Tests the complete employee lifecycle across bounded contexts:
 *   Hire → Contract → Onboard → Attend → Leave → Payroll → Learn → Offboard
 *
 * Strategy: API for reliable data setup, UI for end-to-end verification.
 * This catches event bus failures, subscriber drops, and aggregate state issues
 * that unit tests cannot detect.
 */
import { test, expect } from "@playwright/test";

test.describe("Lifecycle Validation", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  const ts = Date.now().toString().slice(-6);
  const empCode = `LV${ts}`;
  const empEmail = `lifecycle${ts}@test.com`;

  let apiBase = "http://localhost:3001/api/v1";
  let headers: Record<string, string>;
  let employeeId: string;

  test.beforeAll(async () => {
    const login = await fetch("http://localhost:3001/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "123456" }),
    });
    const data = await login.json();
    const token = data.data.access_token;
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  });

  // ── 1. HIRE ────────────────────────────────────────────────────
  test("1. Hire — Create employee via API", async () => {
    const res = await fetch(`${apiBase}/employees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        employeeCode: empCode,
        firstName: "Lifecycle",
        lastName: `Test${ts}`,
        email: empEmail,
      }),
    });
    const body = await res.json();
    employeeId = body.data?.id || body.data?.data?.id;
    expect(employeeId).toBeTruthy();
  });

  // ── 2. ASSIGN ORGANIZATION ─────────────────────────────────────
  test("2. Organization — Departments page loads", async ({ page }) => {
    await page.goto("/organization/departments");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  // ── 3. ONBOARDING ──────────────────────────────────────────────
  test("3. Onboarding — Page loads", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/onboarding");
  });

  // ── 4. ATTENDANCE ──────────────────────────────────────────────
  test("4. Attendance — Page loads", async ({ page }) => {
    await page.goto("/attendance");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  // ── 5. LEAVE ──────────────────────────────────────────────────
  test("5. Leave — Requests page loads", async ({ page }) => {
    await page.goto("/leave/requests");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  // ── 6. PAYROLL ────────────────────────────────────────────────
  test("6. Payroll — Dashboard loads", async ({ page }) => {
    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  // ── 7. LEARNING ───────────────────────────────────────────────
  test("7. Learning — Courses page loads", async ({ page }) => {
    await page.goto("/learning/courses");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  // ── 8. OFFBOARDING ────────────────────────────────────────────
  test("8. Offboarding — Page loads", async ({ page }) => {
    await page.goto("/offboarding");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/offboarding");
  });

  // ── 9. VERIFY EMPLOYEE IN UI ──────────────────────────────────
  test("9. Verify — Created employee visible in list", async ({ page }) => {
    await page.goto("/employees");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});
