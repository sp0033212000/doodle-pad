/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 部署在 /doodle-pad/ 子路徑下（build 與 preview）；本機開發維持根路徑
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/doodle-pad/' : '/',
  plugins: [
    vue(),
    // PWA：離線使用、加到主畫面；有新版本時由介面提示重新整理（registerType: 'prompt'）
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '塗鴉板 Doodle Pad',
        short_name: 'Doodle Pad',
        description: '免費、免安裝的線上繪圖工具，受傳統小畫家啟發',
        categories: ['graphics', 'productivity'],
        lang: 'zh-Hant',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#e9edf2',
        theme_color: '#2f6fde',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // 社群分享圖只給爬蟲用，不需要離線快取
        globIgnores: ['**/og-image.png'],
        // 有副檔名的網址（sitemap.xml、robots.txt、Google 驗證檔…）是靜態檔案，
        // 不要用 index.html 回應，否則瀏覽器打開會看到 app 而不是檔案本身
        navigateFallbackDenylist: [/\/[^/?]+\.[^/?]+$/],
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
}));
