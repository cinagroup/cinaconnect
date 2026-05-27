/**
 * Bundle Size Analysis Script
 *
 * Analyzes the built bundles for each package and warns if they exceed
 * configured thresholds. Run via `pnpm check-bundle`.
 *
 * Usage:
 *   npx tsx scripts/check-bundle-size.ts
 *   npx tsx scripts/check-bundle-size.ts --verbose
 */
import { existsSync, statSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
const THRESHOLDS = [
    {
        name: '@cinacoin/core-sdk',
        path: 'packages/core-sdk/dist',
        maxMain: 50000, // 50 KB
        maxTotal: 150000, // 150 KB
    },
    {
        name: '@cinacoin/core-ui',
        path: 'packages/core-ui/dist',
        maxMain: 80000,
        maxTotal: 250000,
    },
    {
        name: '@cinacoin/react',
        path: 'packages/react/dist',
        maxMain: 40000,
        maxTotal: 120000,
    },
    {
        name: '@cinacoin/vue',
        path: 'packages/vue/dist',
        maxMain: 40000,
        maxTotal: 120000,
    },
    {
        name: '@cinacoin/swap-sdk',
        path: 'packages/swap-sdk/dist',
        maxMain: 30000,
        maxTotal: 80000,
    },
];
const ROOT = resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function analyzePackage(threshold) {
    const distPath = join(ROOT, threshold.path);
    if (!existsSync(distPath)) {
        console.warn(`⚠️  ${threshold.name}: dist not found at ${threshold.path}`);
        return null;
    }
    const files = [];
    let mainSize = 0;
    function walkDir(dir) {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                walkDir(fullPath);
            }
            else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
                const size = statSync(fullPath).size;
                const relative = fullPath.replace(distPath + '/', '');
                files.push({ path: relative, size });
                // The main bundle is typically index.js or the package's entry
                if (entry.name === 'index.js' || entry.name === 'index.mjs' || mainSize === 0) {
                    mainSize = Math.max(mainSize, size);
                }
            }
        }
    }
    walkDir(distPath);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    return { name: threshold.name, files, mainSize, totalSize };
}
function checkBundle(info, threshold) {
    const warnings = [];
    let pass = true;
    if (info.mainSize > threshold.maxMain) {
        warnings.push(`Main bundle exceeds threshold: ${formatBytes(info.mainSize)} > ${formatBytes(threshold.maxMain)} (+${formatBytes(info.mainSize - threshold.maxMain)})`);
        pass = false;
    }
    if (info.totalSize > threshold.maxTotal) {
        warnings.push(`Total bundle exceeds threshold: ${formatBytes(info.totalSize)} > ${formatBytes(threshold.maxTotal)} (+${formatBytes(info.totalSize - threshold.maxTotal)})`);
        pass = false;
    }
    return { pass, warnings };
}
// ─── Main ───────────────────────────────────────────────────────────
function main() {
    console.log('📦 Cinacoin Bundle Size Check\n');
    let allPassed = true;
    const results = [];
    for (const threshold of THRESHOLDS) {
        const info = analyzePackage(threshold);
        if (!info)
            continue;
        const { pass, warnings } = checkBundle(info, threshold);
        if (!pass)
            allPassed = false;
        results.push({ name: threshold.name, pass, warnings, info });
        const icon = pass ? '✅' : '❌';
        console.log(`${icon} ${threshold.name}`);
        console.log(`   Main:  ${formatBytes(info.mainSize)} / ${formatBytes(threshold.maxMain)}`);
        console.log(`   Total: ${formatBytes(info.totalSize)} / ${formatBytes(threshold.maxTotal)}`);
        if (warnings.length > 0) {
            for (const w of warnings) {
                console.log(`   ⚠️  ${w}`);
            }
        }
        if (VERBOSE && info.files.length > 0) {
            console.log('   Files:');
            const sorted = [...info.files].sort((a, b) => b.size - a.size);
            for (const f of sorted.slice(0, 10)) {
                console.log(`     ${formatBytes(f.size).padStart(10)}  ${f.path}`);
            }
            if (sorted.length > 10) {
                console.log(`     ... and ${sorted.length - 10} more files`);
            }
        }
        console.log();
    }
    if (!allPassed) {
        console.log('❌ Bundle size check FAILED');
        process.exit(1);
    }
    else {
        console.log('✅ All bundles within thresholds');
    }
}
main();
//# sourceMappingURL=check-bundle-size.js.map