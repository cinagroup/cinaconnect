# CinaConnect Roadmap

> **Last Updated:** 2026-05-18  
> **Status Legend:**  
> - ✅ **Complete** — built (dist/ exists; 1 package published to npm: core-sdk)  
> - 🚧 **In Progress** — built + **deployed & live** (Cloudflare Workers)  
> - ⬜ **Planned** — scaffolding only (1 package: dotnet)  
> - 🔌 **SDK Layer** — type definitions/interfaces only; **requires external API key or service** to function  
>  
> ⚠️ **Important:** **64/64 packages built** with dist/ directories. Only 1 package (`@cinaconnect/core-sdk`) is published to npm. **104+ test files**. **53+ commits**. Two infrastructure services (RPC Proxy, Keys Server) are deployed on Cloudflare Workers. The demo app UI renders but **all interactions are mock** — no real wallet connections, swaps, or auth.  

---

## Phase 1: Core Infrastructure

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/core-sdk` | ✅ | **Built & published** — SignClient, Pairing API, Universal Provider |
| `@cinaconnect/walletconnect-v2` | ✅ | Built — adapters commented out in core-sdk exports |
| `@cinaconnect/chains` | ✅ | Built — Chain definition registry |
| `@cinaconnect/core-ui` | ✅ | Built — Lit-based web components (modal & widgets) |
| `@cinaconnect/rpc-proxy` | 🚧 | Built + **deployed on Cloudflare Workers** |
| `@cinaconnect/keys-server` | 🚧 | Built + **deployed on Cloudflare Workers** |

---

## Phase 2: Chain Adapters — All ✅ Built

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/adapter-ethereum` | ✅ | Built — EVM adapter (Wagmi / Ethers) |
| `@cinaconnect/adapter-solana` | ✅ | Built — Solana SVM adapter |
| `@cinaconnect/adapter-bitcoin` | ✅ | Built — Bitcoin BIP-122 adapter |
| `@cinaconnect/adapter-ton` | ✅ | Built — TON adapter |
| `@cinaconnect/adapter-tron` | ✅ | Built — TRON adapter |
| `@cinaconnect/adapter-cosmos` | ✅ | Built — Cosmos adapter |
| `@cinaconnect/adapter-sui` | ✅ | Built — Sui adapter |
| `@cinaconnect/adapter-starknet` | ✅ | Built — Starknet adapter |
| `@cinaconnect/adapter-near` | ✅ | Built — NEAR adapter |
| `@cinaconnect/adapter-hedera` | ✅ | Built — Hedera adapter |
| `@cinaconnect/adapter-xrpl` | ✅ | Built — XRPL adapter |

---

## Phase 3: Framework SDKs

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/react` | ✅ | Built — React hooks & components |
| `@cinaconnect/next` | ✅ | Built — Next.js App Router support |
| `@cinaconnect/vue` | ✅ | Built — Vue 3 plugin & composables |
| `@cinaconnect/svelte` | ✅ | Built — Svelte 4/5 store & components |
| `@cinaconnect/angular` | ✅ | Built — Angular support |
| `@cinaconnect/nuxt` | ✅ | Built — Nuxt support |
| `@cinaconnect/react-native` | ✅ 🔌 | Built — type definitions, native implementation needed |
| `@cinaconnect/flutter-dart` | ✅ 🔌 | Built — type definitions, native implementation needed |
| `@cinaconnect/android-kotlin` | ✅ | Built |
| `@cinaconnect/ios-swift` | ✅ | Built |
| `@cinaconnect/unity-csharp` | ✅ | Built |
| `@cinaconnect/dotnet` | ⬜ | .NET support — source needed |

---

## Phase 4: Authentication — All ✅ Built

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/siwe` | ✅ | Built — Sign-In With Ethereum (EIP-4361) |
| `@cinaconnect/siwx` | ✅ | Built — Sign-In With X (CAIP-122, multi-chain) |
| `@cinaconnect/social-login` | ✅ | Built — Email & social login (Magic.link) |
| `@cinaconnect/passkey-auth` | ✅ | Built — Passkey / biometric authentication (WebAuthn) |

---

## Phase 5: Smart Accounts (Account Abstraction) — All ✅ Built

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/aa-sdk` | ✅ | Built — ERC-4337 Account Abstraction SDK |
| `@cinaconnect/bundler` | ✅ | Built — ERC-4337 Bundler |
| `@cinaconnect/paymaster` | ✅ | Built — ERC-7677 Paymaster |
| `@cinaconnect/erc6492` | ✅ | Built — ERC-6492 signature verification |
| `@cinaconnect/session-keys` | ✅ | Built — Ephemeral session keys |
| `@cinaconnect/ens-resolver` | ✅ | Built — ENS / readable account names |

---

## Phase 6: Payments ⚠️ SDK Layer

> These packages provide SDK interfaces and UI wrappers. **They require external API keys/services** to function. All are **built**.

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/swap-sdk` | ✅ 🔌 | Built — **SDK interface only**; requires your own DEX aggregator API key (1inch, 0x, etc.) |
| `@cinaconnect/onramp-sdk` | ✅ 🔌 | Built — **SDK + iframe embed only**; requires Meld/Coinbase Pay API key |
| `@cinaconnect/pay-ui` | ✅ | Built — Payment UI components |
| `@cinaconnect/batch-transaction` | ✅ | Built — Batch transaction support |
| `@cinaconnect/deposit` | ✅ | Built — Deposit utilities |

---

## Phase 7: Infrastructure Services

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/relay-server` | ✅ | Built — WebSocket relay server |
| `@cinaconnect/notify-server` | ✅ | Built — Notification server |
| `@cinaconnect/push-server` | ✅ | Built — Push notification server |
| `@cinaconnect/cdn` | ✅ | Built — CDN asset delivery |

---

## Phase 8: Developer Tools & Utilities — All ✅ Built

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/cli` | ✅ | Built — CLI scaffolding tool |
| `@cinaconnect/testing` | ✅ | Built — Mock providers & test utilities |
| `@cinaconnect/codemod` | ✅ | Built — Migration tool (Reown/AppKit → CinaConnect) |
| `@cinaconnect/wallet-recommender` | ✅ | Built — Wallet recommendation engine |
| `@cinaconnect/gas-estimator` | ✅ | Built — Gas estimation utilities |
| `@cinaconnect/token-list` | ✅ | Built — Curated token registry |
| `@cinaconnect/analytics` | ✅ | Built — Connection event analytics |
| `@cinaconnect/config` | ✅ | Built — Remote configuration manager |
| `@cinaconnect/design-tokens` | ✅ | Built — CSS design tokens |
| `@cinaconnect/explorer` | ✅ | Built — Blockchain explorer components |
| `@cinaconnect/blockchain-api` | ✅ | Built — REST API layer |
| `@cinaconnect/wallet-buttons` | ✅ | Built — Standalone wallet button components |
| `@cinaconnect/custom-connectors` | ✅ | Built — Custom wallet connector framework |
| `@cinaconnect/multiwallet` | ✅ | Built — Multi-wallet management |
| `@cinaconnect/kyc` | ✅ | Built — KYC compliance screening |
| `@cinaconnect/cross-chain-sync` | ✅ | Built — Cross-chain state synchronization |
| `@cinaconnect/safe-decoder` | ✅ | Built — Safe transaction decoder |
| `@cinaconnect/travel-rule-demo` | ✅ | Built — Travel Rule compliance demo |

---

## Phase 9: Platform Integrations — All ✅ Built

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/telegram-miniapp` | ✅ | Built — Telegram Mini Apps integration |
| `@cinaconnect/farcaster-miniapp` | ✅ | Built — Farcaster Mini Apps integration |

---

## Overall Progress Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total modules in ecosystem** | 64 | 100% |
| **Built with dist/** | 64 | 100% |
| **Published to npm** | 1 (core-sdk) | ~1.5% |
| **Test files** | 104+ | — |
| **Commits** | 53+ | — |
| **Deployed & live (Cloudflare)** | 2 (RPC Proxy + Keys Server) | — |
| **Demo app functional** | UI renders | All interactions are **mock** — no real wallet connections, swaps, or auth |

**Comprehensive build status:** See [HONEST_AUDIT_V3.md](./HONEST_AUDIT_V3.md) for the full honest assessment of what's built vs. planned.

**What this roadmap means:**  
- ✅ = **Built** — dist/ directory exists (1 package published to npm: `@cinaconnect/core-sdk`)  
- 🚧 = Built + **deployed & live on Cloudflare Workers** (RPC Proxy, Keys Server)  
- ⬜ = scaffolding only, source needs to be written (1 package: `@cinaconnect/dotnet`)  
- 🔌 = SDK interface layer only — **requires external API key or service** to function  

> ⚠️ **Demo limitations:** The demo app UI renders, but all interactions are **mock** — no real wallet connections, swaps, or auth.

---

## Priority Next Steps

1. **Publish packages to npm** — all 64 built, only core-sdk published so far
2. **Enable adapter exports** — uncomment ethers5/6, wagmi, solana, viem, siwe, eip5792 in core-sdk
3. **Write dotnet source** — 1 package remaining with scaffolding only
4. **Demo real connections** — connect WalletModal to real MetaMask (currently mock)
5. **Add tests** — 104+ test files exist; expand coverage for core functionality
6. **Honest docs** — this file and README reflect 64/64 built status
