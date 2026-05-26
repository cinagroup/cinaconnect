# CinaConnect API Reference

> Complete API documentation for the CinaConnect monorepo — 64 packages, unified reference.

## Quick Start

```bash
npm install @cinaconnect/core-sdk
```

```typescript
import { Connector, SessionManager } from '@cinaconnect/core-sdk'
```

## Packages

### Core

| Package | Docs | Description |
|---------|------|-------------|
| [`@cinaconnect/core-sdk`](./core-sdk.md) | [→](./core-sdk.md) | Main SDK — Connector, SessionManager, types, transports, adapters |
| [`@cinaconnect/react`](./react.md) | [→](./react.md) | React hooks, providers, and UI components |
| [`@cinaconnect/react-native`](./mobile.md) | [→](./mobile.md) | React Native wallet connection |

### Authentication

| Package | Docs | Description |
|---------|------|-------------|
| [`@cinaconnect/siwe`](./siwe.md) | [→](./siwe.md) | Sign-In With Ethereum (EIP-4361) |
| [`@cinaconnect/siwx`](./generated/siwx.md) | [→](./generated/siwx.md) | Sign-In With X — cross-chain authentication |
| [`@cinaconnect/social-login`](./generated/social-login.md) | [→](./generated/social-login.md) | Social login providers (Google, Apple, etc.) |

### Account Abstraction

| Package | Docs | Description |
|---------|------|-------------|
| [`@cinaconnect/aa-sdk`](./aa-sdk.md) | [→](./aa-sdk.md) | ERC-4337 smart accounts, bundler client, paymaster |
| [`@cinaconnect/session-keys`](./session-keys.md) | [→](./session-keys.md) | Temporary session keys with policies |
| [`@cinaconnect/bundler`](./bundler.md) | [→](./bundler.md) | Rust-based ERC-4337 bundler |
| [`@cinaconnect/paymaster`](./paymaster.md) | [→](./paymaster.md) | ERC-4337 paymaster contracts |

### DeFi

| Package | Docs | Description |
|---------|------|-------------|
| [`@cinaconnect/swap-sdk`](./swap-sdk.md) | [→](./swap-sdk.md) | Multi-DEX swap routing with slippage protection |
| [`@cinaconnect/onramp-sdk`](./onramp-sdk.md) | [→](./onramp-sdk.md) | Fiat on-ramp integration |

### Chain Adapters

| Package | Description |
|---------|-------------|
| `@cinaconnect/adapter-evm` | EVM chain adapter (built into core-sdk) |
| `@cinaconnect/adapter-bitcoin` | Bitcoin adapter |
| `@cinaconnect/adapter-solana` | Solana adapter (built into core-sdk) |
| `@cinaconnect/adapter-ton` | TON adapter (built into core-sdk) |
| `@cinaconnect/adapter-tron` | TRON adapter (built into core-sdk) |
| `@cinaconnect/adapter-polkadot` | Polkadot adapter (built into core-sdk) |
| `@cinaconnect/adapter-starknet` | Starknet adapter |
| `@cinaconnect/adapter-sui` | Sui adapter |
| `@cinaconnect/adapter-near` | NEAR adapter |
| `@cinaconnect/adapter-cosmos` | Cosmos adapter |
| `@cinaconnect/adapter-hedera` | Hedera adapter |
| `@cinaconnect/adapter-xrpl` | XRP Ledger adapter |

### Infrastructure

| Package | Description |
|---------|-------------|
| `@cinaconnect/relay-server` | WebSocket relay server |
| `@cinaconnect/rpc-proxy` | RPC proxy for blockchain access |
| `@cinaconnect/keys-server` | Key management server |
| `@cinaconnect/notify-server` | Push notification server |
| `@cinaconnect/blockchain-api` | Unified blockchain API |

### UI Frameworks

| Package | Description |
|---------|-------------|
| `@cinaconnect/next` | Next.js integration |
| `@cinaconnect/vue` | Vue 3 integration |
| `@cinaconnect/svelte` | Svelte integration |
| `@cinaconnect/nuxt` | Nuxt integration |
| `@cinaconnect/angular` | Angular integration |
| `@cinaconnect/core-ui` | Core UI components |
| `@cinaconnect/wallet-buttons` | Wallet connect buttons |
| `@cinaconnect/ui-theme` | Theme customization |
| `@cinaconnect/cinaconnect-ui-theme` | CinaConnect branded theme |
| `@cinaconnect/design-tokens` | Design system tokens |

### Mobile & Desktop

| Package | Docs | Description |
|---------|------|-------------|
| `@cinaconnect/react-native` | [→](./mobile.md) | React Native SDK |
| `@cinaconnect/flutter-dart` | | Flutter/Dart SDK |
| `@cinaconnect/ios-swift` | | iOS Swift SDK |
| `@cinaconnect/android-kotlin` | | Android Kotlin SDK |
| `@cinaconnect/unity-csharp` | | Unity C# SDK |
| `@cinaconnect/dotnet` | | .NET SDK |

### Mini Apps

| Package | Description |
|---------|-------------|
| `@cinaconnect/telegram-miniapp` | Telegram Mini App integration |
| `@cinaconnect/farcaster-miniapp` | Farcaster Mini App integration |

### Utilities

| Package | Description |
|---------|-------------|
| `@cinaconnect/passkey-auth` | Passkey/WebAuthn authentication |
| `@cinaconnect/embedded-wallet` | Embedded wallet creation |
| `@cinaconnect/wallet-recovery` | Account recovery mechanisms |
| `@cinaconnect/wallet-recommender` | Wallet recommendation engine |
| `@cinaconnect/ens-resolver` | ENS name resolution |
| `@cinaconnect/gas-estimator` | Gas estimation utilities |
| `@cinaconnect/gas-sponsorship` | Gas sponsorship helpers |
| `@cinaconnect/erc6492` | ERC-6492 signature validation |
| `@cinaconnect/batch-transaction` | Batch transaction builder |
| `@cinaconnect/cross-chain-sync` | Cross-chain state sync |
| `@cinaconnect/multiwallet` | Multi-wallet management |
| `@cinaconnect/walletconnect-v2` | WalletConnect v2 adapter |
| `@cinaconnect/custom-connectors` | Custom connector patterns |
| `@cinaconnect/kyc` | KYC integration |
| `@cinaconnect/payment-flow` | Payment flow orchestration |
| `@cinaconnect/pay-ui` | Payment UI components |
| `@cinaconnect/deposit` | Deposit flow |
| `@cinaconnect/token-list` | Token list management |
| `@cinaconnect/analytics` | Analytics tracking |
| `@cinaconnect/travel-rule-demo` | Travel Rule compliance demo |
| `@cinaconnect/cinaconnect-i18n` | Internationalization |
| `@cinaconnect/i18n` | i18n utilities |
| `@cinaconnect/cli` | Command-line interface |
| `@cinaconnect/codemod` | Code migration tools |
| `@cinaconnect/cdn` | CDN distribution |
| `@cinaconnect/testing` | Testing utilities |
| `@cinaconnect/explorer` | Transaction explorer |
| `@cinaconnect/config` | Configuration utilities |
| `@cinaconnect/safe-decoder` | Safe transaction decoder |

## TypeDoc Generated Docs

For the complete auto-generated TypeDoc output, see [`generated/README.md`](./generated/README.md).

## How to Regenerate TypeDoc

```bash
# From monorepo root
npm run typedoc

# Watch mode
npm run typedoc:watch
```

Configuration is in [`typedoc.json`](../../../typedoc.json).

## Package Versioning

All packages follow semver. Current SDK version: `0.1.0` (available as `VERSION` export from `@cinaconnect/core-sdk`).
