import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    name: 'backend-integration',
    globals: true,
    environment: 'node',
    include: ['tests/backend-integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30_000,
    hookTimeout: 10_000,
    // Use tsconfig paths for resolving local packages
    alias: {
      '@cinaconnect/rpc-proxy': path.resolve(__dirname, 'packages/rpc-proxy/src'),
      '@cinaconnect/keys-server': path.resolve(__dirname, 'packages/keys-server/src'),
      '@cinaconnect/relay-server': path.resolve(__dirname, 'packages/relay-server/src'),
      '@cinaconnect/notify-server': path.resolve(__dirname, 'packages/notify-server/src'),
      '@cinaconnect/push-server': path.resolve(__dirname, 'packages/push-server/src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'packages/rpc-proxy/src/**/*.ts',
        'packages/keys-server/src/**/*.ts',
        'packages/relay-server/src/**/*.ts',
        'packages/notify-server/src/**/*.ts',
        'packages/push-server/src/**/*.ts',
      ],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});
