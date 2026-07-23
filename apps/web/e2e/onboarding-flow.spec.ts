import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Onboarding Flow', () => {
  test('should display onboarding processes tab', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    // Should have tabs: Quy trình and Mẫu Template
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();
  });

  test('should show templates tab', async ({ page }) => {
    await page.goto('/onboarding?tab=templates');
    await page.waitForLoadState('networkidle');
    const templatesTab = page.locator('[role="tab"]').filter({ hasText: 'Mẫu Template' });
    await expect(templatesTab).toBeVisible();
  });

  test('should navigate to onboarding from sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebarLink = page.locator('nav a').filter({ hasText: 'Onboarding' });
    if (await sidebarLink.count() > 0) {
      await sidebarLink.click();
      await expect(page).toHaveURL(/\/onboarding/);
    }
  });
});
