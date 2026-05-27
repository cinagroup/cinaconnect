import { defineConfig, Plugin } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Vite plugin: resolve .js imports and extensionless imports to .ts/.tsx files.
 */
function tsResolver(): Plugin {
  return {
    name: 'vite-ts-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || (!source.startsWith('./') && !source.startsWith('../'))) {
        return null;
      }
      const importerDir = path.dirname(importer);
      const base = path.resolve(importerDir, source.replace(/\.js$/, ''));
      for (const ext of ['.tsx', '.ts']) {
        const candidate = base + ext;
        if (fs.existsSync(candidate)) return candidate;
      }
      // Try index files
      for (const ext of ['.tsx', '.ts']) {
        const candidate = path.join(base, 'index' + ext);
        if (fs.existsSync(candidate)) return candidate;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [tsResolver()],
  resolve: {
    alias: {
      // Fix workspace deps that declare .mjs but only ship .js
      '@cinacoin/core-sdk': path.resolve(__dirname, '../core-sdk/dist/index.js'),
      '@cinacoin/core-ui': path.resolve(__dirname, '../core-ui/dist/index.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});
