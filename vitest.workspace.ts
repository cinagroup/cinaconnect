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
]);
