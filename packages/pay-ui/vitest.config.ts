import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'pay-ui',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@cinacoin/swap-sdk': path.resolve(__dirname, '../../packages/swap-sdk/src/index.ts'),
      '@cinacoin/onramp-sdk': path.resolve(__dirname, '../../packages/onramp-sdk/src/index.ts'),
    },
  },
});
