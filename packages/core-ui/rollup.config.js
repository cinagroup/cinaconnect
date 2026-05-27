/**
 * Rollup configuration for @cinacoin/core-ui
 *
 * Component-level tree shaking optimized build with:
 * - Separate bundles per component for granular imports
 * - Aggregated ESM build for convenience
 * - Minified production build
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import analyze from 'rollup-plugin-analyzer';

const external = [
  'lit',
  'lit/decorators.js',
  'lit/directives/class-map.js',
  'lit/directives/if-defined.js',
  'lit/directives/style-map.js',
];

function createComponentBundle(componentName) {
  return {
    input: `src/components/${componentName}.ts`,
    output: {
      file: `dist/components/${componentName}.js`,
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist/types',
        sourceMap: true,
      }),
    ],
  };
}

export default [
  // Aggregated ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist/types',
        sourceMap: true,
        outDir: 'dist',
      }),
    ],
  },
  // Component-level bundles for tree-shaking
  createComponentBundle('connect-button'),
  createComponentBundle('connect-modal'),
  createComponentBundle('wallet-list'),
  createComponentBundle('wallet-card'),
  createComponentBundle('chain-switcher'),
  createComponentBundle('account-modal'),
  createComponentBundle('transaction-toast'),
  createComponentBundle('network-badge'),
  // Minified production build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.min.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', declaration: false, outDir: 'dist' }),
      terser({
        compress: { pure_funcs: ['console.debug'], drop_console: true },
      }),
      analyze({ summaryOnly: true, limit: 15 }),
    ],
  },
];
