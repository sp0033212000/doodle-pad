import { test, expect, type Page } from '@playwright/test';
import { openApp, drag, pixel, selectTool, setSize, pasteImage, WHITE, BLACK } from './helpers';

/** 讀取 IndexedDB 中最後一次自動保存的時間（資料庫尚未建立時回傳 0） */
async function savedAt(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    if (!dbs.some(d => d.name === 'doodle-pad')) return 0;
    return new Promise<number>(resolve => {
      const req = indexedDB.open('doodle-pad');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('doc')) return resolve(0);
        const get = db.transaction('doc').objectStore('doc').get('current');
        get.onsuccess = () => {
          resolve(get.result?.savedAt ?? 0);
          db.close();
        };
        get.onerror = () => resolve(0);
      };
      req.onerror = () => resolve(0);
    });
  });
}

async function waitForAutosave(page: Page, after = 0) {
  await expect.poll(() => savedAt(page), { timeout: 5000 }).toBeGreaterThan(after);
}

async function stroke(page: Page, y: number) {
  await selectTool(page, 'brush');
  await setSize(page, 6);
  await drag(page, [
    [50, y],
    [250, y],
  ]);
}

test('重新整理後恢復作品與復原紀錄', async ({ page }) => {
  await openApp(page);
  await stroke(page, 100);
  await waitForAutosave(page);

  await page.reload();
  await openApp(page);
  expect(await pixel(page, 150, 100)).toBe(BLACK);

  await page.keyboard.press('ControlOrMeta+z');
  expect(await pixel(page, 150, 100)).toBe(WHITE);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  expect(await pixel(page, 150, 100)).toBe(BLACK);
});

test('恢復未鎖定的物件與工具設定', async ({ page }) => {
  await openApp(page);
  await pasteImage(page, 80, 60, '#3f48cc');
  await setSize(page, 12);
  await selectTool(page, 'brush');
  await waitForAutosave(page);

  await page.reload();
  await openApp(page);
  await expect(page.locator('.paste-obj')).toHaveCount(1);
  await expect(page.locator('[data-control=size]')).toHaveValue('12');
  await expect(page.locator('[data-tool=brush]')).toHaveClass(/active/);
});

test('第二個分頁為唯讀；第一個分頁關閉後可以編輯', async ({ page, context }) => {
  await openApp(page);
  await stroke(page, 100);
  await waitForAutosave(page);

  const second = await context.newPage();
  await openApp(second);
  await expect(second.getByTestId('read-only-banner')).toBeVisible();
  expect(await pixel(second, 150, 100)).toBe(BLACK); // 顯示最新存檔

  // 唯讀：工具列被停用，直接在畫布上拖曳也不會畫出東西；快捷鍵不作用
  await expect(second.locator('.toolbar')).toHaveCSS('pointer-events', 'none');
  await drag(second, [
    [50, 200],
    [250, 200],
  ]);
  expect(await pixel(second, 150, 200)).toBe(WHITE);
  await second.keyboard.press('e');
  await expect(second.locator('[data-tool=eraser]')).not.toHaveClass(/active/);

  await page.close();
  await expect(second.getByTestId('read-only-banner')).toBeHidden();
  await stroke(second, 200);
  expect(await pixel(second, 150, 200)).toBe(BLACK);
});
