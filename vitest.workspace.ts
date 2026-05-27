import { defineWorkspace } from 'vitest/config';
import path from 'node:path';

export default defineWorkspace([
  {
    test: {
      name: 'core-sdk',
      include: ['packages/core-sdk/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        include: ['packages/core-sdk/src/**/*.ts'],
        exclude: ['packages/core-sdk/src/executors/**/*.ts', 'packages/core-sdk/src/transports/**/*.ts', '**/node_modules/**', '**/dist/**'],
      },
    },
  },
  {
    test: {
      name: 'core-ui',
      include: ['packages/core-ui/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
    },
  },
  {
    test: {
      name: 'session-keys',
      include: ['packages/session-keys/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'swap-sdk',
      include: ['packages/swap-sdk/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'react',
      include: ['packages/react/**/*.test.ts', 'packages/react/**/*.test.tsx'],
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        include: ['packages/react/src/**/*.ts', 'packages/react/src/**/*.tsx'],
        exclude: ['**/node_modules/**', '**/dist/**'],
      },
    },
  },
  {
    test: {
      name: 'siwx',
      include: ['packages/siwx/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'onramp-sdk',
      include: ['packages/onramp-sdk/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'social-login',
      include: ['packages/social-login/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'vue',
      include: ['packages/vue/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
    },
  },
  {
    test: {
      name: 'react-native',
      include: ['packages/react-native/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'design-tokens',
      include: ['packages/design-tokens/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'siwe',
      include: ['packages/siwe/**/*.test.ts'],
      environment: 'node',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        include: ['packages/siwe/src/**/*.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
      },
    },
  },
  {
    test: {
      name: 'cross-chain-sync',
      include: ['packages/cross-chain-sync/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'batch-transaction',
      include: ['packages/batch-transaction/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'analytics',
      include: ['packages/analytics/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'wallet-recommender',
      include: ['packages/wallet-recommender/**/*.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      name: 'pay-ui',
      include: ['packages/pay-ui/**/*.test.ts', 'packages/pay-ui/**/*.test.tsx'],
      environment: 'jsdom',
      globals: true,
    },
  },
  {
    test: {
      name: 'cdn',
      include: ['packages/cdn/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
    },
  },
  {
    test: {
      name: 'backend-integration',
      include: ['tests/backend-integration/**/*.test.ts'],
      environment: 'node',
      globals: true,
      testTimeout: 30_000,
      hookTimeout: 10_000,
      alias: {
        '@cinacoin/rpc-proxy': path.resolve(__dirname, 'packages/rpc-proxy/src'),
        '@cinacoin/keys-server': path.resolve(__dirname, 'packages/keys-server/src'),
        '@cinacoin/relay-server': path.resolve(__dirname, 'packages/relay-server/src'),
        '@cinacoin/notify-server': path.resolve(__dirname, 'packages/notify-server/src'),
        '@cinacoin/push-server': path.resolve(__dirname, 'packages/push-server/src'),
      },
    },
  },
  {
    test: {
      name: 'aa-sdk',
      include: ['packages/aa-sdk/tests/smartAccount.test.ts'],
      environment: 'node',
      globals: true,
    },
  },
]);
