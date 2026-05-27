# Changelog

All notable changes to Cinacoin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_Nothing unreleased yet — current versions are documented below._

---

## [2.0.0] — 2026-05-18

### @cinacoin/i18n

**Changed**

- **BREAKING**: Major internationalization overhaul — complete rewrite of the localization package
  - Multi-language support now built into core localization pipeline
  - Updated translation architecture for scalable locale management

**Migration**: Review locale file format changes; existing translation keys may need updating.

---

## [1.0.0] — 2026-05-18

These packages reached stable v1.0.0, signifying production-ready APIs.

### @cinacoin/adapter-bitcoin

**Added**

- Native Bitcoin wallet connectors — Unisat, Leather, OKX, SatsConnect, Xverse, Wallet Standard
- Full Ordinals and BRC-20 support via connector adapters
- Cross-namespace wallet discovery for Bitcoin ecosystem

### @cinacoin/adapter-cosmos

**Added**

- Cosmos ecosystem chain adapter — Keplr, Leap, Cosmos SDK chains support
- IBC (Inter-Blockchain Communication) transaction signing
- Multi-chain Cosmos wallet connection

### @cinacoin/adapter-hedera

**Added**

- Hedera Hashgraph chain adapter — Blade Wallet, HashPack, Kantara Wallet
- HBAR transaction signing and token operations
- HIP-compliant wallet connectors

### @cinacoin/adapter-near

**Added**

- NEAR chain adapter — NEAR Wallet, Here Wallet, Meteor Wallet support
- NEP-413 message signing
- FT/NFT interaction via NEAR wallet connectors

### @cinacoin/adapter-starknet

**Added**

- Starknet chain adapter — Argent X, Braavos wallet support
- Native account abstraction integration (Starknet uses AA by default)
- Cairo contract interaction support

### @cinacoin/adapter-sui

**Added**

- Sui chain adapter — Sui Wallet, Ethos, Suiet, Martian connectors
- Sui transaction block building and signing
- Move contract interaction support

### @cinacoin/adapter-xrpl

**Added**

- XRP Ledger chain adapter — Xaman (formerly Xumm), Fireblocks, Ledger
- XRP transaction signing and XRPL token operations
- Multisig wallet support

### @cinacoin/nuxt

**Added**

- Nuxt 3 module for Cinacoin wallet connection
- Auto-imported composables for ConnectButton and ConnectModal
- SSR-compatible wallet state management

### cinacoin-demo-react

**Added**

- React SPA demo app using Vite (replacing broken Next.js static export)
- Real MetaMask connection support
- Inspired by Reown demo.reown.com design
- Cloudflare Pages deployment ready

---

## [0.2.0] — 2026-05-18

The **v0.2.0 release** is the main feature release covering 64 packages. This release transforms Cinacoin from a basic EVM wallet connector into a comprehensive, multi-chain, multi-platform wallet connection toolkit with enterprise features.

### Notable Changes

#### 🌐 EIP-5792 (Wallet Call API) Support

- `@cinacoin/aa-sdk` — Full EIP-5792 implementation: `wallet_getCallsStatus`, `wallet_sendCalls`, `wallet_showCallsStatus`
- `@cinacoin/bundler` — ERC-4337 Bundler client for sending and managing UserOperations
- `@cinacoin/paymaster` — Paymaster client for gas sponsorship and paymaster data
- `@cinacoin/session-keys` — Temporary signing keys with policies and social recovery for ERC-4337 smart accounts
- `@cinacoin/erc6492` — ERC-6492 signature validation for contract signature verification

#### 📱 Mobile & Cross-Platform SDKs

- `@cinacoin/android-kotlin` — Android SDK TypeScript types with Kotlin interop interfaces
- `@cinacoin/ios-swift` — iOS SDK TypeScript types with Swift interop interfaces
- `@cinacoin/flutter-dart` — Flutter/Dart SDK TypeScript types with Dart interop interfaces
- `@cinacoin/dotnet` — .NET SDK TypeScript types matching Cinacoin .NET client API surface
- `@cinacoin/unity-types` — TypeScript types for Cinacoin Unity C# API surface

#### 🔐 Authentication & Embedded Wallet

- `@cinacoin/social-login` — OAuth2 and email-based wallet authentication with deterministic HD wallet derivation (Google, Apple, X, GitHub, Discord, Facebook, Email, Passkey)
- `@cinacoin/passkey-auth` — WebAuthn-based authentication for blockchain apps
- `@cinacoin/embedded-wallet` — Embedded wallet system with email, social, and phone authentication
- `@cinacoin/siwe` — Sign-In with Ethereum per EIP-4361
- `@cinacoin/siwx` — Sign-In with Cross-chain — unified auth across EVM, Solana, and Bitcoin
- `@cinacoin/wallet-recovery` — Shamir's Secret Sharing with multi-provider wallet recovery

#### 💰 DeFi & Payments

- `@cinacoin/swap-sdk` — Swap Aggregator SDK with multi-DEX routing and slippage protection
- `@cinacoin/onramp-sdk` — On-Ramp Aggregator SDK — multi-provider fiat-to-crypto gateway
- `@cinacoin/payment-flow` — Complete Buy/Send/Receive UI components
- `@cinacoin/pay-ui` — Swap & On-Ramp widget components (React + Web Components)
- `@cinacoin/deposit` — Deposit with Exchange feature
- `@cinacoin/gas-estimator` — EIP-1559 and Solana compute budget gas estimation
- `@cinacoin/gas-sponsorship` — Enterprise gas sponsorship via paymaster integration

#### 🏢 Enterprise Features

- `@cinacoin/kyc` — KYC/AML compliance screening for transactions and payments
- `@cinacoin/travel-rule-demo` — Travel Rule compliance demo for VASP integration
- `@cinacoin/analytics` — GDPR-compliant event tracking and metrics
- `@cinacoin/explorer` — Explorer API for wallet/dApp discovery, logo fetching, registry
- `@cinacoin/blockchain-api` — Managed Blockchain API (ENS, balance history, tx lookup)

#### 🌍 Mini Apps & Social

- `@cinacoin/farcaster-miniapp` — Farcaster Mini App integration for wallet connectivity and SIWF
- `@cinacoin/telegram-miniapp` — Telegram Mini App integration for wallet connectivity
- `@cinacoin/notify-server` — Notification service (push, email, webhook delivery)
- `@cinacoin/push-server` — Push notification server (APNs and FCM delivery)

#### 🔄 Cross-Chain & Multi-Wallet

- `@cinacoin/cross-chain-sync` — Cross-Chain Account Sync — unified state and identity across EVM/Solana/BTC/TON/TRON/Polkadot
- `@cinacoin/multiwallet` — Multi-wallet linking: manage multiple wallet connections simultaneously across namespaces
- `@cinacoin/custom-connectors` — Custom wallet connector interface and built-in connectors

#### 🎨 UI & Theming

- `@cinacoin/ui-theme` — UI theme tokens, animations, and base components
- `@cinacoin/cinacoin-ui-theme` — Theming, animations, and UI components with framer-motion and Tailwind CSS
- `@cinacoin/design-tokens` — Design tokens for white-label UI toolkit
- `@cinacoin/wallet-buttons` — Direct wallet connection buttons (no modal)
- `@cinacoin/wallet-recommender` — Intelligent wallet suggestions based on chain, platform, and behavior
- `@cinacoin/core-ui` — Web Components core built with Lit
- `@cinacoin/cdn` — CDN package for script-tag usage of ConnectButton, ConnectModal

#### 🛠 Infrastructure

- `@cinacoin/relay-server` — WalletConnect relay server (HTTP/WebSocket relay interface)
- `@cinacoin/rpc-proxy` — RPC proxy server with chain routing, caching, rate limiting
- `@cinacoin/keys-server` — Key management server for key storage, encryption, session management
- `@cinacoin/walletconnect-v2` — WalletConnect v2 protocol implementation (pairing, session, crypto, relay, RPC methods)

#### 🔧 Developer Experience

- `@cinacoin/cli` — CLI tool for init, add, build, test
- `@cinacoin/codemod` — Codemods for migrating from Web3Modal/AppKit and WalletConnect v1
- `@cinacoin/testing` — Testing utilities with mock providers, wallets, chains, and transactions
- `@cinacoin/config` — Remote feature flags, headless mode, and virtual testnets
- `@cinacoin/safe-decoder` — Safe (Gnosis Safe) transaction decoder

#### 📦 i18n

- `@cinacoin/i18n` (v2.0.0) — Internationalization package (major version)
- `@cinacoin/i18n-react` — React-specific localization provider

#### 🧪 Framework Adapters

- `@cinacoin/react` — React adapter for white-label UI toolkit
- `@cinacoin/vue` — Vue adapter for white-label UI toolkit
- `@cinacoin/angular` — Angular 17+ adapter for Core SDK
- `@cinacoin/svelte` — Svelte/SvelteKit adapter
- `@cinacoin/next` — Next.js SSR-optimized support (App Router & Pages Router)
- `@cinacoin/nuxt` (v1.0.0) — Nuxt 3 module
- `@cinacoin/react-native` — React Native adapter

#### 📚 Chain Adapters

In addition to the v1.0.0 adapters listed above:

- `@cinacoin/core-sdk` — Core SDK with X25519 key exchange and ChaCha20-Poly1305 encryption

### Package-Specific Changes (v0.2.0)

<details>
<summary><strong>Core SDK & Foundation</strong></summary>

#### @cinacoin/core-sdk (0.2.0)
- **Added**: Real X25519 key exchange using `@noble/curves` (replacing placeholder XOR implementation)
- **Added**: Real ChaCha20-Poly1305 AEAD encryption using `@noble/ciphers` (replacing AES-GCM fallback)
- **Added**: `generateNonce()` utility for generating 12-byte random nonces
- **Changed**: `encrypt()` and `decrypt()` are now synchronous (no longer `async`)
- **Fixed**: X25519 keypair generation uses real `@noble/curves` instead of random placeholder public keys
- **Fixed**: `sharedSecret()` performs real X25519 Diffie-Hellman instead of XOR simulation
- **Fixed**: Encryption uses real ChaCha20-Poly1305 instead of AES-GCM fallback

#### @cinacoin/config (0.2.0)
- **Added**: Remote feature flags support
- **Added**: Headless mode configuration
- **Added**: Virtual testnet support

#### @cinacoin/relay-server (0.2.0)
- **Added**: HTTP/WebSocket relay interface
- **Security**: Relay server crypto verified — using real `x25519-dalek` and `chacha20poly1305` crates

#### @cinacoin/rpc-proxy (0.2.0)
- **Added**: Chain routing with automatic failover
- **Added**: Response caching layer
- **Added**: Rate limiting for RPC requests
- **Fixed**: Updated RPC endpoints to more reliable providers

#### @cinacoin/testing (0.2.0)
- **Added**: Mock providers, wallets, chains, and transactions
- **Added**: Test harness for connector testing

#### @cinacoin/cli (0.2.0)
- **Added**: `init` — project scaffolding
- **Added**: `add` — package installation
- **Added**: `build` — build orchestration
- **Added**: `test` — test runner

#### @cinacoin/codemod (0.2.0)
- **Added**: Migration codemods from Web3Modal/AppKit
- **Added**: Migration codemods from WalletConnect v1

</details>

<details>
<summary><strong>UI Components & Theming</strong></summary>

#### @cinacoin/ui-theme (0.2.0)
- **Added**: UI theme tokens and animations
- **Added**: Base component styles

#### @cinacoin/cinacoin-ui-theme (0.2.0)
- **Added**: Theming with framer-motion animations
- **Added**: Tailwind CSS integration

#### @cinacoin/design-tokens (0.2.0)
- **Added**: Design tokens for white-label UI toolkit

#### @cinacoin/pay-ui (0.2.0)
- **Added**: Swap widget components
- **Added**: On-Ramp widget components
- **Added**: React + Web Components implementation

#### @cinacoin/wallet-buttons (0.2.0)
- **Added**: Direct wallet connection buttons (no modal, no bloat)
- **Added**: Individual wallet connection with customizable buttons

#### @cinacoin/wallet-recommender (0.2.0)
- **Added**: Intelligent wallet recommendation engine
- **Added**: Chain-based, platform-based, and behavior-based suggestions

#### @cinacoin/core-ui (0.2.0)
- **Added**: Web Components core built with Lit
- **Added**: Cross-framework component support

#### @cinacoin/cdn (0.2.0)
- **Added**: Script-tag distribution for ConnectButton and ConnectModal

</details>

<details>
<summary><strong>Authentication & Security</strong></summary>

#### @cinacoin/siwe (0.2.0)
- **Added**: Sign-In with Ethereum per EIP-4361
- **Added**: Domain binding and nonce validation

#### @cinacoin/siwx (0.2.0)
- **Added**: Sign-In with Cross-chain authentication
- **Added**: Unified auth across EVM, Solana, and Bitcoin
- **Added**: Cross-chain identity verification

#### @cinacoin/social-login (0.2.0)
- **Added**: OAuth2 wallet authentication
- **Added**: Google, Apple, X, GitHub, Discord, Facebook, Email providers
- **Added**: Passkey-based authentication
- **Added**: Deterministic HD wallet derivation from social accounts

#### @cinacoin/passkey-auth (0.2.0)
- **Added**: WebAuthn-based authentication
- **Added**: Platform authenticator support
- **Added**: Cross-device passkey sync

#### @cinacoin/embedded-wallet (0.2.0)
- **Added**: Embedded wallet system
- **Added**: Email-based wallet creation
- **Added**: Social login wallet creation
- **Added**: Phone OTP authentication

#### @cinacoin/wallet-recovery (0.2.0)
- **Added**: Shamir's Secret Sharing implementation
- **Added**: Multi-provider wallet recovery
- **Added**: Social recovery mechanism

#### @cinacoin/erc6492 (0.2.0)
- **Added**: ERC-6492 signature validation
- **Added**: Contract signature verification
- **Added**: Predeploy contract signature support

#### @cinacoin/session-keys (0.2.0)
- **Added**: Temporary signing keys for ERC-4337 smart accounts
- **Added**: Policy-based key management
- **Added**: Social recovery for session keys

</details>

<details>
<summary><strong>Account Abstraction</strong></summary>

#### @cinacoin/aa-sdk (0.2.0)
- **Added**: Account Abstraction SDK
- **Added**: Smart account creation and management
- **Added**: Paymaster integration
- **Added**: Bundler client integration
- **Added**: EIP-5792 Wallet Call API support

#### @cinacoin/bundler (0.2.0)
- **Added**: ERC-4337 Bundler client
- **Added**: UserOperation sending and management
- **Added**: Gas estimation for UserOperations

#### @cinacoin/paymaster (0.2.0)
- **Added**: Paymaster client for gas sponsorship
- **Added**: Paymaster data generation
- **Added**: Sponsorship policy configuration

#### @cinacoin/gas-sponsorship (0.2.0)
- **Added**: Enterprise gas sponsorship via paymaster integration
- **Added**: Configurable sponsorship rules

#### @cinacoin/gas-estimator (0.2.0)
- **Added**: EIP-1559 gas estimation for EVM chains
- **Added**: Solana compute budget estimation
- **Added**: Multi-chain gas price aggregation

</details>

<details>
<summary><strong>DeFi & Payments</strong></summary>

#### @cinacoin/swap-sdk (0.2.0)
- **Added**: Swap Aggregator SDK
- **Added**: Multi-DEX swap routing
- **Added**: Slippage protection
- **Added**: Best price aggregation across DEXs

#### @cinacoin/onramp-sdk (0.2.0)
- **Added**: On-Ramp Aggregator SDK
- **Added**: Multi-provider fiat-to-crypto gateway
- **Added**: Provider comparison and routing

#### @cinacoin/payment-flow (0.2.0)
- **Added**: Complete payment UI components
- **Added**: Buy flow components
- **Added**: Send flow components
- **Added**: Receive flow components

#### @cinacoin/deposit (0.2.0)
- **Added**: Deposit with Exchange feature
- **Added**: Exchange integration support

</details>

<details>
<summary><strong>Enterprise & Compliance</strong></summary>

#### @cinacoin/kyc (0.2.0)
- **Added**: KYC/AML compliance screening
- **Added**: Transaction screening
- **Added**: Payment screening

#### @cinacoin/travel-rule-demo (0.2.0)
- **Added**: Travel Rule compliance demo
- **Added**: VASP integration demo

#### @cinacoin/analytics (0.2.0)
- **Added**: GDPR-compliant event tracking
- **Added**: Metrics collection and reporting

#### @cinacoin/explorer (0.2.0)
- **Added**: Wallet/dApp discovery API
- **Added**: Logo fetching
- **Added**: Wallet registry

#### @cinacoin/blockchain-api (0.2.0)
- **Added**: ENS resolution API
- **Added**: Balance history API
- **Added**: Transaction lookup API

</details>

<details>
<summary><strong>Cross-Chain & Multi-Wallet</strong></summary>

#### @cinacoin/cross-chain-sync (0.2.0)
- **Added**: Cross-Chain Account Sync
- **Added**: Unified state across EVM/Solana/BTC/TON/TRON/Polkadot
- **Added**: Cross-chain identity management

#### @cinacoin/multiwallet (0.2.0)
- **Added**: Multi-wallet linking
- **Added**: Simultaneous management of multiple wallet connections
- **Added**: Cross-namespace wallet coordination

#### @cinacoin/custom-connectors (0.2.0)
- **Added**: Custom wallet connector interface
- **Added**: Built-in connector implementations

</details>

<details>
<summary><strong>Mini Apps & Social</strong></summary>

#### @cinacoin/farcaster-miniapp (0.2.0)
- **Added**: Farcaster Mini App integration
- **Added**: Wallet connectivity within Farcaster
- **Added**: SIWF (Sign-In With Farcaster) support

#### @cinacoin/telegram-miniapp (0.2.0)
- **Added**: Telegram Mini App integration
- **Added**: Wallet connectivity within Telegram

#### @cinacoin/notify-server (0.2.0)
- **Added**: Notification service
- **Added**: Push notification delivery
- **Added**: Email notification delivery
- **Added**: Webhook notification delivery

#### @cinacoin/push-server (0.2.0)
- **Added**: Push notification server
- **Added**: APNs (Apple Push Notification service) delivery
- **Added**: FCM (Firebase Cloud Messaging) delivery

</details>

<details>
<summary><strong>Infrastructure</strong></summary>

#### @cinacoin/relay-server (0.2.0)
- **Added**: WalletConnect relay server
- **Added**: HTTP relay interface
- **Added**: WebSocket relay interface

#### @cinacoin/rpc-proxy (0.2.0)
- **Added**: RPC proxy server
- **Added**: Chain routing
- **Added**: Response caching
- **Added**: Rate limiting

#### @cinacoin/keys-server (0.2.0)
- **Added**: Key management server
- **Added**: Secure key storage
- **Added**: Encryption operations
- **Added**: Session management

#### @cinacoin/walletconnect-v2 (0.2.0)
- **Added**: WalletConnect v2 protocol implementation
- **Added**: Pairing management
- **Added**: Session management
- **Added**: Crypto primitives
- **Added**: Relay client
- **Added**: RPC method handlers

#### @cinacoin/safe-decoder (0.2.0)
- **Added**: Safe (Gnosis Safe) transaction decoder
- **Added**: Multi-signature transaction parsing

</details>

<details>
<summary><strong>Developer Experience</strong></summary>

#### @cinacoin/performance-utils (0.1.0)
- **Added**: Performance monitoring utilities
- **Added**: Optimization utilities

#### @cinacoin/token-list (0.2.0)
- **Added**: Token discovery
- **Added**: Token metadata management
- **Added**: Token validation

#### @cinacoin/ens-resolver (0.2.0)
- **Added**: ENS name resolution
- **Added**: Reverse lookup
- **Added**: Avatar retrieval
- **Added**: Record fetching

</details>

<details>
<summary><strong>Framework Adapters</strong></summary>

#### @cinacoin/react (0.2.0)
- **Added**: React adapter for white-label UI toolkit
- **Added**: React hooks and components

#### @cinacoin/vue (0.2.0)
- **Added**: Vue adapter for white-label UI toolkit
- **Added**: Vue composables and components

#### @cinacoin/angular (0.2.0)
- **Added**: Angular 17+ adapter for Core SDK
- **Added**: Angular services and components
- **Added**: 100% coverage implementation

#### @cinacoin/svelte (0.2.0)
- **Added**: Svelte/SvelteKit adapter
- **Added**: Svelte stores and components

#### @cinacoin/next (0.2.0)
- **Added**: Next.js SSR-optimized support
- **Added**: App Router integration
- **Added**: Pages Router integration

#### @cinacoin/react-native (0.2.0)
- **Added**: React Native adapter
- **Added**: Native UI components

</details>

<details>
<summary><strong>Mobile & Cross-Platform SDKs</strong></summary>

#### @cinacoin/android-kotlin (0.2.0)
- **Added**: Android SDK TypeScript types
- **Added**: Kotlin interop interfaces

#### @cinacoin/ios-swift (0.2.0)
- **Added**: iOS SDK TypeScript types
- **Added**: Swift interop interfaces

#### @cinacoin/flutter-dart (0.2.0)
- **Added**: Flutter/Dart SDK TypeScript types
- **Added**: Dart interop interfaces

#### @cinacoin/dotnet (0.2.0)
- **Added**: .NET SDK TypeScript types
- **Added**: Matching .NET client API surface

#### @cinacoin/unity-types (0.2.0)
- **Added**: TypeScript types for Unity C# API surface

</details>

---

## [0.1.0] — 2026-05-16

### Added
- Initial release as OnChainUX (later rebranded to Cinacoin)
- Core SDK with WebSocket relay
- EIP-6963 wallet discovery
- Session management
- State management with Zustand
- EVM chain adapter
- Transport layer (Relay, Injected, QR)
- Account abstraction foundation
- 5-phase implementation architecture

---

## Rebranding — 2026-05-17

- **Rebranded**: `@onchainux` → `@cinacoin` (Cinacoin)
- All documentation updated with Cinacoin branding
- README rewritten in English

---

## Migration Guide

### Upgrading to v2.0.0

#### @cinacoin/i18n (v1.x → v2.0.0)

The i18n package has a major version bump. Review locale file format changes in the documentation.

```bash
pnpm upgrade @cinacoin/i18n
```

#### Upgrading to v0.2.0

Most packages are new at v0.2.0. Install the packages you need:

```bash
# Core + React
pnpm add @cinacoin/core-sdk @cinacoin/react

# With Account Abstraction
pnpm add @cinacoin/aa-sdk @cinacoin/bundler @cinacoin/paymaster

# With Social Login
pnpm add @cinacoin/social-login @cinacoin/embedded-wallet

# With Mobile SDKs
pnpm add @cinacoin/android-kotlin @cinacoin/ios-swift
```

#### Core SDK Breaking Change (v0.1.0 → v0.2.0)

`encrypt()` and `decrypt()` are now **synchronous**. Update any `await` calls:

```diff
- const encrypted = await core.encrypt(data, publicKey);
+ const encrypted = core.encrypt(data, publicKey);

- const decrypted = await core.decrypt(encrypted, privateKey);
+ const decrypted = core.decrypt(encrypted, privateKey);
```

#### From Web3Modal / WalletConnect v1

Use the codemod package to migrate:

```bash
npx @cinacoin/codemod
```

---

## Package Version Summary

| Category | Packages | Version |
|---|---|---|
| Core SDK & Foundation | core-sdk, config, relay-server, rpc-proxy, testing, cli, codemod | 0.2.0 |
| UI Frameworks | react, vue, angular, svelte, next, react-native, core-ui | 0.2.0 |
| Nuxt | nuxt | **1.0.0** |
| UI Components & Themes | ui-theme, cinacoin-ui-theme, design-tokens, pay-ui, wallet-buttons, wallet-recommender, cdn | 0.2.0 |
| i18n | i18n | **2.0.0** |
| i18n (React) | i18n-react | 0.2.0 |
| Authentication | social-login, passkey-auth, embedded-wallet, siwe, siwx, wallet-recovery, erc6492, session-keys | 0.2.0 |
| Account Abstraction | aa-sdk, bundler, paymaster, gas-sponsorship, gas-estimator | 0.2.0 |
| DeFi & Payments | swap-sdk, onramp-sdk, payment-flow, pay-ui, deposit | 0.2.0 |
| Enterprise | kyc, travel-rule-demo, analytics, explorer, blockchain-api | 0.2.0 |
| Cross-Chain | cross-chain-sync, multiwallet, custom-connectors | 0.2.0 |
| Mini Apps | farcaster-miniapp, telegram-miniapp | 0.2.0 |
| Notifications | notify-server, push-server | 0.2.0 |
| Infrastructure | relay-server, rpc-proxy, keys-server, walletconnect-v2, safe-decoder | 0.2.0 |
| Chain Adapters | adapter-bitcoin, adapter-cosmos, adapter-hedera, adapter-near, adapter-starknet, adapter-sui, adapter-xrpl | **1.0.0** |
| Mobile SDKs | android-kotlin, ios-swift, flutter-dart, dotnet, unity-types | 0.2.0 |
| Developer Tools | performance-utils, token-list, ens-resolver | 0.1.0 / 0.2.0 |
| Demo Apps | cinacoin-demo, cinacoin-demo-react | 0.1.1 / **1.0.0** |

---

## Security

- Replaced non-functional cryptographic placeholders with production-ready `@noble` implementations
- X25519 key exchange now uses real `@noble/curves` (not random placeholder keys)
- ChaCha20-Poly1305 AEAD encryption now uses real `@noble/ciphers` (not AES-GCM fallback)
- Relay server crypto verified — using real `x25519-dalek` and `chacha20poly1305` crates

---

## Statistics

- **Total packages**: 72 (70 library + 2 demo apps)
- **Chain adapters**: 8 (EVM + Bitcoin + Cosmos + Hedera + NEAR + Starknet + Sui + XRPL)
- **Framework adapters**: 7 (React, Vue, Angular, Svelte, Next.js, Nuxt, React Native)
- **Mobile/Cross-platform SDKs**: 5 (Android, iOS, Flutter, .NET, Unity)
- **Test coverage**: 125+ server-side unit test cases, 55+ E2E tests
- **Commits**: 57 across 3 days of intensive development (May 16–18, 2026)

[Unreleased]: https://github.com/cinacoin/cinacoin/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/cinacoin/cinacoin/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/cinacoin/cinacoin/releases/tag/v0.1.0
