import { test, expect } from "@playwright/test";

test.describe("Payroll Flow", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("1. Payroll dashboard loads", async ({ page }) => {
    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("2. Payroll periods page loads", async ({ page }) => {
    await page.goto("/payroll/periods");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("3. Payroll runs page loads", async ({ page }) => {
    await page.goto("/payroll/runs");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("4. Payslips page loads", async ({ page }) => {
    await page.goto("/payroll/payslips");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("5. Salary structures page loads", async ({ page }) => {
    await page.goto("/payroll/salary-structures");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});
