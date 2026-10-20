import { test, expect, attachRuntimeErrorTracker } from "./fixtures";

const SEED_PASSWORD = process.env.SEED_PASSWORD || "123456";

test.describe("E2E-0: Multi-Role Auth & Session Persistence Smoke Suite", () => {
  test("sign-in page renders login form for unauthenticated visitor", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    const tracker = attachRuntimeErrorTracker(page);

    await page.goto("/auth/sign-in");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    tracker.assertClean();
    await context.close();
  });

  test("persists authenticated storageState across page reload for admin, manager, and employee", async ({
    adminPage,
    managerPage,
    employeePage,
  }) => {
    // 1. Admin session persistence
    await adminPage.goto("/overview");
    await expect(adminPage).not.toHaveURL(/\/auth\/sign-in/);
    await adminPage.reload();
    await expect(adminPage).toHaveURL(/\/overview/);

    // 2. Manager session persistence
    await managerPage.goto("/leave/requests");
    await expect(managerPage).not.toHaveURL(/\/auth\/sign-in/);
    await managerPage.reload();
    await expect(managerPage).toHaveURL(/\/leave\/requests/);

    // 3. Employee session persistence
    await employeePage.goto("/account/profile");
    await expect(employeePage).not.toHaveURL(/\/auth\/sign-in/);
    await employeePage.reload();
    await expect(employeePage).toHaveURL(/\/account\/profile/);
  });

  test("executes full UI sign-in, session reload, and sign-out lifecycle cleanly", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    const tracker = attachRuntimeErrorTracker(page);

    await page.goto("/auth/sign-in");
    await page.locator('input[name="username"]').fill("probation.emp");
    await page.locator('input[name="password"]').fill(SEED_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.startsWith("/auth/sign-in"), {
      timeout: 20000,
    });

    // Reload to verify cookie-backed session bootstrap
    await page.reload();
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);

    // Open user menu in sidebar footer and trigger sign out
    const userMenuButton = page
      .locator('[data-sidebar="footer"]')
      .getByRole("button")
      .last();
    const signOutItem = page.getByRole("menuitem", { name: /Đăng xuất/i });
    await expect(async () => {
      if (!(await signOutItem.isVisible())) {
        await userMenuButton.click();
      }
      await expect(signOutItem).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 10000 });
    await signOutItem.click();

    await page.waitForURL((url) => url.pathname.startsWith("/auth/sign-in"), {
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/auth\/sign-in/);

    tracker.assertClean();
    await context.close();
  });
});
