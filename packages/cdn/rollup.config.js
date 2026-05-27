import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/cdn.js",
        format: "iife",
        name: "Cinacoin",
        sourcemap: true,
      },
      {
        file: "dist/cdn.mjs",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      resolve({ browser: true }),
      typescript({ tsconfig: "./tsconfig.json" }),
    ],
  },
];
