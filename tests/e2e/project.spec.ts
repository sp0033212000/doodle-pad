import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { openApp, drag, pixel, selectTool, setSize, pasteImage, action, WHITE, BLACK, BLUE } from './helpers';

async function stroke(page: Page, y: number) {
  await selectTool(page, 'brush');
  await setSize(page, 6);
  await drag(page, [
    [50, y],
    [250, y],
  ]);
}

/** 透過匯出對話框下載專案檔，回傳檔名與 JSON 內容 */
async function exportProject(page: Page, { includeHistory }: { includeHistory: boolean }) {
  await action(page, 'export-project');
  if (includeHistory) await page.locator('[data-control=include-history]').check();
  const [download] = await Promise.all([page.waitForEvent('download'), action(page, 'dialog-ok')]);
  const path = await download.path();
  return {
    name: download.suggestedFilename(),
    json: JSON.parse(await fs.readFile(path!, 'utf8')),
    path: path!,
  };
}

async function openProject(page: Page, path: string) {
  await page.locator('input[type=file]').setInputFiles({
    name: 'work.doodle',
    mimeType: 'application/json',
    buffer: await fs.readFile(path),
  });
}

test.beforeEach(async ({ page }) => openApp(page));

test('匯出專案檔：預設不含復原紀錄，保留未鎖定的物件', async ({ page }) => {
  await stroke(page, 100);
  await pasteImage(page, 40, 30, '#3f48cc');
  const { name, json } = await exportProject(page, { includeHistory: false });
  expect(name).toMatch(/^doodle-pad-.*\.doodle$/);
  expect(json.format).toBe('doodle-pad');
  expect(json.history).toBeNull();
  expect(json.objects).toHaveLength(1);
  expect(json.assets).toHaveLength(1);
});

test('匯出後詢問是否清空復原紀錄；選擇清空後作品保留', async ({ page }) => {
  await stroke(page, 100);
  await exportProject(page, { includeHistory: false });
  await expect(page.locator('.dialog')).toContainText('清空復原紀錄');
  await action(page, 'dialog-ok');
  await expect(page.locator('[data-action=undo]')).toBeDisabled();
  expect(await pixel(page, 150, 100)).toBe(BLACK);
});

test('開啟含復原紀錄的專案檔：畫面、物件與復原紀錄都還原', async ({ page }) => {
  await stroke(page, 100);
  await pasteImage(page, 40, 30, '#3f48cc');
  await page.keyboard.press('Enter'); // 鎖定物件
  const { path } = await exportProject(page, { includeHistory: true });
  await action(page, 'dialog-cancel'); // 保留復原紀錄

  // 清空畫布後再開啟專案檔
  await action(page, 'new');
  expect(await pixel(page, 150, 100)).toBe(WHITE);
  await openProject(page, path);

  await expect.poll(() => pixel(page, 150, 100)).toBe(BLACK);
  expect(await pixel(page, 20, 15)).toBe(BLUE);
  await page.keyboard.press('ControlOrMeta+z'); // 復原「鎖定物件」
  await expect(page.locator('.paste-obj')).toHaveCount(1);
});

test('開啟不正確的專案檔會顯示錯誤並保留目前作品', async ({ page }) => {
  await stroke(page, 100);
  const messages: string[] = [];
  page.on('dialog', d => messages.push(d.message()));
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.doodle',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"something-else"}'),
  });
  await expect.poll(() => messages.some(m => m.includes('無法開啟專案檔'))).toBe(true);
  expect(await pixel(page, 150, 100)).toBe(BLACK);
});
