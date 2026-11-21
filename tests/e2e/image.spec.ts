import { test, expect, type Page } from '@playwright/test';
import {
  openApp, drag, pixel, canvasSize, selectTool, drawFilledRect, pasteImage, action,
  RED, PALETTE,
} from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

async function openResize(page: Page) {
  await action(page, 'resize');
  await expect(page.locator('.dialog')).toBeVisible();
}

test('裁切成選取範圍，並可復原', async ({ page }) => {
  const before = await canvasSize(page);
  await drawFilledRect(page, PALETTE.red, [100, 100], [200, 180]);
  await selectTool(page, 'select');
  await drag(page, [[80, 80], [240, 220]]);
  await expect(page.locator('[data-action=crop]')).toBeEnabled();
  await page.keyboard.press('ControlOrMeta+Shift+x');
  expect(await canvasSize(page)).toEqual({ w: 160, h: 140 });
  expect(await pixel(page, 50, 50)).toBe(RED);

  await page.keyboard.press('ControlOrMeta+z');
  expect(await canvasSize(page)).toEqual(before);
});

test('裁切按鈕在沒有選取範圍時停用', async ({ page }) => {
  await expect(page.locator('[data-action=crop]')).toBeDisabled();
});

test('調整整張圖片大小 50%（維持長寬比）', async ({ page }) => {
  const before = await canvasSize(page);
  await openResize(page);
  const [w, h] = [page.locator('.dialog .num').nth(0), page.locator('.dialog .num').nth(1)];
  await w.fill('50');
  await expect(h).toHaveValue('50');
  await action(page, 'dialog-ok');
  await expect(page.locator('.dialog')).toBeHidden();
  expect(await canvasSize(page)).toEqual({ w: Math.round(before.w / 2), h: Math.round(before.h / 2) });
});

test('調整選取物件的大小（像素）', async ({ page }) => {
  await pasteImage(page, 100, 80, '#3f48cc');
  await openResize(page);
  await expect(page.locator('.dialog')).toContainText('物件');
  await page.locator('.dialog input[value=pixel]').check();
  await page.locator('.dialog .num').nth(0).fill('200');
  await expect(page.locator('.dialog .num').nth(1)).toHaveValue('160');
  await page.keyboard.press('Enter');
  const size = await page.locator('.paste-obj').evaluate(el => [(el as HTMLElement).style.width, (el as HTMLElement).style.height]);
  expect(size).toEqual(['200px', '160px']);
});

test('對話框開啟時快捷鍵不作用，Esc 關閉', async ({ page }) => {
  await openResize(page);
  await page.keyboard.press('b');
  await expect(page.locator('[data-tool=brush]')).not.toHaveClass(/active/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.dialog')).toBeHidden();
});

test('拖曳畫布右下角調整畫布大小', async ({ page }) => {
  const before = await canvasSize(page);
  const box = await page.locator('.resize-handle').boundingBox();
  if (!box) throw new Error('handle not visible');
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x - 95, box.y - 45);
  await page.mouse.up();
  expect(await canvasSize(page)).toEqual({ w: before.w - 100, h: before.h - 50 });
});
