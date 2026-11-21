import { test, expect, type Page } from '@playwright/test';
import { openApp, drag, pixel, selectTool, setSize, RED } from './helpers';

/** 以合成的 PointerEvent 模擬觸控筆或手指的一筆（Playwright 無法直接產生 pen） */
async function syntheticStroke(
  page: Page,
  type: 'pen' | 'touch',
  from: [number, number],
  to: [number, number],
  pressure = 0.5,
) {
  await page.evaluate(
    ({ type, from, to, pressure }) => {
      const c = document.getElementById('draw') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      const z = r.width / c.width;
      const ev = (name: string, x: number, y: number, extra: PointerEventInit = {}) =>
        c.dispatchEvent(
          new PointerEvent(name, {
            clientX: r.left + (x + 0.5) * z,
            clientY: r.top + (y + 0.5) * z,
            pointerId: type === 'pen' ? 7 : 11,
            pointerType: type,
            pressure,
            button: 0,
            buttons: 1,
            isPrimary: true,
            bubbles: true,
            cancelable: true,
            ...extra,
          }),
        );
      ev('pointerdown', from[0], from[1]);
      for (let i = 1; i <= 10; i++) {
        ev('pointermove', from[0] + ((to[0] - from[0]) * i) / 10, from[1] + ((to[1] - from[1]) * i) / 10, {
          button: -1,
        });
      }
      ev('pointerup', to[0], to[1], { buttons: 0, pressure: 0 });
    },
    { type, from, to, pressure },
  );
}

/** 某一欄中非白色像素的數量（量筆觸粗細） */
const columnInk = (page: Page, x: number, y0: number, y1: number) =>
  page.locator('#draw').evaluate(
    (c, [x, y0, y1]) => {
      const d = (c as HTMLCanvasElement).getContext('2d')!.getImageData(x, y0, 1, y1 - y0).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 200) n++;
      return n;
    },
    [x, y0, y1],
  );

test.beforeEach(async ({ page }) => openApp(page));

test('筆刷粗細隨下筆力道變化', async ({ page }) => {
  await selectTool(page, 'brush');
  await setSize(page, 20);
  await syntheticStroke(page, 'pen', [50, 100], [250, 100], 0.1);
  await syntheticStroke(page, 'pen', [50, 200], [250, 200], 1);
  const light = await columnInk(page, 150, 70, 130);
  const heavy = await columnInk(page, 150, 170, 230);
  expect(light).toBeGreaterThan(0);
  expect(heavy).toBeGreaterThanOrEqual(18);
  expect(heavy).toBeGreaterThan(light * 2);
});

test('偵測到筆後自動切換成「只用筆畫圖」，手指不會畫圖', async ({ page }) => {
  await selectTool(page, 'brush');
  await setSize(page, 8);
  await syntheticStroke(page, 'pen', [50, 100], [250, 100]);
  await expect(page.locator('[data-control=pen-only]')).toBeChecked();

  await syntheticStroke(page, 'touch', [50, 200], [250, 200]);
  expect(await columnInk(page, 150, 180, 220)).toBe(0);
});

test('關閉「只用筆畫圖」後手指可以畫圖，設定在重新整理後保留', async ({ page }) => {
  await selectTool(page, 'brush');
  await setSize(page, 8);
  await syntheticStroke(page, 'pen', [50, 100], [250, 100]);
  await page.locator('[data-control=pen-only]').uncheck();
  await syntheticStroke(page, 'touch', [50, 200], [250, 200]);
  expect(await columnInk(page, 150, 180, 220)).toBeGreaterThan(0);

  await page.reload();
  await openApp(page);
  await syntheticStroke(page, 'pen', [50, 300], [250, 300]); // 不再自動切換
  await expect(page.locator('[data-control=pen-only]')).not.toBeChecked();
  await syntheticStroke(page, 'touch', [50, 400], [250, 400]);
  expect(await columnInk(page, 150, 380, 420)).toBeGreaterThan(0);
});

test('「使用次色」開關：左鍵 / 筆 / 手指改用次色', async ({ page }) => {
  await page.locator('.palette > div').nth(3).click({ button: 'right' }); // 次色 = 紅
  await page.locator('[data-action=toggle-secondary]').click();
  await expect(page.locator('[data-action=toggle-secondary]')).toHaveText('使用次色');
  await selectTool(page, 'brush');
  await setSize(page, 8);
  await drag(page, [
    [50, 100],
    [250, 100],
  ]);
  expect(await pixel(page, 150, 100)).toBe(RED);
});
