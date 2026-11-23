import { test, expect, type Page } from '@playwright/test';
import { openApp, clickAt, inkCount, pixel, selectTool, PALETTE, BLUE } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

const bar = (page: Page) => page.locator('.text-bar');
const textInput = (page: Page) => page.locator('.text-input');
const ctl = (page: Page, name: string) => page.locator(`.text-bar [data-text=${name}]`);

/** 在 (x, y) 開一個文字框；opts 先在格式列設定好，再輸入文字並確定 */
async function writeText(
  page: Page,
  x: number,
  y: number,
  value: string,
  setup?: (page: Page) => Promise<void>,
) {
  await selectTool(page, 'text');
  await clickAt(page, x, y);
  await expect(bar(page)).toBeVisible();
  if (setup) await setup(page);
  await textInput(page).focus();
  await page.keyboard.type(value);
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(bar(page)).toBeHidden();
}

const setSize = async (page: Page, v: number) => {
  await ctl(page, 'size').fill(String(v));
  await ctl(page, 'size').press('Enter');
};

/** 某範圍內有墨水的外框寬高 */
async function inkBounds(page: Page, x: number, y: number, w: number, h: number) {
  return page.locator('#draw').evaluate(
    (c, [x0, y0, ww, hh]) => {
      const d = (c as HTMLCanvasElement).getContext('2d')!.getImageData(x0, y0, ww, hh).data;
      let minX = Infinity,
        maxX = -1,
        minY = Infinity,
        maxY = -1;
      for (let yy = 0; yy < hh; yy++)
        for (let xx = 0; xx < ww; xx++) {
          const i = (yy * ww + xx) * 4;
          if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) {
            minX = Math.min(minX, xx);
            maxX = Math.max(maxX, xx);
            minY = Math.min(minY, yy);
            maxY = Math.max(maxY, yy);
          }
        }
      return maxX < 0 ? { w: 0, h: 0 } : { w: maxX - minX + 1, h: maxY - minY + 1 };
    },
    [x, y, w, h],
  );
}

test('文字框開啟時顯示格式列，確定後隱藏', async ({ page }) => {
  await selectTool(page, 'text');
  await clickAt(page, 60, 80);
  await expect(bar(page)).toBeVisible();
  for (const name of ['font', 'size', 'bold', 'italic', 'underline', 'strike', 'align', 'fill']) {
    await expect(ctl(page, name), name).toBeVisible();
  }
  await page.keyboard.type('Hi');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(bar(page)).toBeHidden();
  expect(await inkCount(page, 55, 75, 120, 60)).toBeGreaterThan(0);
});

test('操作格式列不會結束編輯，可以繼續打字', async ({ page }) => {
  await selectTool(page, 'text');
  await clickAt(page, 60, 80);
  await page.keyboard.type('ab');
  await ctl(page, 'bold').click();
  await setSize(page, 40);
  await page.keyboard.type('cd');
  await expect(textInput(page)).toHaveValue('abcd');
  await expect(textInput(page)).toBeFocused();
  await expect(textInput(page)).toHaveCSS('font-weight', '700');
  await expect(textInput(page)).toHaveCSS('font-size', '40px');
  await expect(ctl(page, 'bold')).toHaveAttribute('aria-pressed', 'true');
});

test('字體大小：數值越大字越大', async ({ page }) => {
  await writeText(page, 20, 20, 'Hello', p => setSize(p, 16));
  await writeText(page, 20, 120, 'Hello', p => setSize(p, 48));
  const small = await inkBounds(page, 10, 10, 400, 90);
  const big = await inkBounds(page, 10, 110, 400, 140);
  expect(big.h).toBeGreaterThan(small.h * 2);
  expect(big.w).toBeGreaterThan(small.w * 2);
});

test('粗體筆畫比一般粗', async ({ page }) => {
  await writeText(page, 20, 20, 'Hello', p => setSize(p, 32));
  await writeText(page, 20, 120, 'Hello', p => ctl(p, 'bold').click());
  const normal = await inkCount(page, 10, 10, 400, 90);
  const bold = await inkCount(page, 10, 110, 400, 90);
  expect(bold).toBeGreaterThan(normal * 1.2);
});

test('斜體、底線、刪除線會套用到輸入框與畫布', async ({ page }) => {
  await selectTool(page, 'text');
  await clickAt(page, 20, 20);
  await setSize(page, 40);
  await ctl(page, 'italic').click();
  await expect(textInput(page)).toHaveCSS('font-style', 'italic');
  await ctl(page, 'italic').click();

  // 「aaa」沒有下伸部，字的下方原本是空白；加了底線後會有一條線
  await textInput(page).focus();
  await page.keyboard.type('aaa');
  await page.keyboard.press('ControlOrMeta+Enter');
  const below = (y: number) => inkCount(page, 20, y + 40, 80, 8);
  expect(await below(20)).toBe(0);

  await writeText(page, 20, 120, 'aaa', p => ctl(p, 'underline').click());
  expect(await below(120)).toBeGreaterThan(30);

  // 刪除線：字中間有一條貫穿的橫線（寬度 ≈ 整段文字）
  await writeText(page, 20, 220, 'a a', async p => {
    await ctl(p, 'underline').click();
    await ctl(p, 'strike').click();
  });
  const gap = await inkCount(page, 20, 220, 80, 50);
  await writeText(page, 20, 320, 'a a', p => ctl(p, 'strike').click());
  expect(await inkCount(page, 20, 320, 80, 50)).toBeLessThan(gap);
});

test('背景填色：用次色填滿文字後方', async ({ page }) => {
  await page.locator('.palette > div').nth(PALETTE.blue).click({ button: 'right' });
  await writeText(page, 40, 40, 'x', async p => {
    await setSize(p, 30);
    await ctl(p, 'fill').click();
  });
  expect(await pixel(page, 42, 42)).toBe(BLUE);
});

test('字型：切換成等寬字型後，窄字母變寬', async ({ page }) => {
  await writeText(page, 20, 20, 'iiiiiiii', p => setSize(p, 30));
  await writeText(page, 20, 120, 'iiiiiiii', async p => {
    await ctl(p, 'font').selectOption({ index: 3 });
    await expect(textInput(p)).toHaveCSS('font-family', /monospace/);
  });
  const normal = await inkBounds(page, 10, 10, 500, 90);
  const mono = await inkBounds(page, 10, 110, 500, 90);
  expect(mono.w).toBeGreaterThan(normal.w * 1.5);
});

test('置中對齊：多行文字以最寬的一行置中', async ({ page }) => {
  await selectTool(page, 'text');
  await clickAt(page, 20, 20);
  await setSize(page, 30);
  await ctl(page, 'align').selectOption('center');
  await textInput(page).focus();
  await page.keyboard.type('WWWWWW');
  await page.keyboard.press('Enter');
  await page.keyboard.type('i');
  await expect(textInput(page)).toHaveCSS('text-align', 'center');
  await page.keyboard.press('ControlOrMeta+Enter');
  // 第二行的「i」應該在第一行的中間附近，而不是靠左
  const left = await inkCount(page, 18, 55, 30, 40);
  expect(left).toBe(0);
});

test('格式設定會沿用到下一個文字框', async ({ page }) => {
  await writeText(page, 20, 20, 'A', async p => {
    await ctl(p, 'bold').click();
    await setSize(p, 36);
  });
  await selectTool(page, 'text');
  await clickAt(page, 20, 150);
  await expect(ctl(page, 'bold')).toHaveAttribute('aria-pressed', 'true');
  await expect(ctl(page, 'size')).toHaveValue('36');
});
