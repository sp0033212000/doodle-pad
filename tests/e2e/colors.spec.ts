import { test, expect, type Page } from '@playwright/test';
import { openApp, drag, clickAt, pixel, selectTool, setSize, action, PALETTE } from './helpers';

const rgb = async (page: Page, x: number, y: number) => (await pixel(page, x, y)).split(',').map(Number);
const near = (actual: number[], expected: number[], tol = 3) =>
  actual.every((v, i) => Math.abs(v - expected[i]) <= tol);

/** 開啟「編輯色彩」，輸入 HEX 後按確定 */
async function setColorViaEditor(page: Page, hex: string) {
  await action(page, 'edit-colors');
  await expect(page.locator('.color-editor')).toBeVisible();
  await page.locator('[data-control=hex]').fill(hex);
  await action(page, 'dialog-ok');
  await expect(page.locator('.color-editor')).toBeHidden();
}

test.beforeEach(async ({ page }) => openApp(page));

test('半透明筆刷：顏色正確混合，線段接點不會疊得更深', async ({ page }) => {
  await setColorViaEditor(page, '#ff000080');
  await selectTool(page, 'brush');
  await setSize(page, 10);
  await drag(page, [
    [50, 100],
    [100, 100],
    [150, 100],
    [200, 100],
  ]);
  const mid = await rgb(page, 75, 100);
  const joint = await rgb(page, 100, 100); // 兩段線段重疊處
  expect(near(mid, [255, 127, 127])).toBe(true);
  expect(near(joint, mid, 1)).toBe(true);
});

test('透明度滑桿與數字欄位同步', async ({ page }) => {
  await action(page, 'edit-colors');
  await page.locator('[data-control=hex]').fill('#00ff00');
  await page.locator('[data-control=alpha]').fill('25');
  await page.locator('[data-control=alpha]').press('Tab');
  await expect(page.locator('[data-control=hex]')).toHaveValue('#00ff0040');
});

test('半透明油漆桶與底色混合', async ({ page }) => {
  await setColorViaEditor(page, '#0000ff80');
  await selectTool(page, 'fill');
  await clickAt(page, 100, 100);
  expect(near(await rgb(page, 100, 100), [127, 127, 255])).toBe(true);
});

test('在飽和度方塊拖曳超出右上角 = 純色（超出邊界會停在邊緣）', async ({ page }) => {
  await action(page, 'edit-colors');
  await page.locator('[data-control=hex]').fill('#ff8080');
  const box = (await page.getByTestId('sv-area').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 40, box.y - 40);
  await page.mouse.up();
  await expect(page.locator('[data-control=hex]')).toHaveValue('#ff0000');
});

test('RGB 欄位修改會更新 HEX', async ({ page }) => {
  await action(page, 'edit-colors');
  await page.locator('[data-control=hex]').fill('#000000');
  await page.locator('[data-control=g]').fill('255');
  await page.locator('[data-control=g]').press('Tab');
  await expect(page.locator('[data-control=hex]')).toHaveValue('#00ff00');
});

test('自訂色彩：加入、重新整理後保留、點選套用、可刪除', async ({ page }) => {
  const filled = page.locator('[data-testid=custom-colors] .slot:not(.empty)');
  await expect(filled).toHaveCount(0);

  await action(page, 'edit-colors');
  await page.locator('[data-control=hex]').fill('#123456');
  await action(page, 'add-custom');
  await action(page, 'dialog-ok');
  await expect(filled).toHaveCount(1);
  await expect(filled.first()).toHaveAttribute('title', '#123456');

  await page.reload();
  await openApp(page);
  await expect(filled).toHaveCount(1);

  await page.locator('.palette > div').nth(PALETTE.red).click();
  await filled.first().click();
  await selectTool(page, 'brush');
  await setSize(page, 8);
  await drag(page, [
    [50, 200],
    [200, 200],
  ]);
  expect(await pixel(page, 120, 200)).toBe('18,52,86');

  await action(page, 'edit-colors');
  await action(page, 'remove-custom');
  await action(page, 'dialog-cancel');
  await expect(filled).toHaveCount(0);
});

test('最近使用的顏色：最新的在最前面，不重複', async ({ page }) => {
  const recent = page.locator('[data-testid=recent-colors] .slot');
  await page.locator('.palette > div').nth(PALETTE.red).click();
  await page.locator('.palette > div').nth(PALETTE.blue).click();
  await page.locator('.palette > div').nth(PALETTE.red).click();
  await expect(recent.nth(0)).toHaveAttribute('title', '#ed1c24');
  await expect(recent.nth(1)).toHaveAttribute('title', '#3f48cc');
  await expect(recent.filter({ has: page.locator('[style*="237, 28, 36"]') })).toHaveCount(1);
});
