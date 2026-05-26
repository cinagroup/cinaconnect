import { defineConfig } from 'vitest/config';
import path from 'path';

const srcDir = path.resolve(__dirname, 'src');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: [
      // Internal .js → .ts (src files reference each other with .js)
      {
        find: /^\.\/(.+)\.js$/,
        replacement: path.join(srcDir, '$1.ts'),
      },
      // Test imports of src with .js
      {
        find: /^\.\.\/src\/(.+)\.js$/,
        replacement: path.join(srcDir, '$1.ts'),
      },
      // Test imports of src with .ts (for onchain.test.ts)
      {
        find: /^\.\.\/src\/(.+)\.ts$/,
        replacement: path.join(srcDir, '$1.ts'),
      },
    ],
  },
});
