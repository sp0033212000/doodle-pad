import { test, expect } from '@playwright/test';
import {
  openApp, drag, clickAt, pixel, inkCount, selectTool, pickColor, setSize, setShapeMode,
  drawFilledRect, toScreen, WHITE, BLACK, RED, BLUE, PALETTE,
} from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

test('鉛筆會套用粗細設定', async ({ page }) => {
  await selectTool(page, 'pencil');
  await setSize(page, 10);
  await drag(page, [[100, 100], [200, 100]]);
  expect(await pixel(page, 150, 96)).toBe(BLACK);
  expect(await pixel(page, 150, 104)).toBe(BLACK);
  expect(await pixel(page, 150, 108)).toBe(WHITE);
});

test('鉛筆單點也會畫出點', async ({ page }) => {
  await selectTool(page, 'pencil');
  await setSize(page, 1);
  await clickAt(page, 50, 50);
  expect(await pixel(page, 50, 50)).toBe(BLACK);
});

test('筆刷畫出平滑筆觸', async ({ page }) => {
  await selectTool(page, 'brush');
  await setSize(page, 8);
  await drag(page, [[50, 200], [250, 200]]);
  expect(await pixel(page, 150, 200)).toBe(BLACK);
  expect(await pixel(page, 150, 215)).toBe(WHITE);
});

test('右鍵使用次色', async ({ page }) => {
  await selectTool(page, 'brush');
  await setSize(page, 8);
  await page.locator('.palette > div').nth(PALETTE.red).click({ button: 'right' });
  const a = await toScreen(page, 50, 50);
  const b = await toScreen(page, 150, 50);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(b.x, b.y);
  await page.mouse.up({ button: 'right' });
  expect(await pixel(page, 100, 50)).toBe(RED);
});

test('矩形：外框與填滿模式', async ({ page }) => {
  await selectTool(page, 'rect');
  await setShapeMode(page, 'stroke');
  await drag(page, [[50, 50], [150, 130]]);
  expect(await pixel(page, 100, 90)).toBe(WHITE);
  expect(await inkCount(page, 45, 45, 110, 10)).toBeGreaterThan(0);

  await drawFilledRect(page, PALETTE.red, [200, 50], [300, 130]);
  expect(await pixel(page, 250, 90)).toBe(RED);
});

test('橢圓與直線', async ({ page }) => {
  await setShapeMode(page, 'fill');
  await selectTool(page, 'ellipse');
  await pickColor(page, PALETTE.blue);
  await drag(page, [[50, 50], [200, 150]]);
  expect(await pixel(page, 125, 100)).toBe(BLUE);
  expect(await pixel(page, 52, 52)).toBe(WHITE);

  await selectTool(page, 'line');
  await setSize(page, 4);
  await drag(page, [[50, 300], [300, 300]]);
  expect(await pixel(page, 175, 300)).toBe(BLUE);
});

test('油漆桶填滿封閉區域', async ({ page }) => {
  await selectTool(page, 'rect');
  await setShapeMode(page, 'stroke');
  await setSize(page, 3);
  await drag(page, [[50, 50], [150, 130]]);
  await selectTool(page, 'fill');
  await pickColor(page, PALETTE.yellow);
  await clickAt(page, 100, 90);
  expect(await pixel(page, 100, 90)).toBe('255,242,0');
  expect(await pixel(page, 300, 300)).toBe(WHITE);
});

test('滴管吸取顏色', async ({ page }) => {
  await drawFilledRect(page, PALETTE.red, [50, 50], [150, 130]);
  await pickColor(page, PALETTE.black);
  await selectTool(page, 'picker');
  await clickAt(page, 100, 90);
  await selectTool(page, 'brush');
  await setSize(page, 6);
  await drag(page, [[50, 300], [200, 300]]);
  expect(await pixel(page, 125, 300)).toBe(RED);
});

test('橡皮擦以次色擦除', async ({ page }) => {
  await drawFilledRect(page, PALETTE.red, [50, 50], [250, 150]);
  await selectTool(page, 'eraser');
  await setSize(page, 10);
  await drag(page, [[60, 100], [240, 100]]);
  expect(await pixel(page, 150, 100)).toBe(WHITE);
  expect(await pixel(page, 150, 60)).toBe(RED);
});

test('噴槍會留下顏色', async ({ page }) => {
  await selectTool(page, 'spray');
  await setSize(page, 10);
  await drag(page, [[100, 100], [140, 100], [180, 100]]);
  expect(await inkCount(page, 70, 70, 140, 60)).toBeGreaterThan(10);
});

test('文字工具輸入後畫到畫布上', async ({ page }) => {
  await selectTool(page, 'text');
  await setSize(page, 6);
  await clickAt(page, 100, 100);
  await expect(page.locator('.text-input')).toBeVisible();
  await page.keyboard.type('Hi 你好');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('.text-input')).toBeHidden();
  expect(await inkCount(page, 100, 100, 150, 40)).toBeGreaterThan(20);
});

test('工具快捷鍵與粗細快捷鍵', async ({ page }) => {
  await page.keyboard.press('b');
  await expect(page.locator('[data-tool=brush]')).toHaveClass(/active/);
  await page.keyboard.press('o');
  await expect(page.locator('[data-tool=ellipse]')).toHaveClass(/active/);
  await setSize(page, 5);
  await page.keyboard.press(']');
  await expect(page.locator('[data-control=size]')).toHaveValue('6');
});

test('中文輸入法下的工具快捷鍵（以實體按鍵判斷）', async ({ page }) => {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ㄖ', code: 'KeyB', bubbles: true, cancelable: true }));
  });
  await expect(page.locator('[data-tool=brush]')).toHaveClass(/active/);
});
