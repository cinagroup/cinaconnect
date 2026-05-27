import { defineConfig, Plugin } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

function tsResolver(): Plugin {
  return {
    name: 'vite-ts-resolver',
    enforce: 'pre',
    resolveId(source: string, importer: string | undefined) {
      if (!importer || (!source.startsWith('./') && !source.startsWith('../')) || !source.endsWith('.js')) {
        return null;
      }

      const importerDir = path.dirname(importer);
      const tsCandidate = path.resolve(importerDir, source.replace(/\.js$/, '.ts'));

      if (fs.existsSync(tsCandidate)) {
        return tsCandidate;
      }

      const indexCandidate = path.resolve(importerDir, source.replace(/\.js$/, ''), 'index.ts');
      if (fs.existsSync(indexCandidate)) {
        return indexCandidate;
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
  },
});
