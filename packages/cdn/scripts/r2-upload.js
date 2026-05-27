#!/usr/bin/env node
/**
 * R2 Upload Script
 * Uploads CDN bundles to Cloudflare R2 for direct asset hosting.
 * Usage: node scripts/r2-upload.js
 * Requires: wrangler CLI authenticated, R2 bucket created
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";

const CDN_VERSION = process.env.CDN_VERSION || "0.2.0";
const R2_BUCKET = process.env.R2_BUCKET || "cinacoin-cdn";
const DIST_DIR = join(import.meta.dirname, "..", "dist");
const OUTPUT_DIR = join(import.meta.dirname, "..", "cdn-dist");

function generateSri(filePath, algorithm = "sha384") {
  const content = readFileSync(filePath);
  const hash = createHash(algorithm).update(content).digest("base64");
  return `${algorithm}-${hash}`;
}

function getContentType(filename) {
  if (filename.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filename.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (filename.endsWith(".map")) return "application/json; charset=utf-8";
  if (filename.endsWith(".html")) return "text/html; charset=utf-8";
  if (filename.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

async function uploadToR2(objectKey, filePath) {
  const contentType = getContentType(objectKey);
  const content = readFileSync(filePath);

  try {
    execSync(
      `wrangler r2 object put "${R2_BUCKET}/${objectKey}" --file "${filePath}" --content-type "${contentType}"`,
      { stdio: "pipe", encoding: "utf8" }
    );
    return true;
  } catch (err) {
    console.error(`  ✗ Failed to upload ${objectKey}:`, err.message);
    return false;
  }
}

async function main() {
  console.log(`📦 R2 Upload — v${CDN_VERSION} to ${R2_BUCKET}`);

  // Check dist exists
  if (!existsSync(join(DIST_DIR, "cdn.js"))) {
    console.error("❌ CDN bundle not found. Run 'npm run build' first.");
    process.exit(1);
  }

  // Build versioned output first
  try {
    execSync(`node scripts/versioned-urls.js`, {
      cwd: join(import.meta.dirname, ".."),
      stdio: "inherit",
    });
  } catch {
    console.error("❌ Failed to generate versioned URLs.");
    process.exit(1);
  }

  // Upload all files from cdn-dist
  const files = [];

  function walkDir(dir, prefix = "") {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        walkDir(fullPath, join(prefix, entry));
      } else {
        files.push({ path: fullPath, key: join(prefix, entry) });
      }
    }
  }

  walkDir(OUTPUT_DIR);

  console.log(`\n📤 Uploading ${files.length} files to R2...`);

  let uploaded = 0;
  let failed = 0;

  for (const { path, key } of files) {
    // Skip Pages-specific files (_headers, _redirects, manifest)
    if (key.startsWith("_") || key === "manifest.json") continue;

    const success = await uploadToR2(key, path);
    if (success) uploaded++;
    else failed++;
  }

  console.log(`\n✅ Upload complete: ${uploaded} uploaded, ${failed} failed`);
  console.log(`\n📍 CDN URLs:`);
  console.log(`   Latest: https://cdn.cinacoin.dev/v1/cinacoin.js`);
  console.log(`   Pinned: https://cdn.cinacoin.dev/v${CDN_VERSION}/cinacoin.js`);
}

main().catch((err) => {
  console.error("❌ Upload failed:", err.message);
  process.exit(1);
});
