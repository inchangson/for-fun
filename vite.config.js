import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./site', import.meta.url));
export default defineConfig({
  root, base: './',
  server: { fs: { strict: true, allow: [root], deny: ['**/.private/**', '**/.env*', '**/*.xlsx'] } },
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false }
});
