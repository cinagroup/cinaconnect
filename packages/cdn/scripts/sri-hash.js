#!/usr/bin/env node
/**
 * SRI Hash Generator
 * Generates Subresource Integrity hashes for CDN bundles.
 * Usage: node scripts/sri-hash.js dist/cdn.js
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const SUPPORTED_ALGORITHMS = ["sha256", "sha384", "sha512"];
const DEFAULT_ALGORITHM = "sha384";

function generateSri(filePath, algorithm = DEFAULT_ALGORITHM) {
  const content = readFileSync(filePath);
  const hash = createHash(algorithm).update(content).digest("base64");
  return `${algorithm}-${hash}`;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: node sri-hash.js <file> [algorithm]");
    console.log("Algorithms: sha256, sha384 (default), sha512");
    process.exit(1);
  }

  const filePath = args[0];
  const algorithm = args[1] || DEFAULT_ALGORITHM;

  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    console.error(`Unknown algorithm: ${algorithm}`);
    console.error(`Supported: ${SUPPORTED_ALGORITHMS.join(", ")}`);
    process.exit(1);
  }

  const sri = generateSri(filePath, algorithm);
  console.log(`${sri}`);
}

main();
