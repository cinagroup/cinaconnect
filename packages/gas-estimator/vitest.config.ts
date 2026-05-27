import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'gas-estimator',
    include: ['tests/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
    deps: {
      interopDefault: true,
    },
  },
  resolve: {
    alias: [
      {
        find: /^\.\/(.+)\.js$/,
        replacement: path.resolve(__dirname, 'src/$1.ts'),
      },
      {
        find: /^\.\.\/src\/(.+)\.js$/,
        replacement: path.resolve(__dirname, 'src/$1.ts'),
      },
    ],
  },
});
