# Cinacoin Framework Bindings & UI Completeness Analysis

**Date:** 2026-05-25
**Scope:** Framework SDKs + UI components — comparison vs Reown AppKit

---

## 1. Per-Framework Completeness

### React (`@cinacoin/react`) — Score: 88%

| Dimension | Status | Detail |
|-----------|--------|--------|
| Provider | ✅ | `CinacoinProvider` — full React context with config, chains, theme, metadata |
| Core Hooks | ✅ | `useCinacoin`, `useAccount`, `useChainId`, `useConnect`, `useDisconnect` |
| EIP-5792 Hooks | ✅ | `useWalletCapabilities`, `useSendCalls`, `useAtomicBatch`, `useCallsStatus` — fully typed with helpers (`has`, `getChainCaps`, `filterBy`, `startPolling`, `stopPolling`, `allSucceeded`, `failedReceipts`) |
| Components | ✅ | `ConnectButton`, `ConnectModal`, `ChainSwitcher` — wrappers over Lit Web Components |
| SSR Support | ⚠️ | Provider has no SSR-specific guards (relies on `window.__ocx_eip5792_context`); EIP-5792 hooks assume browser environment |
| Typing | ✅ | Full TypeScript — `.d.ts` for all exports, typed props and return values |
| Tests | ✅ | Vitest setup, ConnectButton test present |
| Missing vs Reown | | No `useAppKit` own implementation (re-exports from Next), no `useBalance`, no `useWalletInfo`, no `useEnsName`, no `useEnsAvatar` |

### Vue (`@cinacoin/vue`) — Score: 80%

| Dimension | Status | Detail |
|-----------|--------|--------|
| Provider | ✅ | `CinacoinProvider.vue` — Vue 3 SFC with `provide`/`ONCHAINUX_KEY` injection |
| Composables | ✅ | `useCinacoin`, `useAccount`, `useChainId`, `useConnect`, `useDisconnect` |
| EIP-5792 | ❌ | **No EIP-5792 composables** — missing entirely |
| Components | ✅ | `OcxConnectButton`, `OcxConnectModal`, `OcxChainSwitcher` — `defineComponent` wrappers forwarding to Lit Web Components |
| SSR Support | ⚠️ | No explicit SSR guards; `onMounted`/`onBeforeUnmount` lifecycle only |
| Typing | ✅ | Full TypeScript — types exported, context typed with Vue `Ref<T>` |
| Tests | ✅ | Component and composable tests present |
| Missing vs Reown | | No EIP-5792, no balance/ENS composables, no wallet-info composable, no `useAppKit` |

### Svelte (`@cinacoin/svelte`) — Score: 75%

| Dimension | Status | Detail |
|-----------|--------|--------|
| Provider | ✅ | `createCinacoin()` factory with Svelte context API (`setContext`/`getContext`) |
| Stores | ✅ | 10 stores: `isConnected`, `address`, `balance`, `chainId`, `status`, `error`, `isConnecting`, `hasError`, `chains`, plus imperative `open`, `close`, `switchChain`, `resetCinacoin` |
| EIP-5792 | ❌ | **No EIP-5792 support** — missing entirely |
| Components | ✅ | `CinacoinButton`, `CinacoinAccountButton`, `CinacoinNetworkButton` — native Svelte components (not just wrappers) |
| Actions | ✅ | `cinaConnectConnect`, `cinaConnectNetwork` Svelte actions |
| SSR Support | ⚠️ | `setContext`/`getContext` require component initialization; no SSR guards |
| SvelteKit | ✅ | `kit/index.ts` re-export — SvelteKit compatible |
| Typing | ✅ | Full TypeScript exports |
| Tests | ✅ | Vitest test present |
| Svelte 5 | ⚠️ | Supports runes pattern (`$effect.teardown` via `onDestroy`) but store syntax is Svelte 4; migration needed |
| Missing vs Reown | | No EIP-5792, no dedicated SvelteKit plugin (manual integration), no `<ConnectModal>` component (only via store methods) |

### Angular (`@cinacoin/angular`) — Score: 72%

| Dimension | Status | Detail |
|-----------|--------|--------|
| Module | ✅ | `CinacoinModule.forRoot()` — proper Angular module with DI tokens |
| Service | ✅ | `CinacoinService` — reactive `Observable<Account>`, `Observable<Network>`, `Observable<boolean>` via RxJS `ReplaySubject`/`BehaviorSubject` |
| EIP-5792 | ❌ | **No EIP-5792 support** — missing entirely |
| Components | ✅ | `ConnectButtonComponent`, `AccountButtonComponent`, `NetworkButtonComponent` |
| Pipes | ✅ | `AddressPipe` (truncate), `BalancePipe` (format) |
| Directives | ✅ | `ConnectDirective` (`[cinaConnect]`) — click-to-connect with `[cinaConnectDisabled]` |
| SSR Support | ⚠️ | No Angular Universal/SSR guards |
| Typing | ✅ | Full TypeScript with Angular DI generics |
| Tests | ✅ | Vitest test present |
| Missing vs Reown | | No EIP-5792, no modal component (manual `open()`/`close()`), no standalone component support (NgModule only), no `useAppKit` equivalent |

### Next.js (`@cinacoin/next`) — Score: 82%

| Dimension | Status | Detail |
|-----------|--------|--------|
| App Router | ✅ | `AppKitProvider` — `'use client'` wrapper with hydration-safe mounting (`useState` + `useEffect` guard) |
| Pages Router | ✅ | `AppKitPagesRouter` — separate provider for legacy Pages Router |
| Server API | ✅ | `createServerClient`, `getCinacoinServer` — singleton server-side client with `getSession`, `verifySiweMessage`, `withAuth` |
| Middleware | ✅ | `withCinacoinAuth`, `requireAuth` — cookie-based session middleware |
| Hooks | ✅ | Re-exports from React: `useCinacoin`, `useCinacoinAccount`, `useCinacoinNetwork`, `useDisconnect`, `useWalletInfo`, `useBalance`, `useAppKit` |
| Components | ✅ | `OnuxProvider`, `ConnectButton`, `AccountButton`, `NetworkButton` (re-exported from React) |
| EIP-5792 | ⚠️ | Indirectly available via React re-exports, but no Next.js-specific EIP-5792 server utilities |
| Typing | ✅ | Full TypeScript |
| Tests | ✅ | Vitest test present |
| Missing vs Reown | | No Next.js-specific EIP-5792, no `useAppKitState` with SSR-safe initial values, no Edge Runtime support, no ISR-specific hooks |

### Nuxt (`@cinacoin/nuxt`) — Score: 70%

| Dimension | Status | Detail |
|-----------|--------|--------|
| Module | ✅ | `defineNuxtModule` with `addPlugin`, `addImportsDir`, `addComponent` |
| Composables | ✅ | `useCinacoin`, `useCinacoinAccount`, `useCinacoinNetwork` — auto-imported |
| Components | ✅ | `NuxtConnectButton`, `NuxtAccountButton` — auto-imported Vue SFCs |
| Plugin | ✅ | Runtime plugin creates `Cinacoin` instance, provides via `nuxtApp.$cinaConnect` |
| Theme CSS | ✅ | Auto-generates `cinacoin-theme.css` with dark mode media query |
| EIP-5792 | ❌ | **No EIP-5792 composables** |
| SSR Support | ⚠️ | Plugin uses `defineNuxtPlugin` but composables use `get`-ters (non-reactive in SSR context) |
| Typing | ✅ | TypeScript augmentation via `prepare:types` hook |
| Tests | ✅ | Vitest test present, playground app included |
| Missing vs Reown | | No EIP-5792, no server-side session verification, no Nitro route handlers, no auto-detection of `prefers-color-scheme` in composables (only in CSS) |

### React Native (`@cinacoin/react-native`) — Score: 85%

| Dimension | Status | Detail |
|-----------|--------|--------|
| Provider | ✅ | Full WC v2 integration via `@cinacoin/walletconnect-v2` — `WcSessionManager` + event-driven state |
| Components | ✅ | `ConnectButton`, `ConnectModal` (with `WalletInfo`), `QRScanner` — native RN components |
| Deep Linking | ✅ | `DeepLinkManager` with scheme configs, parsed deep links |
| Link Mode | ✅ | `LinkModeManager` with `WalletReturnCallback` |
| Wallet Registry | ✅ | Built-in `WALLET_REGISTRY` from WC v2, sorted by recommendation |
| EIP-5792 | ❌ | **No EIP-5792 hooks** — but full `request<T>()` method for arbitrary JSON-RPC |
| Theme | ✅ | `ThemeMode` (dark/light/minimal) with full `ThemeColors` token map |
| Typing | ✅ | Full TypeScript |
| Tests | ✅ | ConnectModal, WalletConnectProvider, and deepLink tests |
| Missing vs Reown | | No EIP-5792, no native ENS support, no biometric auth integration, no `useSendCalls`/`useAtomicBatch` equivalents |

---

## 2. UI Component Inventory — Lit Web Components (`@cinacoin/core-ui`)

### Registered Custom Elements

| Component | Lit Element | Purpose | Reown AppKit Equivalent |
|-----------|-------------|---------|------------------------|
| `<ocx-connect-button>` | `ConnectButton` | Connect/disconnect with balance/avatar/network display | `<w3m-button>` ✅ |
| `<ocx-connect-modal>` | `ConnectModal` | Full modal with wallet list, QR, social, email | `<w3m-modal>` ✅ |
| `<ocx-wallet-list>` | `WalletList` | Scrollable wallet grid/list | Scaffold-UI wallet view ✅ |
| `<ocx-wallet-card>` | `WalletCard` | Individual wallet card with icon, name, badge | Scaffold-UI card ✅ |
| `<ocx-chain-switcher>` | `ChainSwitcher` | Network switching UI | `<w3m-network-switch>` ✅ |
| `<ocx-account-modal>` | `AccountModal` | Account info, connected apps, explorer links | Scaffold-UI account view ✅ |
| `<ocx-transaction-toast>` | `TransactionToast` | Inline tx status notifications | `<w3m-router>` toast ✅ |
| `<ocx-network-badge>` | `NetworkBadge` | Small network indicator | `<w3m-network-button>` badge ✅ |

### Foundation Layer

- **`BaseLitElement`** — base class with theme integration, shadow DOM styling
- **`SlotManager`** — named slot utilities (`getAssignedNodes`, `hasSlotContent`)
- **`AnimationEngine`** — `animate`, `animateOutAndRemove`, `transition` with presets
- **`I18nMixin`** — Lit mixin for translation access (`this.t(key)`) + auto RTL direction
- **`defaultStyles`** — shared CSS-in-JS styles, `truncateAddress`, `formatNumber`, `addressAvatarGradient`

### vs Reown scaffold-ui

| Aspect | Cinacoin | Reown AppKit |
|--------|-------------|--------------|
| Component count | 8 Lit elements | ~20+ Lit elements |
| Router/Navigation | Manual view management | `<w3m-router>` with view stack |
| Profile view | Via `AccountModal` | Dedicated `<w3m-account-button>` + profile |
| Swap UI | In `@cinacoin/pay-ui` (separate) | Built into scaffold-ui |
| On-ramp | In `@cinacoin/pay-ui` (separate) | Via partner integrations |
| Activity history | `AccountModal` basic | Full activity list component |
| Settings view | Not yet a standalone component | `<w3m-settings>` component |
| Search | Wallet list search | Global search across wallets + tokens |
| Toast system | `TransactionToast` | Toast + snackbar system |

**Verdict:** Cinacoin covers the core connect/disconnect/chain-switch flow well, but lacks the extended scaffold components (settings, activity, profile, search, router navigation) that Reown provides out of the box.

---

## 3. Theme System — White-Label Capability

### `@cinacoin/design-tokens`

| Token Layer | Coverage |
|-------------|----------|
| Global tokens | ✅ Colors, radii, shadows, typography, spacing, animations, z-index |
| Semantic tokens | ✅ Maps global tokens to semantic names (e.g. `accent500` → `--ocx-color-accent-500`) |
| Component tokens | ✅ Per-component overrides |
| Themes | `dark`, `light`, `minimal` (3 built-in) |
| CSS output | ✅ `cssVariables`, `cssVariablesLight`, `cssVariablesMinimal` |
| JS output | ✅ `tokens` catalog with flat maps |

### `@cinacoin/ui-theme`

| Feature | Status |
|---------|--------|
| `ThemeProvider` | ✅ React context provider |
| Built-in themes | 6: `default`, `midnight`, `minimal`, `nouns`, `retro`, `rounded` |
| Motion/animation | ✅ Uses `motion` (framer-motion DOM subset) |
| Components | `Modal`, `PageTransition`, `PasswordStrengthIndicator` |
| White-label | ✅ `themeVariables` override in config; CSS custom properties |

### `@cinacoin/cinacoin-ui-theme`

| Feature | Status |
|---------|--------|
| Theme provider | ✅ `ThemeProvider` (re-export) |
| Theme definitions | `default`, `midnight`, `minimal`, `nouns`, `retro`, `rounded` |
| Animations | ✅ `motion.tsx` |
| UI components | `Modal`, `PageTransition`, `PasswordStrengthIndicator` |

### White-Label Comparison

| Capability | Cinacoin | Reown AppKit |
|------------|-------------|--------------|
| CSS variable overrides | ✅ via `theme.variables` | ✅ via `themeVariables` |
| Preset themes | 6 built-in | ~4 built-in |
| Custom theme creation | ✅ Full token system | ✅ Theme builder |
| Brand color injection | ✅ `--cinacoin-color-accent` | ✅ `--w3m-accent` |
| Dark/light auto-detect | ✅ `prefers-color-scheme` | ✅ Same |
| Font family override | ✅ Via typography tokens | ✅ |
| Border radius scale | ✅ Via radii tokens | ✅ |
| Animation control | ✅ Animation presets | ✅ Motion config |

**Verdict:** Cinacoin's theme system is **comparable or superior** to Reown in terms of customization depth. The 3-layer token architecture (global → semantic → component) is well-structured. The branded theme (`cinacoin-ui-theme`) can be fully white-labeled via CSS variable overrides.

---

## 4. i18n Coverage

### Core UI i18n (`@cinacoin/core-ui` — Lit Web Components)

| Locale | Keys | Coverage | Notes |
|--------|------|----------|-------|
| en | 154 | 100% (base) | Full coverage |
| zh-CN | 154 | 100% | Simplified Chinese |
| zh | 154 | 100% | Alias → zh-CN |
| ja | 154 | 100% | Japanese |
| ko | 154 | 100% | Korean |
| es | 154 | 100% | Spanish |
| fr | 154 | 100% | French |
| de | 154 | 100% | German |
| ru | 154 | 100% | Russian |
| ar | 154 | 100% | Arabic (RTL) |
| pt | 154 | 100% | Portuguese |

- **RTL support:** ✅ `I18nMixin` auto-sets `dir="rtl"` for Arabic
- **Browser detection:** ✅ `detectBrowserLocale()` with fallback chain
- **Lazy loading:** ✅ `lazyLocaleFactory()` for code splitting
- **Fallback:** ✅ `en` as default fallback

### Cinacoin i18n (`@cinacoin/cinacoin-i18n` — React layer)

| Locale | Lines | Namespaces | Notes |
|--------|-------|------------|-------|
| en-US | 113 | 5 (common, wallet, auth, payment, errors) | Structured with nesting |
| zh-CN | 113 | 5 | Actual Chinese translations verified |
| es | 113 | 5 | Spanish translations |
| ja | 113 | 5 | Japanese translations |
| ko | 113 | 5 | Korean translations |

**Total namespace depth:** ~55 keys per locale × 5 namespaces = ~55 keys (structured)

### vs Reown AppKit

| Aspect | Cinacoin | Reown AppKit |
|--------|-------------|--------------|
| Core UI locales | 10 | ~12 |
| Framework-level locales | 5 | ~5 |
| RTL support | ✅ | ✅ |
| Lazy loading | ✅ | ✅ |
| Namespace depth | 154 keys (flat) + 55 (nested) | ~200 keys |
| Missing locales | `hi`, `tr`, `vi`, `th` | Similar |

**Verdict:** Strong coverage for core UI (154 keys × 10 locales). React i18n package covers fewer locales (5) but with richer namespace structure (auth, payment, errors). Missing `hi`, `tr`, `vi`, `th` vs Reown.

---

## 5. EIP-5792 React Hooks — Deep Analysis

### `useWalletCapabilities`

| Feature | Status |
|---------|--------|
| Auto-fetch on connect | ✅ `useEffect` triggers when `isConnected` |
| Manual refetch | ✅ `refetch()` callback |
| Per-chain capability check | ✅ `has(chainId, capability)` |
| Chain-level API | ✅ `getChainCaps(chainId)` |
| List supported chains | ✅ `supportedChains` array |
| Filter by capability | ✅ `filterBy(capability)` |
| Error handling | ✅ `-32601` (method not found) → empty caps |
| Loading state | ✅ `isLoading` boolean |
| Error state | ✅ `error: Error \| null` |

### `useSendCalls`

| Feature | Status |
|---------|--------|
| Batch call sending | ✅ `sendCalls(calls[], options?)` |
| Options override | ✅ `chainId`, `capabilities`, `version` |
| Send state | ✅ `isSending` boolean |
| Last batch ID | ✅ `lastCallId` |
| Error handling | ✅ `error: Error \| null` |

### `useAtomicBatch`

| Feature | Status |
|---------|--------|
| Atomic execution | ✅ `executeBatch(calls[], options?)` |
| Preview/build | ✅ `buildBatch(calls[], options?)` — no send |
| Simulate flag | ✅ `simulate?: boolean` in options |
| Capability check | ✅ `isAtomicSupported` (chain-level) |
| Execution state | ✅ `isExecuting` boolean |

### `useCallsStatus`

| Feature | Status |
|---------|--------|
| Auto-polling | ✅ `startPolling(batchId)` with configurable interval |
| Interval config | ✅ `intervalMs` (default: 2000ms) |
| Auto-start | ✅ `callId` option starts on mount |
| Stop polling | ✅ `stopPolling()` + auto on unmount |
| Status tracking | ✅ `status`, `result` |
| Success check | ✅ `allSucceeded` helper |
| Failure tracking | ✅ `failedReceipts` helper |
| Polling state | ✅ `isPolling` boolean |

**Verdict:** All 4 hooks are **fully implemented and production-ready**. This is the strongest framework-specific feature of Cinacoin vs Reown. The hooks include extensive helper methods (`has`, `filterBy`, `allSucceeded`, `failedReceipts`) that Reown's equivalent hooks lack.

**Gap:** EIP-5792 is **React-only**. Vue, Svelte, Angular, Nuxt, and React Native have no equivalent support.

---

## 6. Gap Analysis vs Reown AppKit

### Framework-Specific Gaps

| Framework | Missing Features | Priority |
|-----------|-----------------|----------|
| **Vue** | No EIP-5792 composables, no `useBalance`/`useEnsName`, no wallet-info composable | High |
| **Svelte** | No EIP-5792, no SvelteKit auto-import plugin (manual integration), Svelte 5 store migration needed, no `<ConnectModal>` SFC | High |
| **Angular** | No EIP-5792, no standalone component support (NgModule only), no modal component, no SSR/Universal guards | Medium |
| **Next.js** | No Next.js-specific EIP-5792 server utilities, no Edge Runtime support, no ISR hooks, hooks are pure React re-exports | Medium |
| **Nuxt** | No EIP-5792 composables, no server-side session/SIWE verification, no Nitro route handlers, composables use non-reactive getters | High |
| **React Native** | No EIP-5792 hooks, no native ENS, no biometric auth | Medium |

### Component Gaps

| Component | Status | Reown Has |
|-----------|--------|-----------|
| `<w3m-router>` view stack | ❌ Missing | ✅ |
| `<w3m-settings>` settings panel | ❌ Missing | ✅ |
| Activity history list | ⚠️ Basic in AccountModal | ✅ Full component |
| Token search | ❌ Missing | ✅ |
| Profile view | ⚠️ Basic | ✅ Dedicated |
| Swap modal | ⚠️ In pay-ui (separate) | ✅ Integrated |
| On-ramp modal | ⚠️ In pay-ui (separate) | ✅ Via partners |
| Social login view | ⚠️ Basic (email/Google/Apple/X strings only) | ✅ Full flow |
| Network selection | ✅ ChainSwitcher | ✅ |

### Feature Gaps

| Feature | Cinacoin | Reown AppKit |
|---------|-------------|--------------|
| EIP-5792 (React) | ✅ Full implementation | ⚠️ Partial |
| EIP-5792 (other frameworks) | ❌ None | ❌ None |
| SIWE authentication | ✅ Next.js server verification | ✅ |
| SIWX | ✅ Separate `@cinacoin/siwx` package | ✅ |
| Email wallet | ⚠️ String support only, no implementation | ✅ Full flow |
| Social login | ⚠️ String support only | ✅ Full flow |
| Multi-chain adapters | ✅ 6 (Bitcoin, Cosmos, Hedera, NEAR, Starknet, Sui) + XRPL | ✅ Multiple |
| Account abstraction | ✅ `@cinacoin/aa-sdk` | ✅ Via partners |
| Pay/swap | ✅ `@cinacoin/pay-ui` (separate) | ✅ Integrated |

---

## 7. Summary Score Table

| Package | Score | Notes |
|---------|-------|-------|
| `@cinacoin/react` | **88%** | Strong hooks incl. EIP-5792, missing SSR guards for EIP-5792 |
| `@cinacoin/react-native` | **85%** | Full WC v2, deep linking, link mode; no EIP-5792 |
| `@cinacoin/next` | **82%** | App+Pages router, server auth, hooks re-exported from React |
| `@cinacoin/vue` | **80%** | Solid composables/components, missing EIP-5792 entirely |
| `@cinacoin/svelte` | **75%** | Good store system, native components, missing SvelteKit plugin |
| `@cinacoin/angular` | **72%** | Full DI + RxJS, missing EIP-5792 + standalone components |
| `@cinacoin/nuxt` | **70%** | Module integration works, missing server-side auth + EIP-5792 |

---

## 8. Specific Recommendations

### High Priority

1. **Port EIP-5792 to Vue composables** — `useWalletCapabilities`, `useSendCalls` as Vue `use*` composables using the same core-sdk functions
2. **Port EIP-5792 to Svelte stores** — Reactive `$capabilities`, `$sendCalls()` store actions
3. **SvelteKit auto-import plugin** — Follow Nuxt module pattern to create `@cinacoin/sveltekit`
4. **Add EIP-5792 to Nuxt composables** — Auto-import `useSendCalls`, `useCallsStatus`

### Medium Priority

5. **Angular standalone components** — Add `standalone: true` to all components for Angular 15+
6. **Next.js Edge Runtime** — Add `withCinacoinAuth` Edge-compatible variant
7. **React Native EIP-5792** — Add `useSendCalls` hook using existing `request<T>()` infrastructure
8. **Add `<ocx-settings>` component** — Settings view with theme, language, currency options

### Low Priority

9. **Additional i18n locales** — Add `hi`, `tr`, `vi`, `th` for broader coverage
10. **View router component** — Implement `<w3m-router>` equivalent for multi-view navigation
11. **Token search component** — Token picker with search/filter
12. **Activity history component** — Full transaction list with pagination
