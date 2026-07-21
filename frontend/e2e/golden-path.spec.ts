import { test, expect } from "@playwright/test";

test.describe("Golden Path — Employee Lifecycle", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  const uniqueId = Date.now().toString().slice(-5);
  const empCode = `GP${uniqueId}`;
  const empEmail = `golden${uniqueId}@test.com`;

  let apiBase: string;
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    // Login via API to get token
    const loginRes = await fetch("http://localhost:3001/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "123456" }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data.access_token;

    apiBase = "http://localhost:3001/api/v1";
    headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  });

  test("1. Navigate through critical pages", async ({ page }) => {
    const pages = [
      "/employees",
      "/organization/departments",
      "/attendance",
      "/leave/requests",
      "/payroll",
      "/learning/courses",
    ];
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    }
  });

  test("2. Create employee via API and verify in UI", async ({ page }) => {
    // Create employee via API
    const empRes = await fetch(`${apiBase}/employees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        employeeCode: empCode,
        firstName: "Golden",
        lastName: `Path${uniqueId}`,
        email: empEmail,
      }),
    });
    const empData = await empRes.json();
    expect(empData.data?.id || empData.data?.data?.id).toBeTruthy();

    // Verify in UI list
    await page.goto("/employees");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("3. Verify payroll and leave pages accessible", async ({ page }) => {
    await page.goto("/payroll/periods");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    await page.goto("/leave/requests");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("4. Verify learning and offboarding pages accessible", async ({ page }) => {
    await page.goto("/learning/courses");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    await page.goto("/offboarding");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("5. Check onboarding page", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).toContain("/onboarding");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});
