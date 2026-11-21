import { test, expect } from '@playwright/test';
import { openApp, pasteImage } from './helpers';

test.describe('英文瀏覽器', () => {
  test.use({ locale: 'en-US' });

  test('預設顯示英文介面', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('[data-tool=pencil]')).toHaveAttribute('title', 'Pencil (P)');
    await expect(page.locator('[data-action=save]')).toContainText('Save');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('切換成中文後，介面與畫布上的操作列都更新，重新整理後保留', async ({ page }) => {
    await openApp(page);
    await pasteImage(page, 60, 40, '#3f48cc');
    await expect(page.locator('[data-action=obj-lock]')).toContainText('Lock to canvas');

    await page.locator('[data-control=locale]').selectOption('zh-TW');
    await expect(page.locator('[data-action=save]')).toContainText('儲存');
    await expect(page.locator('[data-action=obj-lock]')).toContainText('鎖定到畫布');
    await expect(page.locator('[data-action=obj-lock]')).toHaveAttribute('title', '鎖定到畫布 (Enter)');

    await page.reload();
    await openApp(page);
    await expect(page.locator('[data-action=save]')).toContainText('儲存');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  });
});

test('中文瀏覽器預設顯示繁中，可切換成英文', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('[data-tool=pencil]')).toHaveAttribute('title', '鉛筆 (P)');
  await page.locator('[data-control=locale]').selectOption('en');
  await expect(page.locator('[data-tool=pencil]')).toHaveAttribute('title', 'Pencil (P)');
  await expect(page.locator('.statusbar')).toContainText('Tool: Pencil');
});
