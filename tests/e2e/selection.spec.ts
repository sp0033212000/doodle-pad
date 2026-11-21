import { test, expect } from '@playwright/test';
import {
  openApp, drag, clickAt, pixel, canvasSize, selectTool, drawFilledRect, pasteInternal, action,
  WHITE, RED, BLUE, PALETTE,
} from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

test('矩形選取後按 Delete 清除內容', async ({ page }) => {
  await drawFilledRect(page, PALETTE.red, [50, 50], [150, 130]);
  await selectTool(page, 'select');
  await drag(page, [[40, 40], [160, 140]]);
  await expect(page.locator('.sel-box')).toBeVisible();
  await page.keyboard.press('Delete');
  expect(await pixel(page, 100, 90)).toBe(WHITE);
  await expect(page.locator('.sel-box')).toBeHidden();
});

test('魔術棒選取後剪下再貼上，鎖定回原位', async ({ page }) => {
  await drawFilledRect(page, PALETTE.red, [50, 50], [150, 130]);
  await selectTool(page, 'wand');
  await clickAt(page, 100, 90);
  await expect(page.locator('[data-action=cut]')).toBeEnabled();
  await page.keyboard.press('ControlOrMeta+x');
  expect(await pixel(page, 100, 90)).toBe(WHITE);
  await pasteInternal(page);
  await expect(page.locator('.paste-obj')).toHaveCount(1);
  await page.keyboard.press('Enter');
  expect(await pixel(page, 100, 90)).toBe(RED);
});

test('套索選取後拖曳內部，挖出成物件並移動', async ({ page }) => {
  await drawFilledRect(page, PALETTE.blue, [250, 60], [350, 140]);
  await selectTool(page, 'lasso');
  const poly: [number, number][] = [];
  for (let a = 0; a <= 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    poly.push([Math.round(300 + 75 * Math.cos(t)), Math.round(100 + 60 * Math.sin(t))]);
  }
  await drag(page, poly);
  await expect(page.locator('.sel-box')).toBeVisible();

  await drag(page, [[300, 100], [300, 180], [300, 250]]);
  await expect(page.locator('.paste-obj')).toHaveCount(1);
  expect(await pixel(page, 300, 100)).toBe(WHITE);        // 原處以次色填滿

  await page.keyboard.press('Enter');
  expect(await pixel(page, 300, 250)).toBe(BLUE);
});

test('選取操作列：轉為物件', async ({ page }) => {
  await drawFilledRect(page, PALETTE.red, [50, 50], [150, 130]);
  await selectTool(page, 'select');
  await drag(page, [[40, 40], [160, 140]]);
  await action(page, 'sel-lift');
  await expect(page.locator('.paste-obj.selected')).toHaveCount(1);
  expect(await pixel(page, 100, 90)).toBe(WHITE);
});

test('Cmd+A 全選、Esc 取消', async ({ page }) => {
  await page.keyboard.press('ControlOrMeta+a');
  const { w } = await canvasSize(page);
  await expect(page.locator('.sel-box')).toHaveCSS('width', `${w}px`);
  await page.keyboard.press('Escape');
  await expect(page.locator('.sel-box')).toBeHidden();
});

test('用繪圖工具點畫布會取消選取', async ({ page }) => {
  await selectTool(page, 'select');
  await drag(page, [[40, 40], [160, 140]]);
  await selectTool(page, 'pencil');
  await expect(page.locator('.sel-box')).toBeHidden();
});
