/**
 * Rollup configuration for @cinacoin/core-sdk
 *
 * Tree-shaking optimized build with:
 * - Multiple output formats (ESM, CJS)
 * - External dependency declaration for peer deps
 * - Size analysis output
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import analyze from 'rollup-plugin-analyzer';
import json from '@rollup/plugin-json';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const external = [
  // Peer dependencies
  ...Object.keys(pkg.peerDependencies || {}),
  // Built-in Node.js modules
  'crypto',
  'path',
  'fs',
  'events',
  'stream',
  'util',
  'buffer',
  'url',
  'http',
  'https',
  'os',
  'zlib',
];

function createConfig(format, options = {}) {
  const { minify = false, analyze: runAnalysis = false } = options;

  return {
    input: 'src/index.ts',
    output: {
      file: `dist/index${format === 'cjs' ? '.cjs' : '.js'}`,
      format,
      sourcemap: true,
      exports: 'named',
      banner: `/**\n * @cinacoin/core-sdk v${pkg.version}\n * Built: ${new Date().toISOString()}\n */`,
    },
    external,
    plugins: [
      json(),
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist/types',
        sourceMap: true,
        outDir: 'dist',
      }),
      minify
        ? terser({
            compress: {
              pure_funcs: ['console.debug'],
              drop_console: true,
            },
            mangle: {
              toplevel: true,
            },
          })
        : null,
      runAnalysis ? analyze({ summaryOnly: true, limit: 20 }) : null,
    ].filter(Boolean),
  };
}

export default [
  // ESM build (primary)
  createConfig('esm', { minify: false }),
  // ESM minified build
  createConfig('esm', { minify: true }),
  // CommonJS build
  createConfig('cjs', { minify: false }),
];
