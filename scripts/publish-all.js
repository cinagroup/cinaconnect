#!/usr/bin/env node
/**
 * publish-all.js — Node.js version of the @cinacoin publish pipeline
 * 
 * Features:
 * - Reads all package.json files in packages/
 * - Compares local version vs npm registry version
 * - Publishes only unpublished or updated packages
 * - Concurrent publishing with configurable concurrency
 * - Progress reporting with emoji status
 * - Dry-run mode by default
 * - Filter by package name pattern
 * - Retry on transient failures
 * 
 * Usage:
 *   node scripts/publish-all.js              # dry-run
 *   node scripts/publish-all.js --publish    # actually publish
 *   node scripts/publish-all.js --concurrency=4
 *   node scripts/publish-all.js --filter=adapter
 *   node scripts/publish-all.js --help
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');

// ── Config ─────────────────────────────────────────────────────────
const CONFIG = {
  dryRun: true,
  concurrency: 4,
  filter: null,
  retries: 2,
  retryDelayMs: 2000,
  timeoutMs: 60000,
  buildMissing: false,
};

// ── Argument parsing ───────────────────────────────────────────────
for (const arg of process.argv.slice(2)) {
  if (arg === '--publish') CONFIG.dryRun = false;
  else if (arg === '--dry-run') CONFIG.dryRun = true;
  else if (arg.startsWith('--concurrency=')) CONFIG.concurrency = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--filter=')) CONFIG.filter = arg.split('=')[1].split(',').map(s => s.trim().toLowerCase());
  else if (arg === '--build-missing') CONFIG.buildMissing = true;
  else if (arg === '--help' || arg === '-h') {
    console.log(`Usage: node ${path.basename(__filename)} [options]

Options:
  --publish           Actually publish to npm (default is dry-run)
  --dry-run           Simulate publishing (default)
  --concurrency=N     Max concurrent publishes (default: 4)
  --filter=pattern    Only publish packages matching pattern (comma-separated)
  --build-missing     Build packages with no dist/ before publishing
  --help              Show this help`);
    process.exit(0);
  }
}

// ── Paths ──────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

// ── Logging ────────────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(tag, msg, color = colors.blue) {
  console.log(`${color}[${tag}]${colors.reset}  ${msg}`);
}
const info  = (m) => log('INFO', m, colors.blue);
const ok    = (m) => log('OK', m, colors.green);
const warn  = (m) => log('WARN', m, colors.yellow);
const error = (m) => log('ERR', m, colors.red);

// ── Discover packages ──────────────────────────────────────────────
function discoverPackages() {
  const dirs = fs.readdirSync(PACKAGES_DIR).filter(d => {
    return fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory()
      && fs.existsSync(path.join(PACKAGES_DIR, d, 'package.json'));
  });

  const packages = [];
  for (const dir of dirs) {
    const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    if (pkg.private) continue;

    // Apply filter
    if (CONFIG.filter && !CONFIG.filter.some(f => pkg.name.toLowerCase().includes(f))) {
      continue;
    }

    const hasDist = fs.existsSync(path.join(PACKAGES_DIR, dir, 'dist'))
      || fs.existsSync(path.join(PACKAGES_DIR, dir, 'build'));

    packages.push({
      dir: dir,
      dirPath: path.join(PACKAGES_DIR, dir),
      name: pkg.name,
      version: pkg.version,
      hasDist,
      pkg,
    });
  }

  return packages;
}

// ── Check npm registry ─────────────────────────────────────────────
function checkRegistry(name) {
  try {
    const output = execSync(`npm view ${name} version`, {
      encoding: 'utf-8',
      timeout: CONFIG.timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim();
  } catch (e) {
    const msg = (e.stderr || e.stdout || '').toLowerCase();
    if (msg.includes('404') || msg.includes('not found') || msg.includes('unpublished')) {
      return null; // not published
    }
    return 'ERROR';
  }
}

// ── Publish a single package ───────────────────────────────────────
async function publishPackage(pkg, attempt = 1) {
  const label = `${pkg.name}@${pkg.version}`;
  
  try {
    const output = execSync(
      `npm publish --access public "${pkg.dirPath}"`,
      {
        encoding: 'utf-8',
        timeout: CONFIG.timeoutMs,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: pkg.dirPath,
      }
    );
    return { success: true, name: pkg.name, version: pkg.version };
  } catch (e) {
    const err = (e.stderr || e.stdout || '').trim();
    
    // Retry on transient errors
    if (attempt <= CONFIG.retries && 
        (err.includes('ETIMEDOUT') || err.includes('ECONNRESET') || err.includes('50'))) {
      warn(`Retry ${attempt}/${CONFIG.retries} for ${label}...`);
      await new Promise(r => setTimeout(r, CONFIG.retryDelayMs * attempt));
      return publishPackage(pkg, attempt + 1);
    }
    
    return { success: false, name: pkg.name, version: pkg.version, error: err };
  }
}

// ── Concurrency runner ─────────────────────────────────────────────
async function runWithConcurrency(items, fn, concurrency) {
  const results = [];
  const running = new Set();
  const queue = [...items];

  while (queue.length > 0 || running.size > 0) {
    while (running.size < concurrency && queue.length > 0) {
      const item = queue.shift();
      const promise = fn(item).then(r => {
        results.push(r);
        running.delete(promise);
      });
      running.add(promise);
    }
    if (running.size > 0) {
      await Promise.race(running);
    }
  }

  return results;
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${colors.bold}📦  @cinacoin Publish Pipeline${colors.reset}`);
  console.log('');

  if (CONFIG.dryRun) {
    info('DRY RUN mode — no packages will be published');
    info('Use --publish to actually publish');
  }

  // Discover
  const packages = discoverPackages();
  info(`Found ${packages.length} publishable packages`);

  // Check registry
  info('Checking npm registry...');
  const toPublish = [];
  let skipped = 0;
  let errors = 0;

  for (const pkg of packages) {
    if (!pkg.hasDist) {
      warn(`Skipping ${pkg.name} — no dist/ or build/ directory`);
      skipped++;
      continue;
    }

    const registryVer = checkRegistry(pkg.name);

    if (registryVer === 'ERROR') {
      warn(`Could not check ${pkg.name} — registry error, will attempt publish`);
      toPublish.push(pkg);
      continue;
    }

    if (registryVer === pkg.version) {
      ok(`✓ ${pkg.name}@${pkg.version} already published`);
      skipped++;
      continue;
    }

    if (registryVer === null) {
      info(`  📝 ${pkg.name}@${pkg.version} — never published`);
    } else {
      info(`  🔄 ${pkg.name} ${registryVer} → ${pkg.version} (update available)`);
    }
    toPublish.push(pkg);
  }

  console.log('');
  info(`Summary: ${packages.length} total, ${skipped} skipped, ${toPublish.length} to publish`);
  console.log('');

  if (toPublish.length === 0) {
    ok('All packages are up to date. Nothing to publish.');
    process.exit(0);
  }

  if (CONFIG.dryRun) {
    info('Packages that would be published:');
    for (const pkg of toPublish) {
      console.log(`  ${colors.cyan}→${colors.reset} ${pkg.name}@${pkg.version}  (${pkg.dir})`);
    }
    console.log('');
    info('Remove --dry-run or use --publish to actually publish.');
    process.exit(0);
  }

  // Publish with concurrency
  info(`Publishing ${toPublish.length} packages (concurrency: ${CONFIG.concurrency})...`);
  console.log('');

  const startTime = Date.now();
  const results = await runWithConcurrency(toPublish, publishPackage, CONFIG.concurrency);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Report
  const success = results.filter(r => r.success);
  const failed  = results.filter(r => !r.success);

  console.log('');
  console.log(`${colors.bold}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}📊  Publish Report${colors.reset}`);
  console.log(`${colors.bold}═══════════════════════════════════════════${colors.reset}`);
  console.log(`  ⏱️  Time:     ${elapsed}s`);
  console.log(`  ✅ Success: ${success.length}`);
  console.log(`  ❌ Failed:  ${failed.length}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);

  if (failed.length > 0) {
    console.log('');
    error('Failed packages:');
    for (const f of failed) {
      error(`  - ${f.name}@${f.version}`);
      if (f.error) {
        const short = f.error.split('\n').slice(0, 2).join(' ');
        error(`    ${short}`);
      }
    }
  }

  if (success.length > 0) {
    console.log('');
    ok('Published successfully:');
    for (const s of success) {
      ok(`  ✓ ${s.name}@${s.version}`);
    }
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(e => {
  error(`Fatal: ${e.message}`);
  process.exit(1);
});
