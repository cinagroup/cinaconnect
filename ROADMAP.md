# CinaConnect Roadmap

> **Last Updated:** 2026-05-18  
> **Status Legend:**  
> - ✅ **Complete** — built, tested, published to npm  
> - 🚧 **In Progress** — source written + **deployed & live** (Cloudflare Workers)  
> - 📝 **Source Written** — code exists but **not yet built or published** to npm  
> - ⬜ **Planned** — scaffolding only (package.json), no source yet  
> - 🔌 **SDK Layer** — type definitions/interfaces only; **requires external API key or service** to function  
>  
> ⚠️ **Important:** Only **1 of 64 packages** (`@cinaconnect/core-sdk`) is actually installable via npm. All 📝 items have source code that has not been built. The demo app UI renders but **all interactions are mock** — no real wallet connections, swaps, or auth.  

---

## Phase 1: Core Infrastructure

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/core-sdk` | ✅ | **Only fully built & published package** — SignClient, Pairing API, Universal Provider |
| `@cinaconnect/walletconnect-v2` | 📝 | Source written, adapters commented out in core-sdk exports |
| `@cinaconnect/chains` | 📝 | Chain definition registry |
| `@cinaconnect/core-ui` | 📝 | Lit-based web components (modal & widgets) |
| `@cinaconnect/rpc-proxy` | 🚧 | Source written, **deployed on Cloudflare Workers** |
| `@cinaconnect/keys-server` | 🚧 | Source written, **deployed on Cloudflare Workers** |

---

## Phase 2: Chain Adapters

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/adapter-ethereum` | 📝 | EVM adapter (Wagmi / Ethers) — source written, not built |
| `@cinaconnect/adapter-solana` | 📝 | Solana SVM adapter — source written, not built |
| `@cinaconnect/adapter-bitcoin` | 📝 | Bitcoin BIP-122 adapter — source written, not built |
| `@cinaconnect/adapter-ton` | 📝 | TON adapter — source written, not built |
| `@cinaconnect/adapter-tron` | 📝 | TRON adapter — source written, not built |
| `@cinaconnect/adapter-cosmos` | 📝 | Cosmos adapter — source written, not built |
| `@cinaconnect/adapter-sui` | 📝 | Sui adapter — source written, not built |
| `@cinaconnect/adapter-starknet` | 📝 | Starknet adapter — source written, not built |
| `@cinaconnect/adapter-near` | 📝 | NEAR adapter — source written, not built |
| `@cinaconnect/adapter-hedera` | 📝 | Hedera adapter — source written, not built |
| `@cinaconnect/adapter-xrpl` | 📝 | XRPL adapter — source written, not built |

---

## Phase 3: Framework SDKs

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/react` | 📝 | React hooks & components |
| `@cinaconnect/next` | 📝 | Next.js App Router support |
| `@cinaconnect/vue` | 📝 | Vue 3 plugin & composables |
| `@cinaconnect/svelte` | 📝 | Svelte 4/5 store & components |
| `@cinaconnect/angular` | 📝 | Angular support |
| `@cinaconnect/nuxt` | 📝 | Nuxt support |
| `@cinaconnect/react-native` | 🔌 | Type definitions only — **native implementation needed** |
| `@cinaconnect/flutter-dart` | 🔌 | Type definitions only — **native implementation needed** |
| `@cinaconnect/android-kotlin` | ⬜ | Package.json scaffolding only — source needed |
| `@cinaconnect/ios-swift` | ⬜ | Package.json scaffolding only — source needed |
| `@cinaconnect/unity-csharp` | ⬜ | Package.json scaffolding only — source needed |
| `@cinaconnect/dotnet` | 📝 | .NET support |

---

## Phase 4: Authentication

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/siwe` | 📝 | Sign-In With Ethereum (EIP-4361) |
| `@cinaconnect/siwx` | 📝 | Sign-In With X (CAIP-122, multi-chain) |
| `@cinaconnect/social-login` | 📝 | Email & social login (Magic.link) |
| `@cinaconnect/passkey-auth` | 📝 | Passkey / biometric authentication (WebAuthn) |

---

## Phase 5: Smart Accounts (Account Abstraction)

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/aa-sdk` | 📝 | ERC-4337 Account Abstraction SDK — source written, not built |
| `@cinaconnect/bundler` | ⬜ | ERC-4337 Bundler (Rust) — source needed |
| `@cinaconnect/paymaster` | ⬜ | ERC-7677 Paymaster — source needed |
| `@cinaconnect/erc6492` | ⬜ | ERC-6492 signature verification (Rust) — source needed |
| `@cinaconnect/session-keys` | 📝 | Ephemeral session keys |
| `@cinaconnect/ens-resolver` | 📝 | ENS / readable account names |

---

## Phase 6: Payments ⚠️ SDK Layer

> These packages provide SDK interfaces and UI wrappers. **They require external API keys/services** to function.

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/swap-sdk` | 🔌 | Token swap — **SDK interface only**; requires your own DEX aggregator API key (1inch, 0x, etc.) |
| `@cinaconnect/onramp-sdk` | 🔌 | Fiat-to-crypto — **SDK + iframe embed only**; requires Meld/Coinbase Pay API key |
| `@cinaconnect/pay-ui` | 📝 | Payment UI components |
| `@cinaconnect/batch-transaction` | 📝 | Batch transaction support |
| `@cinaconnect/deposit` | 📝 | Deposit utilities |

---

## Phase 7: Infrastructure Services

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/relay-server` | ⬜ | WebSocket relay server (Rust) — source needed |
| `@cinaconnect/notify-server` | 📝 | Notification server — source written |
| `@cinaconnect/push-server` | ⬜ | Push notification server (Rust) — source needed |
| `@cinaconnect/cdn` | 📝 | CDN asset delivery |

---

## Phase 8: Developer Tools & Utilities

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/cli` | 📝 | CLI scaffolding tool |
| `@cinaconnect/testing` | 📝 | Mock providers & test utilities |
| `@cinaconnect/codemod` | 📝 | Migration tool (Reown/AppKit → CinaConnect) |
| `@cinaconnect/wallet-recommender` | 📝 | Wallet recommendation engine |
| `@cinaconnect/gas-estimator` | 📝 | Gas estimation utilities |
| `@cinaconnect/token-list` | 📝 | Curated token registry |
| `@cinaconnect/analytics` | 📝 | Connection event analytics |
| `@cinaconnect/config` | 📝 | Remote configuration manager |
| `@cinaconnect/design-tokens` | 📝 | CSS design tokens |
| `@cinaconnect/explorer` | 📝 | Blockchain explorer components |
| `@cinaconnect/blockchain-api` | 📝 | REST API layer |
| `@cinaconnect/wallet-buttons` | 📝 | Standalone wallet button components |
| `@cinaconnect/custom-connectors` | 📝 | Custom wallet connector framework |
| `@cinaconnect/multiwallet` | 📝 | Multi-wallet management |
| `@cinaconnect/kyc` | 📝 | KYC compliance screening |
| `@cinaconnect/cross-chain-sync` | 📝 | Cross-chain state synchronization |
| `@cinaconnect/safe-decoder` | 📝 | Safe transaction decoder (Rust) |
| `@cinaconnect/travel-rule-demo` | 📝 | Travel Rule compliance demo |

---

## Phase 9: Platform Integrations

| Package | Status | Notes |
|---------|--------|-------|
| `@cinaconnect/telegram-miniapp` | 📝 | Telegram Mini Apps integration |
| `@cinaconnect/farcaster-miniapp` | 📝 | Farcaster Mini Apps integration |

---

## Overall Progress Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total modules in ecosystem** | 64 | 100% |
| **Built & published to npm** | 1 (core-sdk only) | ~1.5% |
| **Source code written** | ~50 | ~78% |
| **Scaffolding only (no source)** | ~11 | ~17% |
| **Deployed & live (Cloudflare)** | 2 (RPC Proxy + Keys Server) | — |
| **Demo app functional** | UI renders | All interactions are **mock** — no real wallet connections, swaps, or auth |

**Comprehensive build status:** See [HONEST_AUDIT.md](./HONEST_AUDIT.md) for the full honest assessment of what's built vs. planned.

**What this roadmap means:**  
- ✅ = installable via npm today (only `@cinaconnect/core-sdk`)  
- 🚧 = source written + **deployed & live on Cloudflare Workers** (RPC Proxy, Keys Server)  
- 📝 = source code exists but **has not been built or published** to npm  
- ⬜ = scaffolding only, source needs to be written  
- 🔌 = SDK interface layer only — **requires external API key or service** to function

---

## Priority Next Steps

1. **Fix build pipeline** — make all 50+ packages with source code build successfully
2. **Enable adapter exports** — uncomment ethers5/6, wagmi, solana, viem, siwe, eip5792 in core-sdk
3. **Fill empty packages** — write source for 11 packages that only have package.json
4. **Demo real connections** — connect WalletModal to real MetaMask (currently mock)
5. **Add tests** — core functionality should reach 50%+ test coverage
6. **Honest docs** — this file and README updated to distinguish architecture from shipped product
