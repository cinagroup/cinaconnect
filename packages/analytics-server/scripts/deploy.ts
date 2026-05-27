/**
 * Deployment script for Cinacoin Analytics Server
 * Creates required Cloudflare resources and deploys
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PACKAGE_ROOT = join(import.meta.dirname, "..");
const WRANGLER_TOML = join(PACKAGE_ROOT, "wrangler.toml");

function log(msg: string) {
  console.log(`\x1b[32m→\x1b[0m ${msg}`);
}

function warn(msg: string) {
  console.log(`\x1b[33m⚠\x1b[0m ${msg}`);
}

function error(msg: string) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

async function main() {
  log("Cinacoin Analytics Server — Deployment Script");
  log("=".repeat(50));

  // 1. Check prerequisites
  log("Checking prerequisites...");
  try {
    execSync("which wrangler", { stdio: "pipe" });
    log("wrangler CLI found ✓");
  } catch {
    error("wrangler CLI not found. Install: npm i -g wrangler");
    process.exit(1);
  }

  try {
    execSync("cf login --help", { stdio: "pipe" });
    log("Cloudflare authenticated ✓");
  } catch {
    warn("Not authenticated with Cloudflare. Run: npx wrangler login");
  }

  // 2. Create D1 database (if not exists)
  log("Checking D1 database...");
  const dbId = await getDatabaseId();

  // 3. Create KV namespaces
  log("Setting up KV namespaces...");
  const rateLimitKvId = await getOrCreateKvNamespace("rate-limit-analytics");
  const dedupKvId = await getOrCreateKvNamespace("dedup-analytics");

  // 4. Update wrangler.toml with resource IDs
  log("Updating wrangler.toml...");
  updateWranglerToml(dbId, rateLimitKvId, dedupKvId);

  // 5. Run D1 migrations
  log("Running D1 migrations...");
  try {
    execSync(`wrangler d1 migrations apply CinacoinAnalytics --remote`, {
      cwd: PACKAGE_ROOT,
      stdio: "inherit",
    });
    log("D1 migrations applied ✓");
  } catch (err) {
    warn("D1 migration failed (may need manual setup): " + err);
  }

  // 6. Deploy Worker
  log("Deploying Cloudflare Worker...");
  try {
    execSync(`wrangler deploy`, {
      cwd: PACKAGE_ROOT,
      stdio: "inherit",
    });
    log("Worker deployed successfully ✓");
  } catch (err) {
    error("Deployment failed: " + err);
    process.exit(1);
  }

  log("=".repeat(50));
  log("Deployment complete!");
  log("Endpoints:");
  log("  POST https://cinacoin-analytics.<account>.workers.dev/v1/events");
  log("  GET  https://cinacoin-analytics.<account>.workers.dev/v1/health");
  log("  GET  https://cinacoin-analytics.<account>.workers.dev/v1/metrics");
  log("\nNext steps:");
  log("  1. Set API_KEY: npx wrangler secret put API_KEY");
  log("  2. Test health: curl https://cinacoin-analytics.<account>.workers.dev/v1/health");
  log("  3. Send events: curl -X POST -H 'Content-Type: application/json' -d @events.json https://cinacoin-analytics.<account>.workers.dev/v1/events");
}

async function getDatabaseId(): Promise<string> {
  // Try to find existing database
  try {
    const output = execSync(
      `wrangler d1 list --json`,
      { stdio: "pipe", encoding: "utf8" }
    );
    const databases = JSON.parse(output);
    const existing = databases.find(
      (db: { name: string }) => db.name === "CinacoinAnalytics"
    );
    if (existing) {
      log(`Found existing D1 database: ${existing.uuid}`);
      return existing.uuid;
    }
  } catch {
    // Not found, will create
  }

  // Create new database
  log("Creating D1 database: CinacoinAnalytics...");
  try {
    const output = execSync(
      `wrangler d1 create CinacoinAnalytics --json`,
      { stdio: "pipe", encoding: "utf8" }
    );
    const result = JSON.parse(output);
    log(`Created D1 database: ${result.uuid}`);
    return result.uuid;
  } catch {
    warn("Could not create D1 database. Please create manually:");
    warn("  wrangler d1 create CinacoinAnalytics");
    return "YOUR_D1_DATABASE_ID";
  }
}

async function getOrCreateKvNamespace(title: string): Promise<string> {
  try {
    const output = execSync(
      `wrangler kv:namespace list --json`,
      { stdio: "pipe", encoding: "utf8" }
    );
    const namespaces = JSON.parse(output);
    const existing = namespaces.find(
      (ns: { title: string }) => ns.title === title
    );
    if (existing) {
      log(`Found KV namespace: ${existing.id}`);
      return existing.id;
    }
  } catch {
    // Not found
  }

  try {
    const output = execSync(
      `wrangler kv:namespace create "${title}" --json`,
      { stdio: "pipe", encoding: "utf8" }
    );
    const result = JSON.parse(output);
    log(`Created KV namespace: ${result.id}`);
    return result.id;
  } catch {
    warn(`Could not create KV namespace '${title}'. Please create manually.`);
    return "YOUR_KV_NAMESPACE_ID";
  }
}

function updateWranglerToml(
  d1Id: string,
  rateLimitKvId: string,
  dedupKvId: string
) {
  let toml = readFileSync(WRANGLER_TOML, "utf8");

  toml = toml.replace(/database_id = ".*"/, `database_id = "${d1Id}"`);

  const kvLines = toml.split("\n");
  let kvIndex = 0;
  for (let i = 0; i < kvLines.length; i++) {
    if (kvLines[i].includes("binding = \"RATE_LIMIT_KV\"")) {
      kvIndex = i + 1;
      break;
    }
  }
  if (kvIndex > 0) {
    kvLines[kvIndex] = kvLines[kvIndex].replace(/id = ".*"/, `id = "${rateLimitKvId}"`);
    kvLines[kvIndex + 1] = kvLines[kvIndex + 1]?.replace(
      /preview_id = ".*"/,
      `preview_id = "${rateLimitKvId}"`
    );
  }

  for (let i = 0; i < kvLines.length; i++) {
    if (kvLines[i].includes("binding = \"DEDUP_KV\"")) {
      kvIndex = i + 1;
      break;
    }
  }
  if (kvIndex > 0) {
    kvLines[kvIndex] = kvLines[kvIndex].replace(/id = ".*"/, `id = "${dedupKvId}"`);
    kvLines[kvIndex + 1] = kvLines[kvIndex + 1]?.replace(
      /preview_id = ".*"/,
      `preview_id = "${dedupKvId}"`
    );
  }

  writeFileSync(WRANGLER_TOML, kvLines.join("\n"));
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
