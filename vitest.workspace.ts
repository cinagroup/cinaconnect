import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'core-sdk',
      include: ['packages/core-sdk/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
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
      include: ['packages/react/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
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
]);
