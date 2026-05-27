import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/themes/index.ts', 'src/animations/index.ts', 'src/components/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', 'framer-motion', 'zustand'],
});
