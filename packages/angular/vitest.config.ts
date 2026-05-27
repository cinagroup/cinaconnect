import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@cinacoin/core-sdk': path.resolve(__dirname, '../core-sdk/dist/index.js'),
    },
    conditions: ['import'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
