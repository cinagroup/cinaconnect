import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'packages/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**/src/**/*.ts'],
      exclude: [
        'packages/**/src/executors/**/*.ts',
        'packages/**/src/transports/**/*.ts',
        '**/node_modules/**',
        '**/dist/**',
      ],
    },
  },
});
