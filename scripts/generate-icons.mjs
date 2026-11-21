// 由 public/favicon.svg 產生 PWA 需要的 PNG 圖示（使用 Playwright 的 Chromium 繪製）
//   node scripts/generate-icons.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const svg = await fs.readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');

/** 方形圖示（iOS、maskable）滿版繪製；圖案本身已在 maskable 的安全區域（中央 80%）內 */
const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0, square: true },
  { file: 'maskable-icon-512x512.png', size: 512, padding: 0, square: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const inner = Math.round(t.size * (1 - 2 * (t.padding ?? 0)));
  // 方形圖示（iOS / maskable）不要圓角，由系統自行裁切
  const content = t.square ? svg.replace(/rx="\d+"/, 'rx="0"') : svg;
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`
    <html><body style="margin:0;display:grid;place-items:center;width:${t.size}px;height:${t.size}px;
      background:${t.square ? '#2f6fde' : 'transparent'}">
      <div style="width:${inner}px;height:${inner}px">${content.replace('<svg', '<svg width="100%" height="100%"')}</div>
    </body></html>`);
  await page.screenshot({
    path: fileURLToPath(new URL(`../public/${t.file}`, import.meta.url)),
    omitBackground: !t.square,
  });
  console.log('wrote', t.file);
}
await browser.close();
