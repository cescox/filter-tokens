import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/index.ts', 'src/types.ts', 'src/use-filter-tokens.ts', 'src/lib/format.ts'],
      rollupTypes: true,
    }),
  ],
  publicDir: false,
  resolve: {
    alias: [
      { find: '@filter-tokens/ui', replacement: resolve(__dirname, 'src') },
      { find: /^filter-tokens$/, replacement: resolve(__dirname, 'src/index.ts') },
      { find: /^filter-tokens\/(.*)$/, replacement: resolve(__dirname, 'src/$1') },
    ],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
      ],
    },
  },
});
