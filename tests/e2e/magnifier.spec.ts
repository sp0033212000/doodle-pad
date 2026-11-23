import { test, expect, type Page } from '@playwright/test';
import { openApp, clickAt, drag, pixel, selectTool, setSize, action, BLACK, WHITE } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

const zoomLabel = (page: Page) => page.locator('[data-action=zoom-reset]');
const setMagnify = (page: Page, v: number) => page.locator('[data-control=magnify]').fill(String(v));

/** 畫布座標 (x, y) 目前在可見區域中的相對位置（0–1） */
async function viewportPos(page: Page, x: number, y: number) {
  return page.evaluate(
    ([px, py]) => {
      const stage = document.querySelector('.stage')!;
      const canvas = document.querySelector('#draw') as HTMLCanvasElement;
      const sr = stage.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      const z = cr.width / canvas.width;
      return {
        x: (cr.left + (px + 0.5) * z - sr.left) / stage.clientWidth,
        y: (cr.top + (py + 0.5) * z - sr.top) / stage.clientHeight,
      };
    },
    [x, y],
  );
}

const nearCenter = (p: { x: number; y: number }) => Math.abs(p.x - 0.5) < 0.1 && Math.abs(p.y - 0.5) < 0.1;

test('只在放大鏡工具顯示倍率欄位', async ({ page }) => {
  await expect(page.locator('[data-control=magnify]')).toHaveCount(0);
  await selectTool(page, 'magnifier');
  await expect(page.locator('[data-control=magnify]')).toHaveValue('8');
});

test('點一下：以輸入的倍率放大，點的位置在畫面中央，並切回原本的工具', async ({ page }) => {
  await selectTool(page, 'pencil');
  await selectTool(page, 'magnifier');
  await setMagnify(page, 16);
  await clickAt(page, 200, 150);
  await expect(zoomLabel(page)).toHaveText('1600%');
  expect(nearCenter(await viewportPos(page, 200, 150))).toBe(true);
  await expect(page.locator('[data-tool=pencil]')).toHaveClass(/active/);
});

test('拖曳選取範圍：範圍中心放大到畫面中央', async ({ page }) => {
  await selectTool(page, 'magnifier');
  await setMagnify(page, 10);
  await drag(page, [
    [40, 40],
    [80, 60],
  ]);
  await expect(zoomLabel(page)).toHaveText('1000%');
  expect(nearCenter(await viewportPos(page, 60, 50))).toBe(true);
});

test('放大後以像素為單位編輯：1px 鉛筆只改到點到的那一格', async ({ page }) => {
  await selectTool(page, 'pencil');
  await setSize(page, 1);
  await selectTool(page, 'magnifier');
  await setMagnify(page, 20);
  await clickAt(page, 100, 100);
  await expect(zoomLabel(page)).toHaveText('2000%');

  await clickAt(page, 101, 100);
  expect(await pixel(page, 101, 100)).toBe(BLACK);
  for (const [x, y] of [
    [100, 100],
    [102, 100],
    [101, 99],
    [101, 101],
  ]) {
    expect(await pixel(page, x, y), `${x},${y}`).toBe(WHITE);
  }
});

test('放大到 4 倍以上顯示像素格線，縮回後隱藏', async ({ page }) => {
  const grid = page.locator('.pixel-grid');
  await expect(grid).toBeHidden();
  await selectTool(page, 'magnifier');
  await setMagnify(page, 8);
  await clickAt(page, 50, 50);
  await expect(grid).toBeVisible();
  await action(page, 'zoom-reset');
  await expect(grid).toBeHidden();
});

test('右鍵縮回 100%；倍率限制在 2–64', async ({ page }) => {
  await selectTool(page, 'magnifier');
  await setMagnify(page, 200);
  await page.locator('[data-control=magnify]').press('Tab');
  await expect(page.locator('[data-control=magnify]')).toHaveValue('64');
  await clickAt(page, 50, 50);
  await expect(zoomLabel(page)).toHaveText('6400%');

  await selectTool(page, 'magnifier');
  const box = (await page.locator('.stage').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
  await expect(zoomLabel(page)).toHaveText('100%');
});
