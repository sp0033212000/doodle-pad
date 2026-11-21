import { test, expect } from '@playwright/test';
import { openApp, drag, pixel, BLACK } from './helpers';

test.describe('平板直向（iPad 820×1180，觸控）', () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false });

  test.beforeEach(async ({ page }) => openApp(page));

  test('改用側邊工具列，上方工具列隱藏', async ({ page }) => {
    await expect(page.getByTestId('side-toolbar')).toBeVisible();
    await expect(page.locator('.toolbar')).toHaveCount(0);
  });

  test('側邊按鈕至少 44px', async ({ page }) => {
    for (const sel of ['[data-tool=pencil]', '[data-action=menu]', '[data-action=undo]']) {
      const box = await page.locator(`.side-toolbar ${sel}`).boundingBox();
      expect(box!.width, sel).toBeGreaterThanOrEqual(44);
      expect(box!.height, sel).toBeGreaterThanOrEqual(44);
    }
  });

  test('側邊工具列可切換工具並繪圖、復原', async ({ page }) => {
    await page.locator('.side-toolbar [data-tool=brush]').click();
    await expect(page.locator('.side-toolbar [data-tool=brush]')).toHaveClass(/active/);
    await drag(page, [
      [50, 100],
      [250, 100],
    ]);
    expect(await pixel(page, 150, 100)).toBe(BLACK);
    await page.locator('.side-toolbar [data-action=undo]').click();
    expect(await pixel(page, 150, 100)).not.toBe(BLACK);
  });

  test('選單展開設定面板，可調整粗細；點背景關閉', async ({ page }) => {
    await page.locator('[data-action=menu]').click();
    const drawer = page.getByTestId('settings-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-action=export-project]')).toBeVisible();
    await drawer.locator('[data-control=size]').fill('20');
    await expect(drawer.locator('[data-control=size]')).toHaveValue('20');

    await page.getByTestId('drawer-backdrop').click({ position: { x: 600, y: 600 } });
    await expect(drawer).toBeHidden();
  });
});

test.describe('桌機', () => {
  test('使用上方工具列，沒有側邊工具列', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('.toolbar')).toBeVisible();
    await expect(page.getByTestId('side-toolbar')).toHaveCount(0);
  });
});
