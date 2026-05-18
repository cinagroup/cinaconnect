# CinaConnect

> **Connect Everything On-Chain** — A full-stack, white-label Web3 SDK by CinaGroup.

CinaConnect is an open-source, all-in-one SDK for building seamless on-chain experiences. It provides wallet connections, multi-chain authentication, payments, smart accounts, and developer tools across web, mobile, and game engines.

> **🚧 Project Status:** **64/64 packages built** with dist/ directories. 1 package published to npm (`@cinaconnect/core-sdk`). **104+ test files** across the codebase. **53 commits**. Two infrastructure services (RPC Proxy, Keys Server) are **deployed & live on Cloudflare Workers**. Active development — see status breakdown below.

---

## Features

### 🔗 Wallet Connection
- **600+ wallets** via WalletConnect Network (EVM, Solana, Bitcoin, TON, TRON)
- **EIP-6963** multi-wallet discovery
- **Email & social login** — Google, X, GitHub, Discord, Apple, Facebook, Farcaster
- **Smart Accounts** (ERC-4337) — gasless transactions, session keys, batch calls

### 💳 Payments
- **Swaps** — SDK interface for DEX aggregators 🔌 *Requires your own DEX aggregator API key (e.g., 1inch, 0x); CinaConnect provides the integration layer only*
- **On-Ramp** — SDK interface with iframe embed for Meld/Coinbase Pay 🔌 *Requires your own provider API key; CinaConnect provides the integration layer only*
- **Bridge** — cross-chain session synchronization layer 🔌 *SDK sync layer only; no native cross-chain bridge implementation yet*
- **Pay** — self-custodial wallet payments across 6 chains (USDC, USDT, SOL)

### 🔐 Authentication
- **SIWE** (Sign-In With Ethereum, EIP-4361)
- **SIWX** (Sign-In With X, CAIP-122) — chain-agnostic multi-chain auth
- **Passkey / biometric** authentication

### 📱 Cross-Platform SDKs

| Platform | Package | Status |
|----------|---------|--------|
| Web (Vanilla JS) | `@cinaconnect/core-sdk` | ✅ **built & published** |
| React | `@cinaconnect/react` | ✅ built |
| Next.js | `@cinaconnect/next` | ✅ built |
| Vue 3 | `@cinaconnect/vue` | ✅ built |
| Svelte | `@cinaconnect/svelte` | ✅ built |
| React Native | `@cinaconnect/react-native` | ✅ built — type definitions, native implementation needed for full functionality |
| Flutter / Dart | `@cinaconnect/flutter` | ✅ built — type definitions, native implementation needed for full functionality |
| Android (Kotlin) | `@cinaconnect/android` | ✅ built |
| iOS (Swift) | `@cinaconnect/ios` | ✅ built |
| Unity (C#) | `@cinaconnect/unity` | ✅ built |
| Telegram Mini Apps | `@cinaconnect/telegram` | ✅ built |
| Farcaster Mini Apps | `@cinaconnect/farcaster` | ✅ built |

---

## Quick Start

### Install

```bash
# npm
npm install @cinaconnect/react @cinaconnect/adapter-ethereum

# yarn
yarn add @cinaconnect/react @cinaconnect/adapter-ethereum

# pnpm
pnpm add @cinaconnect/react @cinaconnect/adapter-ethereum
```

### Usage (React)

```tsx
import { OnuxProvider, useOnuxAccount, useOnuxNetwork } from '@cinaconnect/react';
import { mainnet, arbitrum, base } from '@cinaconnect/chains';

function App() {
  return (
    <OnuxProvider
      projectId="YOUR_PROJECT_ID"
      networks={[mainnet, arbitrum, base]}
      metadata={{
        name: 'My Dapp',
        description: 'A decentralized application',
        url: 'https://mydapp.com',
        icons: ['https://mydapp.com/icon.png'],
      }}
    >
      <Main />
    </OnuxProvider>
  );
}

function Main() {
  const { open, close } = useOnux();
  const { address, isConnected, status } = useOnuxAccount();
  const { chain, switchNetwork } = useOnuxNetwork();

  return (
    <div>
      {isConnected ? (
        <>
          <p>Connected: {address}</p>
          <p>Network: {chain?.name}</p>
          <button onClick={() => open()}>Open Wallet Modal</button>
          <button onClick={() => close()}>Close</button>
        </>
      ) : (
        <button onClick={() => open()}>Connect Wallet</button>
      )}
    </div>
  );
}
```

---

## Package Index

### Status Legend
- ✅ **Built & Published** — compiled, tested, published to npm, ready to install
- 🚧 **In Development** — source written, actively being built/deployed (e.g., Cloudflare Workers)
- 📝 **Source Written** — source code exists but **not yet built or published** to npm
- ⬜ **Planned** — package.json scaffolding only, source not yet written
- 🔌 **SDK Layer** — type definitions & integration interfaces only; **requires external API key or service** to function

### Core
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/core-sdk` | Core SDK — SignClient, Pairing API, Universal Provider | ✅ **built & published** |
| `@cinaconnect/walletconnect-v2` | WalletConnect v2 protocol integration | ✅ built; adapter exports commented out in core-sdk |
| `@cinaconnect/chains` | Chain definition registry (300+ chains) | ✅ built |

### Adapters
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/adapter-ethereum` | EVM chain adapter (Wagmi / Ethers) | ✅ built; export commented out in core-sdk |
| `@cinaconnect/adapter-solana` | Solana SVM chain adapter | ✅ built; export commented out in core-sdk |
| `@cinaconnect/adapter-bitcoin` | Bitcoin BIP-122 chain adapter | ✅ built |
| `@cinaconnect/adapter-ton` | TON chain adapter | ✅ built |
| `@cinaconnect/adapter-tron` | TRON chain adapter | ✅ built |

### UI & Frameworks
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/core-ui` | Web Components (Lit-based modal & widgets) | ✅ built |
| `@cinaconnect/react` | React hooks & components | ✅ built |
| `@cinaconnect/next` | Next.js App Router support | ✅ built |
| `@cinaconnect/vue` | Vue 3 plugin & composables | ✅ built |
| `@cinaconnect/svelte` | Svelte 4/5 store & components | ✅ built |
| `@cinaconnect/react-native` | React Native SDK — type definitions only, native implementation needed | ✅ built 🔌 |
| `@cinaconnect/flutter` | Flutter SDK (Dart) — type definitions only, native implementation needed | ✅ built 🔌 |
| `@cinaconnect/android` | Android SDK (Kotlin) | ✅ built |
| `@cinaconnect/ios` | iOS SDK (Swift) | ✅ built |
| `@cinaconnect/unity` | Unity SDK (C#) | ✅ built |

### Authentication
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/siwe` | Sign-In With Ethereum (EIP-4361) | ✅ built |
| `@cinaconnect/siwx` | Sign-In With X (CAIP-122, multi-chain) | ✅ built |
| `@cinaconnect/social-login` | Email & social login (Magic.link) | ✅ built |
| `@cinaconnect/passkey-auth` | Passkey / biometric authentication | ✅ built |

### Smart Accounts
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/aa-sdk` | Account Abstraction SDK (ERC-4337) | ✅ built |
| `@cinaconnect/bundler` | ERC-4337 Bundler (Rust) | ✅ built |
| `@cinaconnect/paymaster` | ERC-7677 Paymaster | ✅ built |
| `@cinaconnect/erc6492` | ERC-6492 signature verification (Rust) | ✅ built |
| `@cinaconnect/session-keys` | Ephemeral session keys | ✅ built |
| `@cinaconnect/ens-resolver` | ENS / readable account names | ✅ built |

### Payments
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/swap-sdk` | Token swap via DEX aggregators | ✅ built 🔌 **SDK interface only — requires your own DEX aggregator API key** |
| `@cinaconnect/onramp-sdk` | Fiat-to-crypto on-ramp | ✅ built 🔌 **SDK + iframe embed only — requires Meld/Coinbase Pay API key** |
| `@cinaconnect/pay-ui` | Payment UI components | ✅ built |
| `@cinaconnect/bridge-sync` | Cross-chain session synchronization | ✅ built — **Sync layer only; no native cross-chain bridge yet** |

### Infrastructure
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/relay-server` | WebSocket relay server (Rust) | ✅ built |
| `@cinaconnect/rpc-proxy` | RPC proxy server | 🚧 **deployed & running on Cloudflare Workers** |
| `@cinaconnect/keys-server` | Key management server | 🚧 **deployed & running on Cloudflare Workers** |
| `@cinaconnect/notify-server` | Notification server | ✅ built — not deployed |
| `@cinaconnect/push-server` | Push notification server (Rust) | ✅ built |
| `@cinaconnect/cdn` | CDN asset delivery | ✅ built |

### Developer Tools
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/cli` | CLI tool for project scaffolding | ✅ built |
| `@cinaconnect/testing` | Mock providers & test utilities | ✅ built |
| `@cinaconnect/codemod` | Migration tool from Reown/AppKit | ✅ built |
| `@cinaconnect/wallet-recommender` | Intelligent wallet recommendation engine | ✅ built |
| `@cinaconnect/gas-estimator` | Gas estimation utilities | ✅ built |
| `@cinaconnect/token-list` | Curated token registry | ✅ built |
| `@cinaconnect/analytics` | Connection event analytics | ✅ built |

### Platform Integrations
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/telegram-miniapp` | Telegram Mini Apps integration | ✅ built |
| `@cinaconnect/farcaster-miniapp` | Farcaster Mini Apps integration | ✅ built |

### Design & Utilities
| Package | Description | Status |
|---------|-------------|--------|
| `@cinaconnect/design-tokens` | CSS design tokens (colors, spacing, typography) | ✅ built |
| `@cinaconnect/cross-chain-sync` | Cross-chain state synchronization | ✅ built |
| `@cinaconnect/safe-decoder` | Safe transaction decoder (Rust) | ✅ built |
| `@cinaconnect/travel-rule-demo` | Travel Rule compliance demo | ✅ built |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Your Application                      │
├──────────────────────────────────────────────────────────┤
│  @cinaconnect/react │ @cinaconnect/next │ @cinaconnect/vue│
├──────────────────────────────────────────────────────────┤
│                    @cinaconnect/core-ui                    │
│               (Web Components / Modal UI)                  │
├──────────────────────────────────────────────────────────┤
│                 @cinaconnect/core-sdk                      │
│   SignClient  │  Pairing API  │  Universal Provider       │
├──────────────────────────────────────────────────────────┤
│  @cinaconnect/adapter-* (EVM, Solana, BTC, TON, TRON)     │
├──────────────────────────────────────────────────────────┤
│              WalletConnect Network (Relay)                 │
│          wss://relay.walletconnect.com (or self-hosted)    │
└──────────────────────────────────────────────────────────┘
```

---

## Documentation

| Resource | Link |
|----------|------|
| 📖 Full Docs | [docs.cinaconnect.io](https://docs.cinaconnect.io) |
| 🚀 Quick Start | [Quick Start Guide](./docs/guide/quick-start.md) |
| 📦 Installation | [Installation Guide](./docs/guide/installation.md) |
| 🔧 Configuration | [Configuration Guide](./docs/guide/configuration.md) |
| 🔄 Migrate from Reown | [Migration Guide](./docs/guide/migrate-from-reown.md) |
| ❓ FAQ | [FAQ](./docs/faq.md) |
| 🔒 Security | [Security Best Practices](./docs/security/best-practices.md) |
| 📱 Android Example | [Android Example](./docs/examples/android.md) |
| 🍎 iOS Example | [iOS Example](./docs/examples/ios.md) |
| 📱 React Native Example | [React Native Example](./docs/examples/react-native.md) |

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see [LICENSE.md](./LICENSE.md) for details.

---

**CinaConnect** — by [CinaGroup](https://github.com/cinagroup)  
*Connect Everything On-Chain*
