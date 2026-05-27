# GitHub Release Notes — Cinacoin v0.2.0

---

## Release v0.2.0 — Connect Everything On-Chain

Cinacoin v0.2.0 is our largest release to date — **72 packages published to npm**, covering the full spectrum of Web3 development: multi-chain adapters, framework SDKs, authentication, smart accounts, payments, infrastructure, and developer tools.

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
- `@cinacoin/core-sdk` — Core SDK (SignClient, Pairing API, Universal Provider)
- `@cinacoin/walletconnect-v2` — WalletConnect v2 protocol integration
- `@cinacoin/chains` — Chain definition registry (300+ chains)

#### Chain Adapters (11)
- `@cinacoin/adapter-ethereum` — EVM (Wagmi / Ethers)
- `@cinacoin/adapter-solana` — Solana
- `@cinacoin/adapter-bitcoin` — Bitcoin (BIP-122)
- `@cinacoin/adapter-ton` — TON
- `@cinacoin/adapter-tron` — TRON
- `@cinacoin/adapter-cosmos` — Cosmos
- `@cinacoin/adapter-sui` — Sui
- `@cinacoin/adapter-starknet` — Starknet
- `@cinacoin/adapter-near` — NEAR
- `@cinacoin/adapter-hedera` — Hedera
- `@cinacoin/adapter-xrpl` — XRPL

#### Framework SDKs (12)
- `@cinacoin/react` — React + EIP-5792 hooks
- `@cinacoin/next` — Next.js App Router
- `@cinacoin/vue` — Vue 3
- `@cinacoin/svelte` — Svelte 4/5
- `@cinacoin/angular` — Angular
- `@cinacoin/nuxt` — Nuxt
- `@cinacoin/react-native` — React Native
- `@cinacoin/flutter-dart` — Flutter/Dart
- `@cinacoin/android-kotlin` — Android (Kotlin)
- `@cinacoin/ios-swift` — iOS (Swift)
- `@cinacoin/unity-csharp` — Unity (C#)
- `@cinacoin/dotnet` — .NET (C#)

#### Authentication (4)
- `@cinacoin/siwe` — Sign-In With Ethereum
- `@cinacoin/siwx` — Sign-In With X (multi-chain)
- `@cinacoin/social-login` — Email & social login
- `@cinacoin/passkey-auth` — Passkey / biometric

#### Smart Accounts (6)
- `@cinacoin/aa-sdk` — ERC-4337 Account Abstraction
- `@cinacoin/bundler` — ERC-4337 Bundler (Rust)
- `@cinacoin/paymaster` — ERC-7677 Paymaster
- `@cinacoin/erc6492` — ERC-6492 signature verification (Rust)
- `@cinacoin/session-keys` — Ephemeral session keys
- `@cinacoin/ens-resolver` — ENS / readable names

#### Payments (5)
- `@cinacoin/swap-sdk` — DEX aggregator interface
- `@cinacoin/onramp-sdk` — Fiat-to-crypto on-ramp
- `@cinacoin/pay-ui` — Payment UI components
- `@cinacoin/batch-transaction` — Batch transactions
- `@cinacoin/deposit` — Deposit utilities

#### Infrastructure (4)
- `@cinacoin/relay-server` — WebSocket relay (Rust)
- `@cinacoin/notify-server` — Notification server
- `@cinacoin/push-server` — Push notification server (Rust)
- `@cinacoin/cdn` — CDN asset delivery

#### Developer Tools (20)
- `@cinacoin/cli` — CLI scaffolding
- `@cinacoin/testing` — Mock providers
- `@cinacoin/codemod` — Reown/AppKit migration
- `@cinacoin/wallet-recommender` — Wallet recommendation
- `@cinacoin/gas-estimator` — Gas estimation
- `@cinacoin/token-list` — Token registry
- `@cinacoin/analytics` — Connection analytics
- `@cinacoin/config` — Remote config
- `@cinacoin/design-tokens` — CSS tokens
- `@cinacoin/explorer` — Explorer components
- `@cinacoin/blockchain-api` — REST API
- `@cinacoin/wallet-buttons` — Button components
- `@cinacoin/custom-connectors` — Connector framework
- `@cinacoin/multiwallet` — Multi-wallet management
- `@cinacoin/kyc` — KYC compliance
- `@cinacoin/cross-chain-sync` — Cross-chain sync
- `@cinacoin/safe-decoder` — Safe TX decoder (Rust)
- `@cinacoin/travel-rule-demo` — Travel Rule demo

#### Platform Integrations (2)
- `@cinacoin/telegram-miniapp` — Telegram Mini Apps
- `@cinacoin/farcaster-miniapp` — Farcaster Mini Apps

### 🔐 Security Improvements

- Replaced placeholder X25519 with real `@noble/curves` implementation
- Replaced AES-GCM fallback with real ChaCha20-Poly1305 via `@noble/ciphers`
- `encrypt()`/`decrypt()` are now synchronous (no async overhead)
- New `generateNonce()` utility for 12-byte random nonces

### ⚠️ Breaking Changes

- `encrypt()` and `decrypt()` in `@cinacoin/core-sdk` are now **synchronous** (removed `async`)
- If you were using these with `await`, you can safely remove the `await` keyword

### 🚀 Quick Start

```bash
npm install @cinacoin/react @cinacoin/adapter-ethereum
```

Or clone the full monorepo:

```bash
git clone https://github.com/cinagroup/Cinacoin.git
cd cinacoin
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
- [Full API Reference](https://docs.cinacoin.io)

### 🔮 What's Next (v0.2.1 → v0.3.0)

- Automate npm publishing for all 64+ built packages
- Enable commented-out adapter exports in core-sdk
- Native implementations for React Native and Flutter
- Native cross-chain bridge implementation
- Expanded test coverage (80%+ target)

---

**Full Changelog:** [v0.1.0 → v0.2.0](https://github.com/cinagroup/Cinacoin/compare/v0.1.0...v0.2.0)

**CinaGroup** — *Connect Everything On-Chain* 🔢
