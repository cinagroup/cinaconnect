import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'packages/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/**/src/**/*.ts', 'packages/**/src/**/*.tsx'],
      exclude: [
        'packages/**/src/executors/**/*.ts',
        'packages/**/src/transports/**/*.ts',
        '**/node_modules/**',
        '**/dist/**',
      ],
    },
  },
});
