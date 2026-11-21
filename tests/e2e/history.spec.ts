import { test, expect } from '@playwright/test';
import { openApp, drag, pixel, selectTool, setSize, action, WHITE, BLACK } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

async function stroke(page: import('@playwright/test').Page, y: number) {
  await selectTool(page, 'brush');
  await setSize(page, 6);
  await drag(page, [
    [50, y],
    [250, y],
  ]);
}

test('快捷鍵復原與重做', async ({ page }) => {
  await stroke(page, 100);
  await stroke(page, 200);
  await page.keyboard.press('ControlOrMeta+z');
  expect(await pixel(page, 150, 200)).toBe(WHITE);
  expect(await pixel(page, 150, 100)).toBe(BLACK);
  await page.keyboard.press('ControlOrMeta+z');
  expect(await pixel(page, 150, 100)).toBe(WHITE);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  expect(await pixel(page, 150, 100)).toBe(BLACK);
  await page.keyboard.press('ControlOrMeta+y');
  expect(await pixel(page, 150, 200)).toBe(BLACK);
});

test('工具列按鈕復原與重做，並依狀態停用', async ({ page }) => {
  await expect(page.locator('[data-action=undo]')).toBeDisabled();
  await stroke(page, 100);
  await expect(page.locator('[data-action=undo]')).toBeEnabled();
  await action(page, 'undo');
  expect(await pixel(page, 150, 100)).toBe(WHITE);
  await expect(page.locator('[data-action=redo]')).toBeEnabled();
  await action(page, 'redo');
  expect(await pixel(page, 150, 100)).toBe(BLACK);
});

test('調整滑桿後 Cmd+Z 仍然有效', async ({ page }) => {
  await stroke(page, 100);
  await page.locator('[data-control=size]').focus();
  await page.keyboard.press('ControlOrMeta+z');
  expect(await pixel(page, 150, 100)).toBe(WHITE);
});

test('中文輸入法下 Cmd+Z 仍然有效（以實體按鍵判斷）', async ({ page }) => {
  await stroke(page, 100);
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ㄈ',
        code: 'KeyZ',
        metaKey: true,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  expect(await pixel(page, 150, 100)).toBe(WHITE);
});

test('新的操作會清除重做紀錄', async ({ page }) => {
  await stroke(page, 100);
  await page.keyboard.press('ControlOrMeta+z');
  await stroke(page, 200);
  await expect(page.locator('[data-action=redo]')).toBeDisabled();
});
