# 🔢 Cinacoin Performance Audit Report

**Date:** 2026-05-27  
**Auditor:** 000 (Performance Subagent)  
**Scope:** Bundle sizes, tree-shaking, import anti-patterns, memory leaks

---

## Task 1: Bundle Size Audit

### Bundle Sizes (sorted by size)

| Package | dist/ Size | Status |
|---------|-----------|--------|
| `core-sdk` | 1.7 MB | ⚠️ Large |
| `i18n` | 572 KB | ⚠️ Large |
| `social-login` | 520 KB | ⚠️ Large |
| `core-ui` | 456 KB | ⚠️ Large |
| `react-native` | 452 KB | ⚠️ Large |
| `walletconnect-v2` | 296 KB | OK |
| `embedded-wallet` | 288 KB | OK |
| `siwx` | 280 KB | OK |
| `ui-theme` | 264 KB | OK |
| `payment-flow` | 260 KB | OK |
| `multiwallet` | 180 KB | OK |
| `react` | 172 KB | OK |
| `cdn` | 96 KB | ✅ Good |
| `onramp-sdk` | 120 KB | OK |
| `performance-utils` | 136 KB | OK |

### Findings

- **`core-sdk` at 1.7 MB is the primary concern.** This is the main SDK and should be audited for what's inflating it (likely crypto libraries, adapters, or bundled dependencies).
- **5 packages exceed 400KB.** Consider code-splitting or lazy loading for non-essential adapters.
- `cdn` at 96KB is well within bounds — good.

---

## Task 2: Tree-shaking Check

### ✅ Properly Configured

| Package | sideEffects | exports | module |
|---------|------------|---------|--------|
| `core-sdk` | `false` | ✅ Proper ESM/CJS | ✅ |
| `multiwallet` | `false` | ✅ Proper ESM/CJS | ✅ |
| `performance-utils` | `false` | ✅ Subpath exports | ✅ |
| `react` | `null` | ✅ Proper ESM/types | ✅ |

### ❌ Missing `sideEffects` (High Priority)

The following packages have `"type": "module"` but **no `sideEffects` field**. This prevents bundlers from dead-code elimination:

- `aa-sdk`, `adapter-bitcoin`, `adapter-cosmos`, `adapter-hedera`, `adapter-near`, `adapter-starknet`, `adapter-sui`, `adapter-xrpl`
- `analytics`, `analytics-server`, `batch-transaction`, `blockchain-api`, `bundler`, `cdn`
- `cinacoin-i18n`, `cinacoin-ui-theme`, `cli`, `config`, `core-ui`, `cross-chain-sync`, `custom-connectors`, `deposit`
- `design-tokens`, `embedded-wallet`, `ens-resolver`, `erc6492`, `gas-estimator`, `gas-sponsorship`, `i18n`, `kyc`
- And ~30+ more packages

### ❌ Missing `sideEffects` (No type:module)

- `android-kotlin`, `dotnet`, `flutter-dart`, `ios-swift` — likely non-JS packages, safe to skip
- `embedded-wallet` — also missing `"type": "module"`

### Recommended Fix

Add `"sideEffects": false` to all JS/TS packages that don't have it. This is a one-line change per package.json and enables bundler tree-shaking.

---

## Task 3: Import Anti-patterns

### ✅ No lodash/date-fns full imports found

- No `import ... from 'lodash'` detected
- No `import ... from 'date-fns'` detected
- All existing imports already use specific subpaths

### ⚠️ rxjs Import Patterns

The `angular` package uses selective imports from `rxjs` (correct pattern):
- `import { Observable, Subscription } from 'rxjs'` — ✅ These are named imports, tree-shakeable
- `import { ReplaySubject, BehaviorSubject } from 'rxjs'` — ✅ Same

### ✅ No ethers/web3 full imports in source code

Only comments found (not actual imports).

---

## Task 4: Memory Leak Detection

### 🔴 Critical: Unbounded `window.addEventListener` in onramp-sdk

**File:** `packages/onramp-sdk/src/widget.ts` (lines 136, 174)

```typescript
window.addEventListener("message", handleMessage);
```

Two `addEventListener("message", ...)` calls found in `openPopup()` and `openEmbedded()`. **No corresponding `removeEventListener` is called.** These listeners accumulate on the global `window` object every time the widget is opened, causing:
- Memory leak (handler closures captured)
- Potential duplicate event handling if widget is opened multiple times

**Fix needed:** Store the handler reference and call `window.removeEventListener("message", handleMessage)` in a `close()` method or cleanup function.

### 🟡 Warning: Map/Set allocations without cleanup

| File | Pattern | Risk |
|------|---------|------|
| `onramp-sdk/src/aggregator.ts:60` | `this.providers = new Map()` | Low — instance-scoped, GC'd with object |
| `adapter-sui/src/SuiAdapter.ts:164` | `this.chains: Map<...> = new Map()` | Low — instance-scoped |
| `push-server/src/PushServer.ts:46` | `this.registeredDevices: Map<...>` | 🟡 Medium — server-side, check if devices are evicted |
| `wallet-recovery/src/WalletRecovery.ts:369-371` | `new Map()` x3 (configs, shareStore, shareKeys) | Low — instance-scoped |
| `pay-ui/src/OnRampWidgetCore.ts:42` | `this._listeners: Set<() => void>` | ✅ Has proper `delete` via returned cleanup function |

### ✅ setInterval cleanup verified

The following packages properly clear their intervals:
- `core-sdk/src/transports/relay.ts` — `clearInterval` on stop ✅
- `walletconnect-v2/src/relay.ts` — `clearInterval` on stop ✅
- `deposit/src/hooks/useDeposit.ts` — `clearInterval` in useEffect cleanup ✅
- `core-ui/src/components/transaction-toast.ts` — `clearInterval` found ✅
- `onramp-sdk/src/widget.ts` — `clearInterval(checkInterval)` found ✅
- `performance-utils/src/memory-leak/index.ts` — has cleanup logic ✅

### 🟡 adapter-cosmos listener balance

- `leap.ts`: 2 `addEventListener` / 2 `removeEventListener` — mostly balanced, but line 348 adds without visible remove in same scope
- `keplr.ts`: 2 `addEventListener` / 2 `removeEventListener` — same pattern, line 424 adds without visible remove

These appear to be connector lifecycle methods — verify that disconnect/dispose paths cover all registered handlers.

---

## Summary & Action Items

| Priority | Issue | Package | Impact | Status |
|----------|-------|---------|--------|--------|
| 🔴 HIGH | Unbounded window listeners | onramp-sdk/widget.ts | Memory leak on repeated widget opens | ✅ **FIXED** |
| 🔴 HIGH | Missing `sideEffects: false` | 74 packages | Bundle bloat, no tree-shaking | ✅ **FIXED** |
| 🟡 MEDIUM | core-sdk dist at 1.7 MB | core-sdk | Slow initial load for all consumers | ⏳ Pending |
| 🟡 MEDIUM | PushServer device map no TTL | push-server | Server memory growth | ⏳ Pending |
| 🟡 LOW | Cosmos connector listener edge cases | adapter-cosmos | Potential leak on disconnect | ⏳ Pending |
| ✅ GOOD | lodash/date-fns imports | all | Already using specific imports | ✅ Clean |
| ✅ GOOD | setInterval cleanup | core-sdk, walletconnect, deposit, onramp, core-ui | Proper cleanup | ✅ Clean |

### Fixes Applied

1. **onramp-sdk/widget.ts** — Added `_popupMessageHandler` and `_embeddedMessageHandler` fields to track message listeners, with `removeEventListener` calls in `close()` method. Prevents memory leak on repeated widget opens.
2. **74 package.json files** — Added `"sideEffects": false` to all packages that were missing it. This enables bundler tree-shaking across the entire monorepo.

### Recommended Next Steps

1. **Profile core-sdk** — Run bundle analyzer (`@cinacoin/performance-utils/bundle-analyzer`) to identify what's contributing 1.7MB
2. **Add push-server device map TTL** — Evict registrations older than N days or implement LRU
3. **Review adapter-cosmos disconnect paths** — Verify line 348 in leap.ts and line 424 in keplr.ts have corresponding cleanup
4. **Rebuild all packages** — The `.js` compiled files will be regenerated by `tsup` on next build
