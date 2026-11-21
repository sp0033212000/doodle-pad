import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

const SITE = 'https://sp0033212000.github.io/doodle-pad/';

test('標題、描述、canonical 與 robots', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('塗鴉板 Doodle Pad｜免費線上繪圖工具');
  const description = await page.locator('meta[name=description]').getAttribute('content');
  expect(description!.length).toBeGreaterThan(50);
  expect(description!.length).toBeLessThan(200);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', SITE);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /index, follow/);
});

test('Open Graph 與 Twitter 卡片，分享圖存在且為 1200×630', async ({ page, request }) => {
  await page.goto('./');
  const og = (p: string) => page.locator(`meta[property="og:${p}"]`);
  await expect(og('url')).toHaveAttribute('content', SITE);
  await expect(og('image')).toHaveAttribute('content', `${SITE}og-image.png`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  // 線上網址部署前不存在，改從本機預覽確認圖片
  const res = await request.get(new URL('og-image.png', page.url()).toString());
  expect(res.status()).toBe(200);
  const png = await res.body();
  expect(png.readUInt32BE(16)).toBe(1200); // PNG IHDR 寬
  expect(png.readUInt32BE(20)).toBe(630); // PNG IHDR 高
});

test('結構化資料（JSON-LD）可解析且為 WebApplication', async ({ page }) => {
  await page.goto('./');
  const json = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(json).toMatchObject({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    url: SITE,
    isAccessibleForFree: true,
    offers: { price: '0' },
  });
});

test('sitemap.xml 列出首頁', async ({ page, request }) => {
  await page.goto('./');
  const res = await request.get(new URL('sitemap.xml', page.url()).toString());
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain(`<loc>${SITE}</loc>`);
});

test('切換成英文時，頁面標題與描述跟著更新', async ({ page }) => {
  await openApp(page);
  await page.locator('[data-control=locale]').selectOption('en');
  await expect(page).toHaveTitle('Doodle Pad — Free Online Drawing App');
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /free online drawing app/);
});
