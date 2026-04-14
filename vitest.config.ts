import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'filter-tokens': resolve(__dirname, 'src'),
      '@/lib/utils': resolve(__dirname, 'playground/src/lib/utils.ts'),
      '@/components': resolve(__dirname, 'playground/src/components'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
