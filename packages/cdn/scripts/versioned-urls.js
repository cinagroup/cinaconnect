#!/usr/bin/env node
/**
 * Versioned URL Generator
 * Generates versioned CDN URLs with SRI hashes.
 * Usage: node scripts/versioned-urls.js dist/cdn.js dist/cdn.mjs
 *
 * Outputs:
 *   {
 *     "latest": {
 *       "url": "/v1/cinacoin.js",
 *       "sri": "sha384-..."
 *     },
 *     "pinned": {
 *       "url": "/v0.2.0/cinacoin.js",
 *       "sri": "sha384-..."
 *     }
 *   }
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";

const CDN_VERSION = process.env.CDN_VERSION || "0.2.0";
const DIST_DIR = join(import.meta.dirname, "..", "dist");
const OUTPUT_DIR = join(import.meta.dirname, "..", "cdn-dist");

function generateSri(filePath, algorithm = "sha384") {
  const content = readFileSync(filePath);
  const hash = createHash(algorithm).update(content).digest("base64");
  return `${algorithm}-${hash}`;
}

function main() {
  console.log(`🔧 Generating versioned CDN URLs for v${CDN_VERSION}...`);

  // Build the CDN if not already built
  const cdnJs = join(DIST_DIR, "cdn.js");
  const cdnMjs = join(DIST_DIR, "cdn.mjs");

  if (!existsSync(cdnJs)) {
    console.error("❌ CDN bundle not found. Run 'npm run build' first.");
    process.exit(1);
  }

  // Create versioned output directory
  mkdirSync(join(OUTPUT_DIR, "v1"), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, `v${CDN_VERSION}`), { recursive: true });

  // Copy files to versioned paths
  const files = [
    { src: cdnJs, name: "cinacoin.js" },
    { src: cdnMjs, name: "cinacoin.mjs" },
  ];

  const manifest = {};

  for (const { src, name } of files) {
    if (!existsSync(src)) continue;

    const sri = generateSri(src);

    // Copy to versioned paths
    cpSync(src, join(OUTPUT_DIR, "v1", name));
    cpSync(src, join(OUTPUT_DIR, `v${CDN_VERSION}`, name));

    // Also copy source maps if they exist
    const mapSrc = src + ".map";
    if (existsSync(mapSrc)) {
      cpSync(mapSrc, join(OUTPUT_DIR, "v1", name + ".map"));
      cpSync(mapSrc, join(OUTPUT_DIR, `v${CDN_VERSION}`, name + ".map"));
    }

    const ext = name.endsWith(".mjs") ? "mjs" : "js";
    const key = ext === "mjs" ? "esm" : "iife";

    manifest[key] = {
      latest: {
        url: `/v1/${name}`,
        sri,
        size: readFileSync(src).length,
      },
      pinned: {
        url: `/v${CDN_VERSION}/${name}`,
        sri,
        size: readFileSync(src).length,
      },
    };
  }

  // Write manifest
  const manifestPath = join(OUTPUT_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Generate _headers file for Cloudflare Pages caching
  const headersContent = `
# Versioned files: cache forever
/v${CDN_VERSION}/*
  Cache-Control: public, max-age=31536000, immutable

# Latest symlink: short cache for updates
/v1/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

# Source maps: long cache
/v*/**.map
  Cache-Control: public, max-age=31536000, immutable

# HTML content types
/*.html
  Content-Type: text/html; charset=utf-8

/*.js
  Content-Type: application/javascript; charset=utf-8

/*.mjs
  Content-Type: application/javascript; charset=utf-8
`.trim();

  writeFileSync(join(OUTPUT_DIR, "_headers"), headersContent);

  // Generate _redirects for latest symlink
  const redirectsContent = `
# Latest version redirects
/v1/cinacoin.js  /v${CDN_VERSION}/cinacoin.js 200
/v1/cinacoin.mjs  /v${CDN_VERSION}/cinacoin.mjs 200
`.trim();

  writeFileSync(join(OUTPUT_DIR, "_redirects"), redirectsContent);

  console.log("✅ Versioned URLs generated:");
  console.log(`   Latest: /v1/cinacoin.js`);
  console.log(`   Pinned: /v${CDN_VERSION}/cinacoin.js`);
  console.log(`   Output: ${OUTPUT_DIR}/`);
  console.log(`   Manifest: ${manifestPath}`);
}

main();
