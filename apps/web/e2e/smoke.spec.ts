import { test, expect, attachRuntimeErrorTracker, STORAGE_STATE } from "./fixtures";

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
    await adminPage.goto("/employees");
    await expect(adminPage).not.toHaveURL(/\/auth\/sign-in/);
    await adminPage.reload();
    await expect(adminPage).toHaveURL(/\/employees/);

    // 2. Manager session persistence
    await managerPage.goto("/attendance");
    await expect(managerPage).not.toHaveURL(/\/auth\/sign-in/);
    await managerPage.reload();
    await expect(managerPage).toHaveURL(/\/attendance/);

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
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await usernameInput.fill("probation.emp");
    await passwordInput.fill(SEED_PASSWORD);

    const permSessionPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/auth/permission-session") &&
        res.request().method() === "POST",
    );

    await submitButton.click();
    const permRes = await permSessionPromise;
    expect(permRes.status()).toBe(200);

    await page.waitForURL((url) => !url.pathname.startsWith("/auth/sign-in") && url.pathname !== "/", {
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
    await expect(userMenuButton).toBeVisible({ timeout: 10000 });
    const signOutItem = page.getByRole("menuitem", { name: /Đăng xuất/i });
    await expect(async () => {
      if (!(await signOutItem.isVisible())) {
        await userMenuButton.click();
      }
      await expect(signOutItem).toBeVisible({ timeout: 2000 });
      await signOutItem.click();
    }).toPass({ timeout: 10000 });

    await page.waitForURL((url) => url.pathname.startsWith("/auth/sign-in"), {
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/auth\/sign-in/);

    tracker.assertClean();
    await context.close();
  });

  test("recovers seamlessly after idle-tab access_token expiry via Next.js proxy without console.error or Dev Overlay", async ({
    adminContext,
    adminPage,
  }) => {
    const authConsoleErrors: string[] = [];
    adminPage.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        (msg.text().includes("auth_refresh_failed") ||
          msg.text().includes("auth_fetch_refresh_failed"))
      ) {
        authConsoleErrors.push(msg.text());
      }
    });

    await adminPage.goto("/employees");
    await expect(adminPage).toHaveURL(/\/employees/);

    // 1. Simulate idle tab: force first background API call to return 401 so client-side
    // customFetch + auth-store executes POST /api/v1/auth/refresh through Next.js rewrite proxy
    let injectedExpired401 = false;
    await adminPage.route("**/api/v1/platform-notifications/my-notifications*", async (route) => {
      if (!injectedExpired401) {
        injectedExpired401 = true;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "AUTH_TOKEN_INVALID",
              message: "Invalid or expired token",
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    const refreshResponsePromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/auth/refresh") &&
        res.request().method() === "POST",
    );
    const retriedNotificationsPromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/platform-notifications/my-notifications") &&
        res.status() === 200,
    );

    // Trigger window focus (as when user returns to an idle tab) to fire background refetch
    await adminPage.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    const refreshRes = await refreshResponsePromise;
    expect(refreshRes.status()).toBe(200);

    const notifRes = await retriedNotificationsPromise;
    expect(notifRes.status()).toBe(200);
    await expect(adminPage).toHaveURL(/\/employees/);
    expect(authConsoleErrors).toEqual([]);

    // 2. Also verify SSR cookie-expiry recovery when access_token cookie is expired/removed
    const existingCookies = await adminContext.cookies();
    const keepCookies = existingCookies.filter((c) => c.name !== "access_token");
    await adminContext.clearCookies();
    await adminContext.addCookies(keepCookies);

    await adminPage.reload();
    await expect(adminPage).toHaveURL(/\/employees/);
    expect(adminPage.url()).not.toContain("refreshAttempt=");

    // 3. Verify a second consecutive 30m access_token cookie expiry also recovers (no sticky refreshAttempt=1 logout)
    const secondCookies = await adminContext.cookies();
    await adminContext.clearCookies();
    await adminContext.addCookies(secondCookies.filter((c) => c.name !== "access_token"));
    await adminPage.reload();
    await expect(adminPage).toHaveURL(/\/employees/);
    expect(adminPage.url()).not.toContain("refreshAttempt=");

    const refreshedCookies = await adminContext.cookies();
    expect(refreshedCookies.some((c) => c.name === "access_token")).toBe(true);
    expect(authConsoleErrors).toEqual([]);
    await adminContext.storageState({ path: STORAGE_STATE.admin });
  });
});
