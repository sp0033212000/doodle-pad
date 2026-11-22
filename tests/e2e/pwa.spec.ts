import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('manifest 內容正確，圖示都存在', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const manifestUrl = new URL(href!, page.url()).toString();
  const manifest = await (await request.get(manifestUrl)).json();
  expect(manifest).toMatchObject({ short_name: 'Doodle Pad', display: 'standalone' });
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, manifestUrl).toString());
    expect(res.status(), icon.src).toBe(200);
  }
});

test('安裝 service worker 後顯示「已可離線使用」，離線時也能開啟', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.getByTestId('pwa-toast')).toContainText('已可離線使用');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#draw')).toBeVisible();
  await expect(page.locator('[data-tool=pencil]')).toBeVisible();
  await context.setOffline(false);
});

test('service worker 不攔截 sitemap、驗證檔等靜態檔案', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // 確保頁面已由 service worker 控制
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await page.goto('./sitemap.xml');
  await expect(page.locator('#draw')).toHaveCount(0);
  expect(await page.content()).toContain('urlset');

  await page.goto('./google251000a8cc645dd7.html');
  expect(await page.textContent('body')).toContain('google-site-verification');
});
