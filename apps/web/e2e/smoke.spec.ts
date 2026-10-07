import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("sign-in page loads and has login form", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 15000 });
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
  });
});
