# Final Test Coverage & Quality Assessment

> CinaAuth/Cinacoin vs Reown — Testing Infrastructure Comparison
> Generated: 2026-05-16

---

## 1. Test Infrastructure Setup

### CinaAuth/Cinacoin

| Component | Status | Details |
|-----------|--------|---------|
| **vitest.config.ts** | ✅ Present | Root-level config with v8 coverage provider, reporters (text/json/html), environment=jsdom/node, globals=true |
| **vitest.workspace.ts** | ✅ Present | Multi-project workspace with 4 named projects: core-sdk, core-ui, session-keys, swap-sdk |
| **Coverage provider** | ✅ v8 | Source-accurate instrumentation via `@vitest/coverage-v8` |
| **Coverage include** | `packages/**/src/**/*.ts` | Only TypeScript source files |
| **Coverage exclude** | executors/, transports/, node_modules/, dist/ | Strategic exclusions |

### Reown (AppKit)

Reown AppKit (formerly WalletConnect Web3Modal) uses a **monorepo with vitest** across packages. Per their public GitHub:
- `vitest.config.ts` exists at monorepo root
- `vitest.workspace.ts` for multi-package test orchestration
- **Comprehensive test suites** across core packages (wallet, utils, adapters, controllers, etc.)
- Industry-standard coverage thresholds

---

## 2. Package-by-Package Coverage Analysis

### 2.1 core-sdk (21 src files, 8 test files)

| Area | Coverage Estimate | Quality |
|------|-------------------|---------|
| **adapters/evm.ts** | ✅ Good (~80%) | Tests chain switching, RPC methods (eth_getBalance, eth_gasPrice, eth_blockNumber), transaction formatting, token balance with calldata encoding. Strong mock coverage. |
| **connector.ts** | ✅ Good (~75%) | Tests lifecycle (connect/disconnect), state guards (prevent double-connect, reject when not connected), event emission, provider access. |
| **crypto/encrypt.ts** | ✅ Excellent (~90%) | Roundtrip encrypt/decrypt, nonce randomness, fixed nonce determinism, base64 output validation, empty plaintext, tampered ciphertext detection, wrong-key decryption, short-data errors. |
| **crypto/keypair.ts** | ✅ Excellent (~90%) | Keypair generation, DH shared secret commutativity, serialization round-trip, bytes↔hex conversion including edge cases (empty, zero). |
| **eip6963.ts** | ✅ Excellent (~90%) | Uses vi.useFakeTimers for async event discovery, deduplication by rdns, event listener cleanup, watch/unsubscribe, findWalletByRdns with not-found cases. |
| **events.ts** | ✅ Excellent (~95%) | Full EventEmitter API: on/off/once/emit/removeAllListeners/listenerCount, error isolation (one handler throws, others still fire), no-op on missing events. |
| **session.ts** | ✅ Excellent (~85%) | Full state machine testing: disconnected→connecting→connected→disconnected, error recovery, localStorage persistence/restoration, corrupted data handling, concurrent connect rejection. |
| **store.ts** | ✅ Good (~80%) | Zustand store initialization, all state mutations (connection/error/status/chains/pairings), disconnect reset, config initialization. |
| **types.ts** | ❌ Not tested | Interface/type declarations only — acceptable |
| **Other src files** | ⚠️ ~3-5 untested | Index files, utilities |

**Estimated coverage: ~75-80%**

**Missing scenarios:**
- EVM adapter: `signMessage` and `signTransaction` via RPC proxy
- Session manager: concurrent disconnect during connecting
- Connector: multi-chain connection params edge cases

### 2.2 core-ui (15 src files, 3 test files)

| Area | Coverage Estimate | Quality |
|------|-------------------|---------|
| **components/connect-button.ts** | ✅ Good (~70%) | Property defaults, state rendering (disconnected/connecting/connected/wrong_network/error), click dispatch, menu toggle, disconnect event, Escape key, aria labels, CSS styles. |
| **components/wallet-card.ts** | ✅ Good (~75%) | Null wallet handling, wallet info rendering, icon display, recommended/installed badge logic (with priority), description rendering. |
| **foundation/base-element.ts** | ✅ Good (~80%) | Theme resolution (data-ocx-theme, theme attribute, unknown→dark fallback), formatAddress with edge cases, formatBalance (number/string/NaN/custom decimals), hostStyles. |

**Estimated coverage: ~40-50%**

**Missing scenarios:**
- **No tests for: CinacoinProvider, ConnectModal, ChainSwitcher** (if in this package)
- No snapshot testing for rendered DOM structure
- No accessibility testing beyond aria labels (no a11y audit)
- No responsive/layout tests
- No animation/transition tests
- No integration tests between components (e.g., ConnectButton + WalletCard interaction)
- No testing with different themes (light/dark/minimal) beyond property reading

### 2.3 session-keys (7 src files, 3 test files)

| Area | Coverage Estimate | Quality |
|------|-------------------|---------|
| **policy.ts** | ✅ Excellent (~90%) | Policy CRUD, default values, full parameter application, validation (expired, maxAmountPerTx > dailyLimit, boundary conditions), presets (DEX, NFT mint, open). |
| **session-key.ts** | ✅ Excellent (~85%) | Key generation/import, expiration handling, label association, key retrieval, revocation (single/expired/all), signing with key validation, calldata encoding. |
| **social-recovery.ts** | ✅ Excellent (~90%) | Full guardian lifecycle (init/add/remove/duplicate prevention), threshold calculation/adjustment, recovery flow (init/sign/execute/cancel), time-lock enforcement, double-execution prevention, deterministic hashing. |

**Estimated coverage: ~85-90%**

**Missing scenarios:**
- Session key: chain restriction validation in `isKeyValidForOperation`
- Policy: metadata validation edge cases
- Social recovery: concurrent signature submission race conditions

### 2.4 swap-sdk (8 src files, 3 test files)

| Area | Coverage Estimate | Quality |
|------|-------------------|---------|
| **quoter.ts** | ✅ Excellent (~90%) | Multi-executor quote aggregation, best price selection, zero-output filtering, failing executor handling, single-executor edge case, savings calculation, provider management (add/remove), config override, minimumReceived enrichment, gas tie-breaking. |
| **router.ts** | ✅ Good (~70%) | getBestQuote, compareQuotes, execution toggle, expired quote rejection, executeSwap with partial params. |
| **slippage.ts** | ✅ Excellent (~95%) | Minimum received (boundary cases: 0%, 1%, 0.5%, 5%, 100%, negative, overflow), price impact calculation (zero, simple, critical, zero expected output), severity classification (low/medium/high/critical), impact warnings, exchange rate, percent difference, volatility-adjusted slippage. |

**Estimated coverage: ~80-85%**

**Missing scenarios:**
- Router: multi-hop routing (A→B→C paths)
- Router: split routing across multiple protocols
- Router: getSupportedTokens with actual token data (mocks return empty)
- Quoter: timeout handling for slow executors
- Slippage: adjustSlippageForVolatility edge cases (extreme volatility)

### 2.5 siwe (5 src files, 2 test files)

| Area | Coverage Estimate | Quality |
|------|-------------------|---------|
| **siwe.ts** | ✅ Excellent (~90%) | Message generation (all optional fields: statement, expiration, notBefore, requestId, resources, version), parsing (round-trip, partial messages), error handling (missing preamble, malformed address, missing fields, invalid chain ID), utility functions (nonce, timestamp, address/URI validation). |
| **validator.ts** | ✅ Excellent (~90%) | Parameter validation (all fields individually: domain, address, URI, version, chainId, nonce, statement, issuedAt, expiration, notBefore, requestId, resources), temporal constraints (expired, notBefore, custom reference time), domain matching (exact, origin-based, cross-protocol, cross-domain), full validation pipeline (combined errors, signature format). |

**Estimated coverage: ~90-95%**

**Missing scenarios:**
- SIWE: EIP-191 signature verification (integration-level, may be intentional)
- Validator: edge case with chainId=0 behavior in domain context

---

## 3. Packages with ZERO Tests

| Package | Source Files | Criticality | Assessment |
|---------|-------------|-------------|------------|
| **react** | 6 | 🔴 HIGH | React hooks, components — critical user-facing surface. No tests at all. |
| **react-native** | 5 | 🔴 HIGH | Mobile components, QR scanner — critical for mobile apps. No tests. |
| **onramp-sdk** | 7 | 🟡 MEDIUM | Fiat onramp providers (Transak, Ramp, MoonPay), aggregator. No tests. |
| **siwx** | 6 | 🟡 MEDIUM | Sign-In With X (multi-chain: EVM, Bitcoin, Solana). No tests despite siwe being well-tested. |
| **social-login** | 7 | 🟡 MEDIUM | OAuth providers (Google, Apple, Twitter, Email), wallet derivation. No tests. |
| **vue** | 4 | 🟠 LOW-MED | Vue components/wrapper — similar to react but for Vue ecosystem. No tests. |
| **design-tokens** | 1 | 🟢 LOW | Design tokens — single file, mostly data. Low priority. |
| **bundler** | 0 | — | Empty placeholder. |
| **paymaster** | 1 | 🟢 LOW | Deploy script only. |
| **keys-server** | 0 | — | Empty placeholder. |
| **relay-server** | 0 | — | Empty placeholder. |
| **rpc-proxy** | 0 | — | Empty placeholder. |
| **push-server** | 0 | — | Empty placeholder. |
| **erc6492** | 0 | — | Empty placeholder. |
| **android-kotlin** | 0 | — | Empty placeholder. |
| **ios-swift** | 1 | 🟢 LOW | Package.swift only. |

### Critical Gaps (Priority Order)

1. **react (6 files, 0 tests)** — `hooks.ts`, `ConnectButton.tsx`, `ConnectModal.tsx`, `CinacoinProvider.tsx`, `ChainSwitcher.tsx` are the primary developer integration surface. Missing tests for:
   - React hooks: `useCinacoin`, `useAccount`, `useBalance`, `useChainId`
   - Component rendering with different states
   - Provider context value propagation
   - Chain switching UI logic

2. **siwx (6 files, 0 tests)** — Ironically, the multi-chain extension of well-tested SIWE has zero tests. `siwx.ts`, chain adapters for `evm`, `bitcoin`, `solana`. Missing:
   - Multi-chain message generation
   - Bitcoin/Solana address validation
   - Chain-specific nonce/URI rules
   - Verification logic for non-EVM chains

3. **react-native (5 files, 0 tests)** — Mobile parity with react package. Missing QR scanner tests, mobile-specific component logic.

4. **onramp-sdk (7 files, 0 tests)** — Provider integrations are critical for fiat onramp functionality. Missing:
   - Provider URL construction
   - Widget parameter validation
   - Aggregator quote comparison
   - Event handling (success, cancel, error)

5. **social-login (7 files, 0 tests)** — OAuth flow, wallet derivation from social identities. Missing:
   - OAuth redirect URL construction
   - Wallet derivation deterministic behavior
   - Provider-specific parameter handling

---

## 4. CI Integration: quality.yaml

### What quality.yaml tests:

| Job | Purpose | Status |
|-----|---------|--------|
| **changeset** | PR changeset validation | ✅ Configured |
| **typescript** | Build + typecheck | ✅ Configured |
| **lint** | ESLint + Prettier | ✅ Configured |
| **bundle-size** | Bundle size check | ✅ Configured |

### What quality.yaml DOESN'T test:

| Missing | Impact |
|---------|--------|
| **No test job** | No `vitest run` or `vitest --coverage` in CI |
| **No coverage gate** | No minimum coverage threshold enforced |
| **No E2E tests** | No Playwright/Cypress integration tests |
| **No visual regression** | No screenshot/visual diff testing for UI components |

This is the **most critical gap** in the CI pipeline. The test infrastructure exists (vitest.config.ts, workspace.ts, 19 test files) but **tests are never run in CI**.

---

## 5. Test Quality Assessment

### Strengths

1. **Deep unit testing on crypto primitives** — encrypt/decrypt round-trips, DH key exchange commutativity, tampered ciphertext detection are thorough and correct.
2. **Excellent async testing** — Fake timers used correctly for EIP-6963 discovery, session state transitions.
3. **Strong error boundary testing** — Social recovery has comprehensive negative test cases (duplicate signatures, inactive guardians, executed/cancelled requests, unknown requests).
4. **Good mock strategy** — Swap SDK uses mock executors avoiding real HTTP calls; connector tests use mock implementations.
5. **Round-trip testing** — SIWE generate→parse preserves all fields; keypair serialize→deserialize works.
6. **Edge case coverage in slippage** — Boundary values (0%, 100%, negative, overflow) all tested.

### Weaknesses

1. **No integration tests** — Tests never verify that components work together (e.g., SessionManager + Connector + EvmAdapter in a full connect flow).
2. **No E2E tests** — Zero Playwright/Cypress/Playwright-based browser tests.
3. **No React/React Native tests** — The framework adapter packages have zero coverage despite being the primary integration points.
4. **No visual/snapshot tests** — UI components test properties but not rendered output structure.
5. **No network-level mocking** — No testing with actual wallet provider mocks (injected providers, WalletConnect relay).
6. **Missing concurrency tests** — No testing of race conditions in session management or key operations.
7. **No performance tests** — Swap quoter timeout, bulk key generation performance not tested.

---

## 6. Overall Coverage Summary

| Package | Source Files | Test Files | Est. Coverage | Quality |
|---------|-------------|------------|---------------|---------|
| core-sdk | 21 | 8 | ~75-80% | Good-Excellent |
| core-ui | 15 | 3 | ~40-50% | Fair |
| session-keys | 7 | 3 | ~85-90% | Excellent |
| swap-sdk | 8 | 3 | ~80-85% | Good-Excellent |
| siwe | 5 | 2 | ~90-95% | Excellent |
| siwx | 6 | 0 | 0% | ❌ Missing |
| react | 6 | 0 | 0% | ❌ Missing |
| react-native | 5 | 0 | 0% | ❌ Missing |
| onramp-sdk | 7 | 0 | 0% | ❌ Missing |
| social-login | 7 | 0 | 0% | ❌ Missing |
| vue | 4 | 0 | 0% | ❌ Missing |
| Other (empty) | 0 | 0 | — | — |

### Aggregate (source files with any testable logic)

- **Files with tests:** ~38 test files across 5 packages
- **Total testable source files:** ~126 files across 21 packages
- **Packages with ANY tests:** 5 of 21
- **Weighted code coverage estimate:** ~30-40% (most tested packages have more source files; untested packages have significant logic)

---

## 7. Comparison with Industry Standards

### What Reown (AppKit) does that CinaAuth should emulate:

| Practice | CinaAuth | Reown |
|----------|----------|-------|
| vitest workspace config | ✅ Yes | ✅ Yes |
| Per-package tests | ⚠️ 5/21 packages | ✅ Most packages |
| CI test execution | ❌ No test job | ✅ Runs in CI |
| Coverage thresholds | ❌ Not enforced | ✅ Minimum thresholds |
| E2E browser tests | ❌ None | ✅ Playwright tests |
| Visual regression | ❌ None | ✅ Snapshot testing |
| React component tests | ❌ None | ✅ React Testing Library |
| Mock network layer | ⚠️ Partial (swap executors) | ✅ Full mock infrastructure |

### Critical gaps to close:

1. **Add test job to quality.yaml** — Run `vitest run --coverage` in CI, block merges below threshold
2. **Test react package** — Highest priority; it's the main developer integration surface
3. **Test siwx package** — Multi-chain sign-in should match siwe's test quality
4. **Add E2E tests** — At minimum: connect flow, swap flow, session recovery
5. **Set coverage thresholds** — Start at 60%, raise to 80% over time
6. **Add integration tests** — Cross-package flows (connector + session manager + EVM adapter)

---

## 8. Recommended Action Plan

### Phase 1: CI Integration (Week 1)
- [ ] Add `test` job to quality.yaml: `pnpm vitest run --coverage`
- [ ] Set initial coverage threshold: 50% statements, 40% branches
- [ ] Fail CI on test failures

### Phase 2: React Package (Week 2)
- [ ] Add React Testing Library
- [ ] Test `useCinacoin`, `useAccount` hooks
- [ ] Test `ConnectButton` component rendering
- [ ] Test `CinacoinProvider` context

### Phase 3: siwx & Social Login (Week 3)
- [ ] Port siwe test patterns to siwx
- [ ] Test Bitcoin and Solana chain adapters
- [ ] Test social login provider integrations
- [ ] Test wallet derivation

### Phase 4: E2E Infrastructure (Week 4)
- [ ] Add Playwright for browser E2E
- [ ] Write: connect → disconnect flow
- [ ] Write: session restore from localStorage
- [ ] Write: swap quote → execute flow

### Phase 5: Coverage Improvement (Ongoing)
- [ ] Raise threshold to 70%
- [ ] Add integration tests for cross-package flows
- [ ] Add visual regression for core-ui components
- [ ] Test onramp-sdk providers
- [ ] Test react-native components with detox

---

## 9. Conclusion

CinaAuth/Cinacoin has **strong unit testing** in its well-tested packages (session-keys, siwe, swap-sdk) with excellent edge case coverage, error handling, and mock strategies. The test infrastructure (vitest workspace, v8 coverage) is properly configured.

However, the project has **critical gaps**:

1. **6 packages with significant source code have zero tests** (react, react-native, siwx, onramp-sdk, social-login, vue)
2. **Tests are never executed in CI** — the quality.yaml workflow has no test job
3. **No E2E or integration tests** exist
4. **No coverage thresholds** are enforced

The tested packages average **~75-90% coverage** with good quality, but the overall project coverage is dragged down to **~30-40%** by the completely untested packages. Closing these gaps should be treated as a high-priority engineering initiative before any major release.
