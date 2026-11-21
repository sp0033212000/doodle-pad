// 產生社群分享圖 public/og-image.png（1200×630，Open Graph / Twitter 卡片）
//   node scripts/generate-og-image.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const icon = await fs.readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const features = [
  '鉛筆・筆刷・圖形',
  '套索・魔術棒',
  '可編輯的貼上物件',
  '自動保存',
  'Apple Pencil',
  '離線使用',
];

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    font-family: -apple-system, 'PingFang TC', 'Noto Sans TC', sans-serif;
    background: linear-gradient(135deg, #eef3fb 0%, #dce8fb 100%);
    display: flex; align-items: center; gap: 64px; padding: 0 88px;
    color: #1d2a3d;
  }
  .icon { width: 300px; height: 300px; flex: none; filter: drop-shadow(0 18px 40px rgba(42, 92, 196, .35)); }
  .icon svg { width: 100%; height: 100%; }
  h1 { font-size: 84px; font-weight: 800; letter-spacing: -1px; line-height: 1.05; }
  h1 small { display: block; font-size: 52px; font-weight: 700; color: #2f6fde; margin-top: 8px; }
  p { font-size: 34px; margin-top: 22px; color: #43536b; }
  p span { display: block; font-size: 26px; margin-top: 6px; color: #6a7a92; }
  ul { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; padding: 0; list-style: none; }
  li { font-size: 22px; padding: 8px 18px; border-radius: 999px; background: #fff; border: 1px solid #c9d6ea; }
</style></head>
<body>
  <div class="icon">${icon}</div>
  <div>
    <h1>塗鴉板<small>Doodle Pad</small></h1>
    <p>免費的線上繪圖工具<span>Free online drawing app</span></p>
    <ul>${features.map(f => `<li>${f}</li>`).join('')}</ul>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: fileURLToPath(new URL('../public/og-image.png', import.meta.url)) });
await browser.close();
console.log('wrote og-image.png');
