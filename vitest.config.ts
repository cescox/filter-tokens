import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@filter-tokens/ui', replacement: resolve(__dirname, 'src') },
      { find: /^filter-tokens$/, replacement: resolve(__dirname, 'src/index.ts') },
      { find: /^filter-tokens\/(.*)$/, replacement: resolve(__dirname, 'src/$1') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
