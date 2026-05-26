# GitHub Release Notes — CinaConnect v0.2.0

---

## Release v0.2.0 — Connect Everything On-Chain

CinaConnect v0.2.0 is our largest release to date — **72 packages published to npm**, covering the full spectrum of Web3 development: multi-chain adapters, framework SDKs, authentication, smart accounts, payments, infrastructure, and developer tools.

### 🎉 Highlights

- **72 packages** published to npm
- **11 chain adapters** — EVM, Solana, Bitcoin, TON, TRON, Cosmos, Sui, Starknet, NEAR, Hedera, XRPL
- **.NET SDK** — 22 C# source files with full client, services, models, and example app
- **EIP-5792** React hooks — `useAtomicBatch`, `useSendCalls`, `useWalletCapabilities`, `useCallsStatus`
- **Production-grade crypto** — real X25519 key exchange (`@noble/curves`) + ChaCha20-Poly1305 (`@noble/ciphers`)
- **Account Abstraction** — complete ERC-4337 + ERC-7677 stack
- **SIWX** — chain-agnostic multi-chain authentication (CAIP-122)
- **Codemod** — automated migration from Reown/AppKit

### 📦 Full Package List

#### Core
- `@cinaconnect/core-sdk` — Core SDK (SignClient, Pairing API, Universal Provider)
- `@cinaconnect/walletconnect-v2` — WalletConnect v2 protocol integration
- `@cinaconnect/chains` — Chain definition registry (300+ chains)

#### Chain Adapters (11)
- `@cinaconnect/adapter-ethereum` — EVM (Wagmi / Ethers)
- `@cinaconnect/adapter-solana` — Solana
- `@cinaconnect/adapter-bitcoin` — Bitcoin (BIP-122)
- `@cinaconnect/adapter-ton` — TON
- `@cinaconnect/adapter-tron` — TRON
- `@cinaconnect/adapter-cosmos` — Cosmos
- `@cinaconnect/adapter-sui` — Sui
- `@cinaconnect/adapter-starknet` — Starknet
- `@cinaconnect/adapter-near` — NEAR
- `@cinaconnect/adapter-hedera` — Hedera
- `@cinaconnect/adapter-xrpl` — XRPL

#### Framework SDKs (12)
- `@cinaconnect/react` — React + EIP-5792 hooks
- `@cinaconnect/next` — Next.js App Router
- `@cinaconnect/vue` — Vue 3
- `@cinaconnect/svelte` — Svelte 4/5
- `@cinaconnect/angular` — Angular
- `@cinaconnect/nuxt` — Nuxt
- `@cinaconnect/react-native` — React Native
- `@cinaconnect/flutter-dart` — Flutter/Dart
- `@cinaconnect/android-kotlin` — Android (Kotlin)
- `@cinaconnect/ios-swift` — iOS (Swift)
- `@cinaconnect/unity-csharp` — Unity (C#)
- `@cinaconnect/dotnet` — .NET (C#)

#### Authentication (4)
- `@cinaconnect/siwe` — Sign-In With Ethereum
- `@cinaconnect/siwx` — Sign-In With X (multi-chain)
- `@cinaconnect/social-login` — Email & social login
- `@cinaconnect/passkey-auth` — Passkey / biometric

#### Smart Accounts (6)
- `@cinaconnect/aa-sdk` — ERC-4337 Account Abstraction
- `@cinaconnect/bundler` — ERC-4337 Bundler (Rust)
- `@cinaconnect/paymaster` — ERC-7677 Paymaster
- `@cinaconnect/erc6492` — ERC-6492 signature verification (Rust)
- `@cinaconnect/session-keys` — Ephemeral session keys
- `@cinaconnect/ens-resolver` — ENS / readable names

#### Payments (5)
- `@cinaconnect/swap-sdk` — DEX aggregator interface
- `@cinaconnect/onramp-sdk` — Fiat-to-crypto on-ramp
- `@cinaconnect/pay-ui` — Payment UI components
- `@cinaconnect/batch-transaction` — Batch transactions
- `@cinaconnect/deposit` — Deposit utilities

#### Infrastructure (4)
- `@cinaconnect/relay-server` — WebSocket relay (Rust)
- `@cinaconnect/notify-server` — Notification server
- `@cinaconnect/push-server` — Push notification server (Rust)
- `@cinaconnect/cdn` — CDN asset delivery

#### Developer Tools (20)
- `@cinaconnect/cli` — CLI scaffolding
- `@cinaconnect/testing` — Mock providers
- `@cinaconnect/codemod` — Reown/AppKit migration
- `@cinaconnect/wallet-recommender` — Wallet recommendation
- `@cinaconnect/gas-estimator` — Gas estimation
- `@cinaconnect/token-list` — Token registry
- `@cinaconnect/analytics` — Connection analytics
- `@cinaconnect/config` — Remote config
- `@cinaconnect/design-tokens` — CSS tokens
- `@cinaconnect/explorer` — Explorer components
- `@cinaconnect/blockchain-api` — REST API
- `@cinaconnect/wallet-buttons` — Button components
- `@cinaconnect/custom-connectors` — Connector framework
- `@cinaconnect/multiwallet` — Multi-wallet management
- `@cinaconnect/kyc` — KYC compliance
- `@cinaconnect/cross-chain-sync` — Cross-chain sync
- `@cinaconnect/safe-decoder` — Safe TX decoder (Rust)
- `@cinaconnect/travel-rule-demo` — Travel Rule demo

#### Platform Integrations (2)
- `@cinaconnect/telegram-miniapp` — Telegram Mini Apps
- `@cinaconnect/farcaster-miniapp` — Farcaster Mini Apps

### 🔐 Security Improvements

- Replaced placeholder X25519 with real `@noble/curves` implementation
- Replaced AES-GCM fallback with real ChaCha20-Poly1305 via `@noble/ciphers`
- `encrypt()`/`decrypt()` are now synchronous (no async overhead)
- New `generateNonce()` utility for 12-byte random nonces

### ⚠️ Breaking Changes

- `encrypt()` and `decrypt()` in `@cinaconnect/core-sdk` are now **synchronous** (removed `async`)
- If you were using these with `await`, you can safely remove the `await` keyword

### 🚀 Quick Start

```bash
npm install @cinaconnect/react @cinaconnect/adapter-ethereum
```

Or clone the full monorepo:

```bash
git clone https://github.com/cinaconnect/cinaconnect.git
cd cinaconnect
pnpm install
pnpm run dev --filter=demo
# → http://localhost:3000
```

### 📖 Documentation

- [Quick Start Guide](./docs/guide/quick-start.md)
- [Installation Guide](./docs/guide/installation.md)
- [Configuration Guide](./docs/guide/configuration.md)
- [Migration from Reown](./docs/guide/migrate-from-reown.md)
- [Security Best Practices](./docs/security/best-practices.md)
- [FAQ](./docs/faq.md)
- [Full API Reference](https://docs.cinaconnect.io)

### 🔮 What's Next (v0.2.1 → v0.3.0)

- Automate npm publishing for all 64+ built packages
- Enable commented-out adapter exports in core-sdk
- Native implementations for React Native and Flutter
- Native cross-chain bridge implementation
- Expanded test coverage (80%+ target)

---

**Full Changelog:** [v0.1.0 → v0.2.0](https://github.com/cinaconnect/cinaconnect/compare/v0.1.0...v0.2.0)

**CinaGroup** — *Connect Everything On-Chain* 🔢
