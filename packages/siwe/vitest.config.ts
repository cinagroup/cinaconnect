import { defineConfig, Plugin } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Vite plugin: resolve .js imports to .ts files.
 */
function tsResolver(): Plugin {
  return {
    name: 'vite-ts-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || (!source.startsWith('./') && !source.startsWith('../')) || !source.endsWith('.js')) {
        return null;
      }
      const importerDir = path.dirname(importer);
      const base = path.resolve(importerDir, source.replace(/\.js$/, ''));
      for (const ext of ['.tsx', '.ts']) {
        const candidate = base + ext;
        if (fs.existsSync(candidate)) return candidate;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [tsResolver()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**/*.test.js', 'tests/**/*.test.d.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});
