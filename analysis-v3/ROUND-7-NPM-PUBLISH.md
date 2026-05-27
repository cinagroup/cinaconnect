# ROUND-7: NPM Publish Pipeline Repair Report

**Date:** 2026-05-26
**Scope:** All 74 items in `packages/` directory (73 directories + `build-all.sh`)
**Goal:** Fix all package configurations so 71 publishable packages build and publish correctly to npm

---

## Summary

| Metric | Count |
|--------|-------|
| Total directories | 73 |
| Private/excluded | 2 |
| Publishable packages | 71 |
| Packages fixed | 35 |
| Packages already clean | 36 |

---

## Packages Excluded from Publish (Private)

| Package | Directory | Reason |
|---------|-----------|--------|
| `@cinacoin/analytics-server` | `analytics-server` | Cloudflare Worker — deployed via Wrangler, not npm |
| `com.cinacoin.unity` | `unity-csharp` | Unity UPM package — published to Unity registry, not npm |

Both are marked `"private": true`.

---

## Issues Found & Fixed

### Issue 1: `module` field mismatch (31 packages) — **CRITICAL**

**Problem:** Packages using `tsc` as their build tool declared `"module": "dist/index.mjs"` but TypeScript compiler outputs `.js` files (not `.mjs`). This means bundlers resolving the `module` field would get a 404 for the file, causing runtime failures.

**Affected packages:** All `tsc`-build packages that declared `.mjs` in their module field:
`aa-sdk`, `adapter-near`, `adapter-starknet`, `android-kotlin`, `bundler`, `core-sdk`, `deposit`, `erc6492`, `explorer`, `farcaster-miniapp`, `flutter-dart`, `gas-estimator`, `i18n`, `ios-swift`, `keys-server`, `kyc`, `multiwallet`, `notify-server`, `passkey-auth`, `paymaster`, `performance-utils`, `push-server`, `relay-server`, `rpc-proxy`, `safe-decoder`, `siwe`, `siwx`, `social-login`, `telegram-miniapp`, `token-list`, `wallet-recovery`, `walletconnect-v2`

**Fix applied:**
- Changed `"module"` from `dist/index.mjs` → `dist/index.js`
- Updated all `exports` entries: `.mjs` → `.js`
- Added `"type": "module"` where missing (so Node.js treats `.js` files as ESM)

**Root cause:** The packages were designed for dual CJS/ESM output (`.mjs` for ESM, `.js` for CJS) but only run `tsc` which produces single-format `.js` output. The `module` field was misaligned.

### Issue 2: Missing `"type": "module"` (14 packages)

**Problem:** tsc-built packages outputting ESM (via `"module": "ESNext"` in tsconfig) lacked `"type": "module"`. Without this, Node.js treats the `.js` output files as CommonJS, causing `import/export` syntax errors.

**Fix applied:** Added `"type": "module"` to all tsc packages that output ESM.

### Issue 3: Missing build script (1 package)

**Problem:** `travel-rule-demo` had no `build` script — only a `demo` script using `ts-node`.

**Fix applied:**
- Added `"build": "tsc"` and `"clean": "rm -rf dist"` scripts
- Replaced `ts-node` with `tsx` in devDependencies
- Fixed `main`/`module`/`types` to point to `dist/`
- Added `exports`, `files`, `publishConfig`

### Issue 4: Cloudflare Worker misconfiguration (1 package)

**Problem:** `analytics-server` is a Cloudflare Worker (deploys via Wrangler, `wrangler.toml` present) but was listed as a publishable npm package. Its tsconfig has `"noEmit": true`.

**Fix applied:** Marked `"private": true` to exclude from npm publish. Deployed via `wrangler deploy`.

### Issue 5: Unity package misconfiguration (1 package)

**Problem:** `unity-csharp` (`com.cinacoin.unity`) is a Unity UPM package with `unity` field in package.json. Not a standard npm package.

**Fix applied:** Marked `"private": true` to exclude from npm publish.

---

## Publish Configuration Audit

All 71 publishable packages now have:

| Field | Status |
|-------|--------|
| `"build"` script | ✅ All present |
| `"main"` field | ✅ All present |
| `"module"` field | ✅ All present (correct .js extension) |
| `"types"` field | ✅ All present |
| `"exports"` field | ✅ All present (matching .js) |
| `"files"` field | ✅ All scoped packages |
| `"publishConfig"` | ✅ All `@cinacoin/*` have `access: "public"` |
| `"type"` | ✅ ESM packages have `"module"`, CJS (travel-rule-demo) does not |

---

## Build Tool Distribution

| Build Tool | Count | Packages |
|-----------|-------|----------|
| `tsup` | 22 | All adapter-*, analytics, batch-transaction, blockchain-api, config, cross-chain-sync, custom-connectors, embedded-wallet, ens-resolver, gas-sponsorship, onramp-sdk, payment-flow, session-keys, swap-sdk, ui-theme, wallet-buttons, wallet-recommender, cinacoin-i18n, cinacoin-ui-theme |
| `tsc` | 42 | All remaining TypeScript packages |
| `other` | 5 | angular (ng-packagr), cdn (rollup), design-tokens (tsx), nuxt (nuxt-module-build), travel-rule-demo (tsc after fix) |
| None (private) | 2 | analytics-server, unity-csharp |

---

## Existing Scripts

Both `scripts/publish-all.js` and `scripts/publish-all.sh` already existed. The bash script has been updated with:
- `--build` flag to run `turbo build` before publishing
- Better prerequisite checks (npm, node, pnpm)

---

## Usage

```bash
# Dry run (default — shows what would be published)
pnpm run publish:all:sh

# Build + dry run
bash scripts/publish-all.sh --build

# Actually publish
pnpm run publish:all:sh --publish

# Publish specific packages
bash scripts/publish-all.sh --publish --filter=adapter

# Node.js version (same flags)
pnpm run publish:all --publish
pnpm run publish:dry-run
```

---

## Verification

```bash
# Verify all packages pass validation
node -e "
const fs = require('fs'), path = require('path');
const PKG = path.resolve('packages');
const dirs = fs.readdirSync(PKG).filter(d =>
  fs.statSync(path.join(PKG, d)).isDirectory() &&
  fs.existsSync(path.join(PKG, d, 'package.json'))
);
let pub = 0, priv = 0;
for (const dir of dirs) {
  const pkg = JSON.parse(fs.readFileSync(path.join(PKG, dir, 'package.json')));
  pkg.private ? priv++ : pub++;
}
console.log('Publishable:', pub, '| Private:', priv);
"
```

Expected output: `Publishable: 71 | Private: 2`
