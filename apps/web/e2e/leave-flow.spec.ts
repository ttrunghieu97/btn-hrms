import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Leave Flow', () => {
  test('should display leave requests page', async ({ page }) => {
    await page.goto('/leave/requests');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2')).toContainText('Đơn nghỉ phép');
  });

  test('should display create leave button', async ({ page }) => {
    await page.goto('/leave/requests');
    await page.waitForLoadState('networkidle');
    const createBtn = page.locator('button').filter({ hasText: 'Tạo đơn nghỉ phép' });
    await expect(createBtn).toBeVisible();
  });

  test('should display leave policies page', async ({ page }) => {
    await page.goto('/leave/policies');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('chính sách nghỉ phép');
  });

  test('should navigate from sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebarLink = page.locator('nav a').filter({ hasText: 'Nghỉ phép' });
    if (await sidebarLink.count() > 0) {
      await sidebarLink.click();
      await expect(page).toHaveURL(/\/leave/);
    }
  });
});
