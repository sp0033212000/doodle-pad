import { test, expect, type Page } from '@playwright/test';
import { openApp, pixel, canvasSize, pasteImage, pasteInternal, action, WHITE, BLUE } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

const obj = (page: Page) => page.locator('.paste-obj');

async function dragBy(page: Page, selector: string, dx: number, dy: number) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} not visible`);
  // 從中心開始拖曳（物件靠近頂端時，操作列會放在物件內的左上角）
  const sx = box.x + box.width / 2,
    sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + dx / 2, sy + dy / 2);
  await page.mouse.move(sx + dx, sy + dy);
  await page.mouse.up();
}

const rect = (page: Page) =>
  obj(page)
    .first()
    .evaluate(el => {
      const s = (el as HTMLElement).style;
      return [parseInt(s.left), parseInt(s.top), parseInt(s.width), parseInt(s.height)];
    });

test('貼上的圖片成為可編輯物件，失焦後仍保留', async ({ page }) => {
  await pasteImage(page, 100, 80, '#3f48cc');
  expect(await pixel(page, 10, 10)).toBe(WHITE); // 尚未畫進畫布
  await page.keyboard.press('Escape');
  await expect(obj(page)).toHaveCount(1);
  await expect(obj(page)).not.toHaveClass(/selected/);
});

test('物件可移動、縮放，鎖定後才畫進畫布，並可復原', async ({ page }) => {
  await pasteImage(page, 100, 80, '#3f48cc');
  await dragBy(page, '.paste-obj', 100, 50);
  expect(await rect(page)).toEqual([100, 50, 100, 80]);

  await dragBy(page, '.obj-resize', 50, 40);
  expect(await rect(page)).toEqual([100, 50, 150, 120]);

  await page.keyboard.press('Enter'); // 鎖定
  await expect(obj(page)).toHaveCount(0);
  expect(await pixel(page, 200, 100)).toBe(BLUE);

  await page.keyboard.press('ControlOrMeta+z');
  await expect(obj(page)).toHaveCount(1);
  expect(await pixel(page, 200, 100)).toBe(WHITE);
});

test('操作列：鎖定與刪除按鈕', async ({ page }) => {
  await pasteImage(page, 60, 60, '#3f48cc');
  await action(page, 'obj-lock');
  expect(await pixel(page, 30, 30)).toBe(BLUE);

  await pasteImage(page, 60, 60, '#3f48cc');
  await action(page, 'obj-delete');
  await expect(obj(page)).toHaveCount(0);
});

test('物件複製後貼上會錯開，剪下後貼回原位', async ({ page }) => {
  await pasteImage(page, 60, 40, '#3f48cc');
  await page.keyboard.press('ControlOrMeta+c');
  await pasteInternal(page);
  await expect(obj(page)).toHaveCount(2);
  const second = await obj(page)
    .nth(1)
    .evaluate(el => (el as HTMLElement).style.left);
  expect(second).toBe('10px');

  await page.keyboard.press('ControlOrMeta+x');
  await expect(obj(page)).toHaveCount(1);
  await pasteInternal(page);
  await expect(obj(page)).toHaveCount(2);
  expect(
    await obj(page)
      .nth(1)
      .evaluate(el => (el as HTMLElement).style.left),
  ).toBe('10px');
});

test('貼上比畫布大的圖片時，只擴大不足的那一邊', async ({ page }) => {
  const before = await canvasSize(page);
  await pasteImage(page, before.w + 200, 50, '#3f48cc');
  expect(await canvasSize(page)).toEqual({ w: before.w + 200, h: before.h });
  await page.keyboard.press('ControlOrMeta+z');
  expect(await canvasSize(page)).toEqual(before);
});

test('存檔時包含未鎖定的物件並下載 PNG', async ({ page }) => {
  await pasteImage(page, 60, 60, '#3f48cc');
  const [download] = await Promise.all([page.waitForEvent('download'), action(page, 'save')]);
  expect(download.suggestedFilename()).toMatch(/^doodle-pad-.*\.png$/);
});
