import { test as setup } from "@playwright/test";

const authFile = "playwright/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await page.waitForLoadState("networkidle");

  await page.fill('input[name="username"]', "admin");
  await page.fill('input[type="password"]', "123456");
  await page.click('button[type="submit"]');

  // Wait for login to process and network to settle
  await page.waitForTimeout(3000);
  await page.waitForLoadState("networkidle");

  await page.context().storageState({ path: authFile });
});
