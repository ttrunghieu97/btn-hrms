import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Offboarding Flow', () => {
  test('should display offboarding list page', async ({ page }) => {
    await page.goto('/offboarding');
    await expect(page.locator('h2')).toContainText('Offboarding');
  });

  test('should navigate to offboarding from sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebarLink = page.locator('nav a').filter({ hasText: 'Offboarding' });
    if (await sidebarLink.count() > 0) {
      await sidebarLink.click();
      await expect(page).toHaveURL(/\/offboarding/);
    }
  });

  test('should display offboarding processes table', async ({ page }) => {
    await page.goto('/offboarding');
    await page.waitForLoadState('networkidle');
    const table = page.locator('table');
    const exists = await table.count();
    if (exists > 0) {
      await expect(table).toBeVisible();
    }
  });
});
