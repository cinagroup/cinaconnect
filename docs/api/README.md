# Cinacoin API Reference

> Complete API documentation for the Cinacoin monorepo — 64 packages, unified reference.

## Quick Start

```bash
npm install @cinacoin/core-sdk
```

```typescript
import { Connector, SessionManager } from '@cinacoin/core-sdk'
```

## Packages

### Core

| Package | Docs | Description |
|---------|------|-------------|
| [`@cinacoin/core-sdk`](./core-sdk.md) | [→](./core-sdk.md) | Main SDK — Connector, SessionManager, types, transports, adapters |
| [`@cinacoin/react`](./react.md) | [→](./react.md) | React hooks, providers, and UI components |
| [`@cinacoin/react-native`](./mobile.md) | [→](./mobile.md) | React Native wallet connection |

### Authentication

| Package | Docs | Description |
|---------|------|-------------|
| [`@cinacoin/siwe`](./siwe.md) | [→](./siwe.md) | Sign-In With Ethereum (EIP-4361) |
| [`@cinacoin/siwx`](./generated/siwx.md) | [→](./generated/siwx.md) | Sign-In With X — cross-chain authentication |
| [`@cinacoin/social-login`](./generated/social-login.md) | [→](./generated/social-login.md) | Social login providers (Google, Apple, etc.) |

### Account Abstraction

| Package | Docs | Description |
|---------|------|-------------|
| [`@cinacoin/aa-sdk`](./aa-sdk.md) | [→](./aa-sdk.md) | ERC-4337 smart accounts, bundler client, paymaster |
| [`@cinacoin/session-keys`](./session-keys.md) | [→](./session-keys.md) | Temporary session keys with policies |
| [`@cinacoin/bundler`](./bundler.md) | [→](./bundler.md) | Rust-based ERC-4337 bundler |
| [`@cinacoin/paymaster`](./paymaster.md) | [→](./paymaster.md) | ERC-4337 paymaster contracts |

### DeFi

| Package | Docs | Description |
|---------|------|-------------|
| [`@cinacoin/swap-sdk`](./swap-sdk.md) | [→](./swap-sdk.md) | Multi-DEX swap routing with slippage protection |
| [`@cinacoin/onramp-sdk`](./onramp-sdk.md) | [→](./onramp-sdk.md) | Fiat on-ramp integration |

### Chain Adapters

| Package | Description |
|---------|-------------|
| `@cinacoin/adapter-evm` | EVM chain adapter (built into core-sdk) |
| `@cinacoin/adapter-bitcoin` | Bitcoin adapter |
| `@cinacoin/adapter-solana` | Solana adapter (built into core-sdk) |
| `@cinacoin/adapter-ton` | TON adapter (built into core-sdk) |
| `@cinacoin/adapter-tron` | TRON adapter (built into core-sdk) |
| `@cinacoin/adapter-polkadot` | Polkadot adapter (built into core-sdk) |
| `@cinacoin/adapter-starknet` | Starknet adapter |
| `@cinacoin/adapter-sui` | Sui adapter |
| `@cinacoin/adapter-near` | NEAR adapter |
| `@cinacoin/adapter-cosmos` | Cosmos adapter |
| `@cinacoin/adapter-hedera` | Hedera adapter |
| `@cinacoin/adapter-xrpl` | XRP Ledger adapter |

### Infrastructure

| Package | Description |
|---------|-------------|
| `@cinacoin/relay-server` | WebSocket relay server |
| `@cinacoin/rpc-proxy` | RPC proxy for blockchain access |
| `@cinacoin/keys-server` | Key management server |
| `@cinacoin/notify-server` | Push notification server |
| `@cinacoin/blockchain-api` | Unified blockchain API |

### UI Frameworks

| Package | Description |
|---------|-------------|
| `@cinacoin/next` | Next.js integration |
| `@cinacoin/vue` | Vue 3 integration |
| `@cinacoin/svelte` | Svelte integration |
| `@cinacoin/nuxt` | Nuxt integration |
| `@cinacoin/angular` | Angular integration |
| `@cinacoin/core-ui` | Core UI components |
| `@cinacoin/wallet-buttons` | Wallet connect buttons |
| `@cinacoin/ui-theme` | Theme customization |
| `@cinacoin/cinacoin-ui-theme` | Cinacoin branded theme |
| `@cinacoin/design-tokens` | Design system tokens |

### Mobile & Desktop

| Package | Docs | Description |
|---------|------|-------------|
| `@cinacoin/react-native` | [→](./mobile.md) | React Native SDK |
| `@cinacoin/flutter-dart` | | Flutter/Dart SDK |
| `@cinacoin/ios-swift` | | iOS Swift SDK |
| `@cinacoin/android-kotlin` | | Android Kotlin SDK |
| `@cinacoin/unity-csharp` | | Unity C# SDK |
| `@cinacoin/dotnet` | | .NET SDK |

### Mini Apps

| Package | Description |
|---------|-------------|
| `@cinacoin/telegram-miniapp` | Telegram Mini App integration |
| `@cinacoin/farcaster-miniapp` | Farcaster Mini App integration |

### Utilities

| Package | Description |
|---------|-------------|
| `@cinacoin/passkey-auth` | Passkey/WebAuthn authentication |
| `@cinacoin/embedded-wallet` | Embedded wallet creation |
| `@cinacoin/wallet-recovery` | Account recovery mechanisms |
| `@cinacoin/wallet-recommender` | Wallet recommendation engine |
| `@cinacoin/ens-resolver` | ENS name resolution |
| `@cinacoin/gas-estimator` | Gas estimation utilities |
| `@cinacoin/gas-sponsorship` | Gas sponsorship helpers |
| `@cinacoin/erc6492` | ERC-6492 signature validation |
| `@cinacoin/batch-transaction` | Batch transaction builder |
| `@cinacoin/cross-chain-sync` | Cross-chain state sync |
| `@cinacoin/multiwallet` | Multi-wallet management |
| `@cinacoin/walletconnect-v2` | WalletConnect v2 adapter |
| `@cinacoin/custom-connectors` | Custom connector patterns |
| `@cinacoin/kyc` | KYC integration |
| `@cinacoin/payment-flow` | Payment flow orchestration |
| `@cinacoin/pay-ui` | Payment UI components |
| `@cinacoin/deposit` | Deposit flow |
| `@cinacoin/token-list` | Token list management |
| `@cinacoin/analytics` | Analytics tracking |
| `@cinacoin/travel-rule-demo` | Travel Rule compliance demo |
| `@cinacoin/cinacoin-i18n` | Internationalization |
| `@cinacoin/i18n` | i18n utilities |
| `@cinacoin/cli` | Command-line interface |
| `@cinacoin/codemod` | Code migration tools |
| `@cinacoin/cdn` | CDN distribution |
| `@cinacoin/testing` | Testing utilities |
| `@cinacoin/explorer` | Transaction explorer |
| `@cinacoin/config` | Configuration utilities |
| `@cinacoin/safe-decoder` | Safe transaction decoder |

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

All packages follow semver. Current SDK version: `0.1.0` (available as `VERSION` export from `@cinacoin/core-sdk`).
