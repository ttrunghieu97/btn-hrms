import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Performance Flow', () => {
  test('should display performance cycles page', async ({ page }) => {
    await page.goto('/performance/cycles');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2')).toContainText('Chu kỳ đánh giá');
  });

  test('should display performance reviews page', async ({ page }) => {
    await page.goto('/performance/reviews');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h2');
    await expect(heading).toBeVisible();
  });

  test('should display performance goals page', async ({ page }) => {
    await page.goto('/performance/goals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2')).toContainText('Mục tiêu');
  });

  test('should navigate from sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebarLink = page.locator('nav a').filter({ hasText: 'Hiệu suất' });
    if (await sidebarLink.count() > 0) {
      await sidebarLink.click();
      await expect(page).toHaveURL(/\/performance/);
    }
  });
});
