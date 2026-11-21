import { defineConfig } from 'vite';

// GitHub Pages 部署在 /doodle-pad/ 子路徑下；本機開發維持根路徑
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/doodle-pad/' : '/',
}));
