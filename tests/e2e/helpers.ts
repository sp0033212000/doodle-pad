import { expect, type Page } from '@playwright/test';

/**
 * E2E 測試共用的操作。
 *
 * 選擇器契約（改寫介面時必須保留）：
 *   #draw                 主畫布
 *   [data-tool=<id>]      工具按鈕（選中時有 .active）
 *   [data-action=<name>]  動作按鈕（undo、redo、cut、copy、paste、crop、resize、save、
 *                         zoom-in、zoom-out、zoom-reset、obj-*、sel-*、dialog-ok…）
 *   [data-control=size]   粗細滑桿；[data-control=shape-mode] 圖形模式
 *   .palette > div        調色盤色塊
 *   .paste-obj            貼上的物件（選取時 .selected）；.obj-resize 縮放把手
 *   .sel-box              選取範圍外框
 *   .dialog / .dialog .num  對話框與數字欄位
 */

export const WHITE = '255,255,255';
export const BLACK = '0,0,0';
export const RED = '237,28,36';
export const BLUE = '63,72,204';

/** 調色盤索引 */
export const PALETTE = { black: 0, red: 3, yellow: 5, blue: 8 } as const;

export async function openApp(page: Page) {
  page.on('dialog', d => d.accept());
  await page.goto('./');
  await expect(page.locator('#draw')).toBeVisible();
  await expect(page.locator('body[data-ready=true]')).toBeAttached();
}

/** 畫布像素座標 → 螢幕座標（考慮縮放） */
export async function toScreen(page: Page, x: number, y: number) {
  const box = await page.locator('#draw').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const width = await page.locator('#draw').evaluate(c => (c as HTMLCanvasElement).width);
  const z = box.width / width;
  return { x: box.x + (x + 0.5) * z, y: box.y + (y + 0.5) * z };
}

export async function drag(page: Page, points: [number, number][]) {
  const [first, ...rest] = points;
  const start = await toScreen(page, ...first);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const p of rest) {
    const s = await toScreen(page, ...p);
    await page.mouse.move(s.x, s.y);
  }
  await page.mouse.up();
}

export async function clickAt(page: Page, x: number, y: number) {
  const s = await toScreen(page, x, y);
  await page.mouse.click(s.x, s.y);
}

export async function pixel(page: Page, x: number, y: number) {
  return page.locator('#draw').evaluate(
    (c, [px, py]) => {
      const ctx = (c as HTMLCanvasElement).getContext('2d')!;
      return Array.from(ctx.getImageData(px, py, 1, 1).data)
        .slice(0, 3)
        .join(',');
    },
    [x, y],
  );
}

export async function canvasSize(page: Page) {
  return page.locator('#draw').evaluate(c => {
    const el = c as HTMLCanvasElement;
    return { w: el.width, h: el.height };
  });
}

/** 某範圍內非白色像素的數量 */
export async function inkCount(page: Page, x: number, y: number, w: number, h: number) {
  return page.locator('#draw').evaluate(
    (c, [x0, y0, ww, hh]) => {
      const d = (c as HTMLCanvasElement).getContext('2d')!.getImageData(x0, y0, ww, hh).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) n++;
      return n;
    },
    [x, y, w, h],
  );
}

export const selectTool = (page: Page, id: string) => page.click(`[data-tool=${id}]`);
export const action = (page: Page, name: string) => page.click(`[data-action=${name}]`);
export const pickColor = (page: Page, index: number) => page.locator('.palette > div').nth(index).click();
export const setSize = (page: Page, v: number) => page.locator('[data-control=size]').fill(String(v));
export const setShapeMode = (page: Page, mode: 'stroke' | 'fill' | 'both') =>
  page.locator('[data-control=shape-mode]').selectOption(mode);

/** 透過 paste 事件貼上一張純色圖片；clipboardData 為空時會貼上內部剪貼簿 */
export async function pasteImage(page: Page, w: number, h: number, color: string) {
  await page.evaluate(
    async ([ww, hh, col]) => {
      const c = document.createElement('canvas');
      c.width = ww as number;
      c.height = hh as number;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = col as string;
      ctx.fillRect(0, 0, ww as number, hh as number);
      const blob = await new Promise<Blob>(r => c.toBlob(b => r(b!)));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'p.png', { type: 'image/png' }));
      window.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      );
    },
    [w, h, color],
  );
  await expect(page.locator('.paste-obj.selected')).toHaveCount(1);
}

export async function pasteInternal(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true }),
    );
  });
}

/** 畫一個填滿的紅色矩形 */
export async function drawFilledRect(
  page: Page,
  color: number,
  from: [number, number],
  to: [number, number],
) {
  await setShapeMode(page, 'fill');
  await selectTool(page, 'rect');
  await pickColor(page, color);
  await drag(page, [from, to]);
}
