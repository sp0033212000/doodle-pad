import { test, expect } from '@playwright/test';
import { openApp, clickAt, drag, pixel, selectTool, setSize, action, BLACK } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

const zoomLabel = (page: import('@playwright/test').Page) => page.locator('[data-action=zoom-reset]');

test('縮放快捷鍵與狀態列按鈕', async ({ page }) => {
  await expect(zoomLabel(page)).toHaveText('100%');
  await page.keyboard.press('ControlOrMeta+=');
  await expect(zoomLabel(page)).toHaveText('150%');
  await action(page, 'zoom-in');
  await expect(zoomLabel(page)).toHaveText('200%');
  await action(page, 'zoom-out');
  await expect(zoomLabel(page)).toHaveText('150%');
  await page.keyboard.press('ControlOrMeta+0');
  await expect(zoomLabel(page)).toHaveText('100%');
});

test('觸控板捏合（Ctrl + 滾輪）會縮放', async ({ page }) => {
  const box = await page.locator('#draw').boundingBox();
  await page.mouse.move(box!.x + 100, box!.y + 100);
  await page.keyboard.down('Control');
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -20);
  await page.keyboard.up('Control');
  const pct = parseInt((await zoomLabel(page).textContent()) ?? '100');
  expect(pct).toBeGreaterThan(100);
});

test('縮放後繪圖座標仍正確', async ({ page }) => {
  await action(page, 'zoom-in');
  await action(page, 'zoom-in');
  await expect(zoomLabel(page)).toHaveText('200%');
  // 以畫面中心縮放後，左上角可能被捲出可視範圍
  await page.locator('.stage').evaluate(el => el.scrollTo(0, 0));
  await selectTool(page, 'pencil');
  await setSize(page, 1);
  await clickAt(page, 60, 60);
  expect(await pixel(page, 60, 60)).toBe(BLACK);
  await drag(page, [[70, 80], [120, 80]]);
  expect(await pixel(page, 95, 80)).toBe(BLACK);
});
