import { test as setup } from "@playwright/test";

const authFile = "playwright/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await page.waitForLoadState("networkidle");

  await page.fill('input[name="username"]', "admin");
  await page.fill('input[type="password"]', "123456");
  await page.click('button[type="submit"]');

  // Wait for login redirect to complete and page to settle
  await page.waitForURL((url) => !url.pathname.includes('/auth/sign-in'), { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  await page.context().storageState({ path: authFile });
});
