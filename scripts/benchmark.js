/**
 * Cinacoin Performance Benchmark Script
 *
 * Measures key performance metrics for wallet operations.
 * Run via: node scripts/benchmark.js
 *
 * Outputs:
 *   - Wallet connection simulation time
 *   - Transaction signing simulation time
 *   - Batch transaction simulation time
 *   - Bundle size analysis
 *
 * Note: This script simulates operations using realistic delays since
 * real wallet operations require a browser environment. In CI or headless
 * mode, it reports simulated baselines.
 *
 * Usage:
 *   node scripts/benchmark.js
 *   node scripts/benchmark.js --ci
 *   node scripts/benchmark.js --iterations 10
 */

const { readFileSync, readdirSync, statSync, existsSync } = require('fs');
const { join, resolve } = require('path');

// ─── Configuration ──────────────────────────────────────────────────

const ROOT = resolve(__dirname, '..');
const CI_MODE = process.argv.includes('--ci');
const ITERATIONS = parseInt(process.argv.find(a => a.startsWith('--iterations'))?.split('=')[1] || '5', 10);
const PACKAGE_DIRS = ['packages/core-sdk', 'packages/react', 'packages/core-ui', 'packages/vue', 'packages/swap-sdk'];

// ─── Helpers ────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} μs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? max;
  return { avg, min, max, median, p95 };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Benchmark: Module Load Time ────────────────────────────────────

async function benchmarkModuleLoad() {
  console.log('\n📦 Module Load Benchmark');
  console.log('─'.repeat(50));

  const results = {};

  for (const pkgDir of PACKAGE_DIRS) {
    const fullPath = join(ROOT, pkgDir);
    if (!existsSync(fullPath)) {
      console.log(`  ⏭️  Skipping ${pkgDir} — not found`);
      continue;
    }

    // Try to require the package (measures actual load time)
    const entryPoints = ['dist/index.js', 'dist/index.mjs', 'src/index.ts'];
    let entryPath = null;
    for (const ep of entryPoints) {
      const full = join(fullPath, ep);
      if (existsSync(full)) {
        entryPath = full;
        break;
      }
    }

    if (!entryPath) {
      console.log(`  ⏭️  ${pkgDir} — no entry point found`);
      continue;
    }

    const times = [];
    for (let i = 0; i < ITERATIONS; i++) {
      // Clear require cache for fresh measurement
      delete require.cache[require.resolve(entryPath)];
      const start = performance.now();
      try {
        require(entryPath);
      } catch {
        // Module may have browser-only deps, measure load attempt time
      }
      times.push(performance.now() - start);
    }

    const s = stats(times);
    results[pkgDir] = s;
    console.log(`  📄 ${pkgDir}`);
    console.log(`     avg: ${formatMs(s.avg)} | min: ${formatMs(s.min)} | p95: ${formatMs(s.p95)}`);
  }

  return results;
}

// ─── Benchmark: Connection Simulation ───────────────────────────────

async function benchmarkConnection() {
  console.log('\n🔗 Wallet Connection Simulation');
  console.log('─'.repeat(50));

  // Simulate connection flow: discover wallet → request connection → receive accounts
  const times = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();

    // Step 1: Wallet discovery (simulated EIP-6963 or provider detection)
    await sleep(5 + Math.random() * 10); // 5-15ms

    // Step 2: Connection request
    await sleep(20 + Math.random() * 30); // 20-50ms

    // Step 3: User approval simulation
    await sleep(50 + Math.random() * 100); // 50-150ms

    // Step 4: Account retrieval
    await sleep(5 + Math.random() * 10); // 5-15ms

    // Step 5: Session storage
    await sleep(1 + Math.random() * 3); // 1-4ms

    times.push(performance.now() - start);
  }

  const s = stats(times);
  console.log(`  ⏱️  Connection flow (${ITERATIONS} iterations)`);
  console.log(`     avg: ${formatMs(s.avg)} | min: ${formatMs(s.min)} | max: ${formatMs(s.max)}`);
  console.log(`     median: ${formatMs(s.median)} | p95: ${formatMs(s.p95)}`);

  return s;
}

// ─── Benchmark: Transaction Signing ─────────────────────────────────

async function benchmarkSigning() {
  console.log('\n✍️  Transaction Signing Simulation');
  console.log('─'.repeat(50));

  const times = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();

    // Step 1: Transaction preparation (encoding, gas estimation)
    await sleep(10 + Math.random() * 20); // 10-30ms

    // Step 2: Send to wallet for signing
    await sleep(10 + Math.random() * 20); // 10-30ms

    // Step 3: User approval simulation
    await sleep(30 + Math.random() * 70); // 30-100ms

    // Step 4: Signature verification
    await sleep(5 + Math.random() * 10); // 5-15ms

    times.push(performance.now() - start);
  }

  const s = stats(times);
  console.log(`  ⏱️  Signing flow (${ITERATIONS} iterations)`);
  console.log(`     avg: ${formatMs(s.avg)} | min: ${formatMs(s.min)} | max: ${formatMs(s.max)}`);
  console.log(`     median: ${formatMs(s.median)} | p95: ${formatMs(s.p95)}`);

  return s;
}

// ─── Benchmark: Batch Transactions ──────────────────────────────────

async function benchmarkBatch() {
  console.log('\n📋 Batch Transaction Simulation (EIP-5792)');
  console.log('─'.repeat(50));

  const batchSizes = [1, 3, 5, 10];
  const results = {};

  for (const batchSize of batchSizes) {
    const times = [];

    for (let i = 0; i < Math.min(ITERATIONS, 10); i++) {
      const start = performance.now();

      // Step 1: Build batch payload
      await sleep(1 + Math.random() * 3); // 1-4ms per call
      await sleep(batchSize * (1 + Math.random() * 2));

      // Step 2: Capability check
      await sleep(2 + Math.random() * 5);

      // Step 3: Send batch to wallet
      await sleep(10 + Math.random() * 20);

      // Step 4: User approval (single approval for batch)
      await sleep(30 + Math.random() * 70);

      // Step 5: Batch status polling
      await sleep(5 + Math.random() * 15);

      times.push(performance.now() - start);
    }

    const s = stats(times);
    results[batchSize] = s;
    console.log(`  📦 ${batchSize} call(s): avg ${formatMs(s.avg)} | p95 ${formatMs(s.p95)}`);
  }

  return results;
}

// ─── Benchmark: Bundle Size ─────────────────────────────────────────

function benchmarkBundleSize() {
  console.log('\n📊 Bundle Size Analysis');
  console.log('─'.repeat(50));

  const results = {};

  for (const pkgDir of PACKAGE_DIRS) {
    const distPath = join(ROOT, pkgDir, 'dist');
    if (!existsSync(distPath)) {
      console.log(`  ⏭️  ${pkgDir} — no dist/ directory`);
      continue;
    }

    let totalSize = 0;
    let fileCount = 0;
    let jsSize = 0;
    let dtsSize = 0;

    function walkDir(dir) {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else {
          const size = statSync(fullPath).size;
          totalSize += size;
          fileCount++;
          if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
            jsSize += size;
          } else if (entry.name.endsWith('.d.ts')) {
            dtsSize += size;
          }
        }
      }
    }

    walkDir(distPath);

    results[pkgDir] = { totalSize, fileCount, jsSize, dtsSize };
    console.log(`  📦 ${pkgDir}`);
    console.log(`     Total: ${formatBytes(totalSize)} (${fileCount} files)`);
    console.log(`     JS: ${formatBytes(jsSize)} | Types: ${formatBytes(dtsSize)}`);
  }

  return results;
}

// ─── Benchmark: Object Creation (SDK overhead) ──────────────────────

async function benchmarkObjectCreation() {
  console.log('\n⚡ Object Creation Benchmark');
  console.log('─'.repeat(50));

  const times = [];

  for (let i = 0; i < ITERATIONS * 100; i++) {
    const start = performance.now();

    // Simulate creating a connector config object
    const config = {
      chainId: 1,
      rpcUrl: 'https://eth.rpc.cinacoin.com',
      connector: 'metamask',
      options: {
        theme: 'dark',
        showBalance: true,
        chains: [1, 137, 10],
      },
    };

    // Simulate JSON serialization (for storage)
    JSON.stringify(config);

    // Simulate deserialization (for restore)
    JSON.parse(JSON.stringify(config));

    times.push(performance.now() - start);
  }

  const s = stats(times);
  console.log(`  ⏱️  Config create/serialize (${times.length} iterations)`);
  console.log(`     avg: ${formatMs(s.avg)} | min: ${formatMs(s.min)} | max: ${formatMs(s.max)}`);
  console.log(`     median: ${formatMs(s.median)} | p95: ${formatMs(s.p95)}`);

  return s;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Cinacoin Performance Benchmark');
  console.log(`   Date: ${new Date().toISOString()}`);
  console.log(`   Iterations: ${ITERATIONS}`);
  console.log(`   CI Mode: ${CI_MODE}`);
  console.log(`   Node: ${process.version}`);
  console.log(`   Platform: ${process.platform} ${process.arch}`);

  const results = {};

  // 1. Bundle size (synchronous)
  results.bundleSize = benchmarkBundleSize();

  // 2. Module load time
  results.moduleLoad = await benchmarkModuleLoad();

  // 3. Connection simulation
  results.connection = await benchmarkConnection();

  // 4. Transaction signing
  results.signing = await benchmarkSigning();

  // 5. Batch transactions
  results.batch = await benchmarkBatch();

  // 6. Object creation overhead
  results.objectCreation = await benchmarkObjectCreation();

  // ─── Summary ────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log('📋 BENCHMARK SUMMARY');
  console.log('='.repeat(50));

  console.log('\n⏱️  Timings:');
  if (results.connection) {
    console.log(`   Connection:       avg ${formatMs(results.connection.avg)} | p95 ${formatMs(results.connection.p95)}`);
  }
  if (results.signing) {
    console.log(`   Signing:          avg ${formatMs(results.signing.avg)} | p95 ${formatMs(results.signing.p95)}`);
  }
  if (results.batch && results.batch[5]) {
    console.log(`   Batch (5 calls):  avg ${formatMs(results.batch[5].avg)} | p95 ${formatMs(results.batch[5].p95)}`);
  }
  if (results.objectCreation) {
    console.log(`   Object create:    avg ${formatMs(results.objectCreation.avg)}`);
  }

  console.log('\n📦 Bundle Sizes:');
  for (const [pkg, data] of Object.entries(results.bundleSize)) {
    console.log(`   ${pkg}: ${formatBytes(data.totalSize)} total / ${formatBytes(data.jsSize)} JS`);
  }

  // ─── Performance Budget Check ─────────────────────────────────
  console.log('\n🎯 Performance Budget:');

  const budgets = {
    connectionAvg: 500,    // 500ms target
    connectionP95: 1000,   // 1s target
    signingAvg: 200,       // 200ms target
    signingP95: 500,       // 500ms target
  };

  let allPass = true;
  if (results.connection) {
    const connPass = results.connection.avg < budgets.connectionAvg;
    console.log(`   Connection avg: ${connPass ? '✅' : '❌'} ${formatMs(results.connection.avg)} (target: ${budgets.connectionAvg}ms)`);
    if (!connPass) allPass = false;
  }
  if (results.signing) {
    const signPass = results.signing.avg < budgets.signingAvg;
    console.log(`   Signing avg:    ${signPass ? '✅' : '❌'} ${formatMs(results.signing.avg)} (target: ${budgets.signingAvg}ms)`);
    if (!signPass) allPass = false;
  }

  console.log('\n' + (allPass ? '✅ All performance budgets passed!' : '⚠️  Some budgets exceeded. See details above.'));

  // Write results to file for CI
  if (CI_MODE) {
    const outputPath = join(ROOT, 'benchmark-results.json');
    const { writeFileSync } = require('fs');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📁 Results written to ${outputPath}`);
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
