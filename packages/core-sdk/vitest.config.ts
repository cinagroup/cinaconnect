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

      // Resolve relative to importer's directory
      const importerDir = path.dirname(importer);
      const tsCandidate = path.resolve(importerDir, source.replace(/\.js$/, '.ts'));

      if (fs.existsSync(tsCandidate)) {
        return tsCandidate;
      }

      // Try as directory index
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
  resolve: {
    alias: {
      '@cinacoin/siwe': path.resolve(__dirname, '../siwe/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    server: {
      deps: {
        inline: ['zustand', 'viem', '@noble/curves', '@noble/ciphers', '@noble/hashes'],
      },
    },
  },
});
