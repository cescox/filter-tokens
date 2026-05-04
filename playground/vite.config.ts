import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, '../public'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@filter-tokens/ui', replacement: resolve(__dirname, '../src') },
      { find: /^filter-tokens$/, replacement: resolve(__dirname, '../src/index.ts') },
      { find: /^filter-tokens\/(.*)$/, replacement: resolve(__dirname, '../src/$1') },
    ],
  },
});
