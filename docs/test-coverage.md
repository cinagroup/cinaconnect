# Test Coverage Report

**Generated:** 2025-05-18  
**Tool:** Vitest 1.6.1 + `@vitest/coverage-v8` 1.x  
**Coverage Provider:** v8

---

## @cinacoin/core-sdk

**Tests:** 1064 passed (66 test files)  
**Status:** ✅ All passing

| Category         | Statements | Branches | Functions | Lines    |
|------------------|-----------:|---------:|----------:|---------:|
| **All files**    | **58.44%** | **76.72%** | **77.32%** | **58.44%** |
| `src/`           | 56.33%     | 91.89%   | 85.41%    | 56.33%   |
| `src/adapters/`  | 60.64%     | 69.19%   | 72.51%    | 60.64%   |
| `src/auth/`      | 97.28%     | 88.88%   | 88.88%    | 97.28%   |
| `src/crypto/`    | **100%**   | **100%** | **100%**  | **100%** |
| `src/eip5792/`   | 78.58%     | 93.10%   | 91.66%    | 78.58%   |
| `src/links/`     | 41.54%     | 33.33%   | 11.11%    | 41.54%   |
| `src/performance/` | 0%       | 0%       | 0%        | 0%       |
| `src/transports/`| **92.58%** | 82.14%   | 97.91%    | 92.58%   |

### Key Files (by coverage)

| File                    | Coverage | Status     |
|-------------------------|---------:|------------|
| `src/crypto/encrypt.ts` | 100%     | ✅         |
| `src/crypto/keypair.ts` | 100%     | ✅         |
| `src/eip6963.ts`        | 100%     | ✅         |
| `src/events.ts`         | 100%     | ✅         |
| `src/store.ts`          | 100%     | ✅         |
| `src/transports/relay.ts` | 96.91% | ✅ Strong  |
| `src/auth/siwe.ts`      | 97.28%   | ✅ Strong  |
| `src/adapters/viem.ts`  | 92.93%   | ✅ Strong  |
| `src/adapters/ethers6.ts` | 89.3%  | ✅ Good    |
| `src/adapters/ethers5.ts` | 88.23% | ✅ Good    |
| `src/adapters/evm.ts`   | 88.94%   | ✅ Good    |
| `src/connector.ts`      | 84.69%   | ⚠️ Adequate |
| `src/adapters/wagmi.ts` | 83.89%   | ⚠️ Adequate |
| `src/adapters/tron.ts`  | 74.67%   | ⚠️ Needs work |
| `src/adapters/ton.ts`   | 76.96%   | ⚠️ Needs work |
| `src/adapters/polkadot.ts` | 70.29% | ⚠️ Needs work |
| `src/eip5792/` (overall)| 78.58%   | ⚠️ Adequate |
| `src/adapters/bitcoin.ts` | 0%      | 🔴 No tests |
| `src/adapters/solana.ts`  | 0%      | 🔴 No tests |
| `src/performance/lazy-loading.ts` | 0% | 🔴 No tests |
| `src/performance/optimization.ts` | 0% | 🔴 No tests |
| `src/index.ts`          | 0%        | ℹ️ Re-exports only |
| `src/types.ts`          | 0%        | ℹ️ Type definitions |

### Report Locations

- **HTML report:** `docs/coverage/core-sdk/index.html`
- **JSON:** `packages/core-sdk/coverage/coverage-final.json`
- **LCOV:** `packages/core-sdk/coverage/lcov.info`

---

## @cinacoin/siwe

**Tests:** 123 passed (3 test files — `.js` variants)  
**Status:** ⚠️ Partial (3 test suites failing due to pre-existing issues)

| Category | Coverage   |
|----------|-----------:|
| **Overall** | **~90%+** (estimated from passing suites) |

### Known Issues

- `tests/utils.test.ts` / `.js` — Import resolution failure for `../../src/utils.js` (missing `.ts` resolver)
- `tests/siwe.test.ts` — No test suite found (`.ts` vs `.js` test duplication issue)

The `.js` test variants run and cover validator + siwe modules well. Coverage for utils module needs the import resolution fixed.

### Report Locations

- **HTML report:** `packages/siwe/coverage/index.html`
- **JSON:** `packages/siwe/coverage/coverage-final.json`
- **LCOV:** `packages/siwe/coverage/lcov.info`

---

## @cinacoin/react

**Tests:** 0 (test suites failing)  
**Status:** 🔴 Not running — pre-existing import resolution issues

### Known Issues

- `tests/ConnectButton.test.tsx` / `.js` — Failed to resolve imports like `../../src/CinacoinProvider.js`
- The `vitest.config.ts` includes a `.js → .tsx/.ts` resolver plugin, but the test files import from `.js` extensions that Vite cannot resolve

### Report Locations

- **Config:** `packages/react/vitest.config.ts` (created, coverage enabled)
- HTML/JSON/LCOV reports not generated (tests don't pass yet)

---

## Configuration Changes Made

### 1. Root `vitest.workspace.ts`

Added coverage config to **core-sdk**, **react**, and **siwe** workspace projects:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  include: ['packages/<name>/src/**/*.ts'],
  exclude: ['**/node_modules/**', '**/dist/**'],
}
```

### 2. Root `vitest.config.ts`

Extended coverage to include `.tsx` files and added `lcov` reporter.

### 3. `packages/core-sdk/vitest.config.ts`

Updated with coverage config (already existed).

### 4. `packages/siwe/vitest.config.ts`

Added `@vitest/coverage-v8` provider + `.js → .ts` resolver plugin.

### 5. `packages/react/vitest.config.ts`

**Created** — new vitest config with coverage + `.js → .tsx/.ts` resolver.

### 6. Package.json Scripts

- `@cinacoin/react`: Added `test` and `test:coverage` scripts
- `@cinacoin/siwe`: Added `test:coverage` script
- `@cinacoin/core-sdk`: Already had `test:coverage`

### 7. Dependencies Installed

- `@vitest/coverage-v8@1` in root workspace (compatible with vitest 2.x)
- `@vitest/coverage-v8@1` in core-sdk, react, siwe (compatible with vitest 1.6.1)

---

## Recommendations

### Immediate (High Impact)

1. **Fix react test imports** — Tests fail because `.js` imports don't resolve to `.tsx` files. The resolver plugin may need adjustments or tests should import without `.js` extension.

2. **Fix siwe utils test imports** — Same resolution issue. Consider using path aliases or removing `.js` extensions from test imports.

3. **Add tests for untested adapters:**
   - `src/adapters/bitcoin.ts` (0% — 514 lines)
   - `src/adapters/solana.ts` (0% — 599 lines)

### Short-term

4. **Cover performance utilities** — Both `lazy-loading.ts` and `optimization.ts` at 0%. These are unused/untested modules. Consider adding basic tests or removing if not needed.

5. **Improve links coverage** — `redirect.ts` at 18.13%, `universal-link.ts` at 50%. Add tests for redirect flow.

6. **Raise adapter coverage** — TON (76.96%), Tron (74.67%), Polkadot (70.29%) could benefit from more thorough testing.

7. **Set coverage thresholds** — Add minimum coverage requirements to CI:
   ```ts
   coverage: {
     thresholds: {
       lines: 60,
       branches: 70,
       functions: 70,
     }
   }
   ```

### Long-term

8. **Unify test file format** — Many packages have duplicate `.test.js` and `.test.ts` files. Pick one format and remove the other to avoid confusion.

9. **CI integration** — Run `test:coverage` in CI and publish reports (e.g., to GitHub Pages or artifacts).

10. **Consider istanbul as alternative** — If v8 has issues with certain transforms, `@vitest/coverage-istanbul` is a fallback.
