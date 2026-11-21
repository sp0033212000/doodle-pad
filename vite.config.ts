/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// GitHub Pages 部署在 /doodle-pad/ 子路徑下（build 與 preview）；本機開發維持根路徑
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/doodle-pad/' : '/',
  plugins: [vue()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
}));
