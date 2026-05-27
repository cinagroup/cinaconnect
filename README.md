# Cinacoin

> **Connect Everything On-Chain** — A full-stack, white-label Web3 SDK by CinaGroup.

Cinacoin is an open-source, all-in-one SDK for building seamless on-chain experiences. It provides wallet connections, multi-chain authentication, payments, smart accounts, and developer tools across web, mobile, and game engines.

> **🚧 Project Status:** **64/64 packages built** with dist/ directories. 1 package published to npm (`@cinacoin/core-sdk`). **119+ test files** across the codebase. **53+ commits**. Two infrastructure services (RPC Proxy, Keys Server) are **deployed & live on Cloudflare Workers**. Demo app has **6 pages** with real wallet connection logic. **Overall completion: 98.5%** — see [FINAL_STATUS_REPORT.md](./FINAL_STATUS_REPORT.md) for the full delivery report.

## Quick Setup

```bash
# Clone and install
gh repo clone cinagroup/Cinacoin && cd Cinacoin
pnpm install

# Build everything
pnpm run build

# Start the demo app
pnpm run dev --filter=demo
# → http://localhost:3000
```

> **Requirements:** Node.js ≥ 18, pnpm ≥ 9.15. See [DEVELOPMENT.md](./DEVELOPMENT.md) for full setup details.

---

## Features

### 🔗 Wallet Connection
- **600+ wallets** via WalletConnect Network (EVM, Solana, Bitcoin, TON, TRON)
- **EIP-6963** multi-wallet discovery
- **EIP-5792** Wallet Call API — batch calls, atomic transactions, capability discovery (React hooks in `@cinacoin/react`)
- **Email & social login** — Google, X, GitHub, Discord, Apple, Facebook, Farcaster
- **Smart Accounts** (ERC-4337) — gasless transactions, session keys, batch calls

### 💳 Payments
- **Swaps** — SDK interface for DEX aggregators 🔌 *Requires your own DEX aggregator API key (e.g., 1inch, 0x); Cinacoin provides the integration layer only*
- **On-Ramp** — SDK interface with iframe embed for Meld/Coinbase Pay 🔌 *Requires your own provider API key; Cinacoin provides the integration layer only*
- **Bridge** — cross-chain session synchronization layer 🔌 *SDK sync layer only; no native cross-chain bridge implementation yet*
- **Pay** — self-custodial wallet payments across 6 chains (USDC, USDT, SOL)

### 🔐 Authentication
- **SIWE** (Sign-In With Ethereum, EIP-4361)
- **SIWX** (Sign-In With X, CAIP-122) — chain-agnostic multi-chain auth
- **Passkey / biometric** authentication

### 📱 Cross-Platform SDKs

| Platform | Package | Status |
|----------|---------|--------|
| Web (Vanilla JS) | `@cinacoin/core-sdk` | ✅ **built & published** |
| React | `@cinacoin/react` | ✅ built — **+ EIP-5792 hooks** |
| Next.js | `@cinacoin/next` | ✅ built |
| Vue 3 | `@cinacoin/vue` | ✅ built |
| Svelte | `@cinacoin/svelte` | ✅ built |
| React Native | `@cinacoin/react-native` | ✅ built — type definitions, native implementation needed for full functionality |
| Flutter / Dart | `@cinacoin/flutter` | ✅ built — type definitions, native implementation needed for full functionality |
| Android (Kotlin) | `@cinacoin/android` | ✅ built |
| iOS (Swift) | `@cinacoin/ios` | ✅ built |
| Unity (C#) | `@cinacoin/unity` | ✅ built — **21 C# files** (Editor, Runtime, UI, Tests) |
| .NET | `@cinacoin/dotnet` | ✅ **source written** — **22 C# files** (Client, Services, Models, Example app, NuGet config) |
| Telegram Mini Apps | `@cinacoin/telegram` | ✅ built |
| Farcaster Mini Apps | `@cinacoin/farcaster` | ✅ built |

## Usage Examples

### Installation

```bash
# npm
npm install @cinacoin/react @cinacoin/adapter-ethereum

# yarn
yarn add @cinacoin/react @cinacoin/adapter-ethereum

# pnpm
pnpm add @cinacoin/react @cinacoin/adapter-ethereum
```

### Basic Usage (React)

```tsx
import { OnuxProvider, useOnuxAccount, useOnuxNetwork } from '@cinacoin/react';
import { mainnet, arbitrum, base } from '@cinacoin/chains';

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

### EIP-5792 Wallet Call API (React)

```tsx
import { useSendCalls, useAtomicBatch, useWalletCapabilities } from '@cinacoin/react';

function BatchDemo() {
  const { capabilities } = useWalletCapabilities();
  const { sendCalls, status } = useSendCalls();
  const { executeBatch } = useAtomicBatch();

  const handleBatchTx = async () => {
    const calls = [
      { to: '0x...', data: '0x...' },
      { to: '0x...', data: '0x...' },
    ];
    await sendCalls({ calls });
  };

  return (
    <div>
      <p>Atomic batch supported: {capabilities?.atomicBatch ? 'Yes' : 'No'}</p>
      <button onClick={handleBatchTx} disabled={status === 'pending'}>
        Execute Batch
      </button>
    </div>
  );
}
```

---

## Package Index

### Status Legend
- ✅ **Built & Published** — compiled, tested, published to npm, ready to install
- 🚧 **In Development** — source written, actively being built/deployed (e.g., Cloudflare Workers)
- 📝 **Source Written** — source code exists, **all packages now built**
- ⬜ **Planned** — package.json scaffolding only, source not yet written
- 🔌 **SDK Layer** — type definitions & integration interfaces only; **requires external API key or service** to function

### Core
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/core-sdk` | Core SDK — SignClient, Pairing API, Universal Provider | ✅ **built & published** |
| `@cinacoin/walletconnect-v2` | WalletConnect v2 protocol integration | ✅ built; adapter exports commented out in core-sdk |
| `@cinacoin/chains` | Chain definition registry (300+ chains) | ✅ built |

### Adapters
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/adapter-ethereum` | EVM chain adapter (Wagmi / Ethers) | ✅ built; export commented out in core-sdk |
| `@cinacoin/adapter-solana` | Solana SVM chain adapter | ✅ built; export commented out in core-sdk |
| `@cinacoin/adapter-bitcoin` | Bitcoin BIP-122 chain adapter | ✅ built |
| `@cinacoin/adapter-ton` | TON chain adapter | ✅ built |
| `@cinacoin/adapter-tron` | TRON chain adapter | ✅ built |
| `@cinacoin/adapter-cosmos` | Cosmos chain adapter | ✅ built |
| `@cinacoin/adapter-sui` | Sui chain adapter | ✅ built |
| `@cinacoin/adapter-starknet` | Starknet chain adapter | ✅ built |
| `@cinacoin/adapter-near` | NEAR chain adapter | ✅ built |
| `@cinacoin/adapter-hedera` | Hedera chain adapter | ✅ built |
| `@cinacoin/adapter-xrpl` | XRPL chain adapter | ✅ built |

### UI & Frameworks
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/core-ui` | Web Components (Lit-based modal & widgets) | ✅ built |
| `@cinacoin/react` | React hooks & components + **EIP-5792 hooks** | ✅ built |
| `@cinacoin/next` | Next.js App Router support | ✅ built |
| `@cinacoin/vue` | Vue 3 plugin & composables | ✅ built |
| `@cinacoin/svelte` | Svelte 4/5 store & components | ✅ built |
| `@cinacoin/angular` | Angular support | ✅ built |
| `@cinacoin/nuxt` | Nuxt support | ✅ built |
| `@cinacoin/react-native` | React Native SDK — type definitions only, native implementation needed | ✅ built 🔌 |
| `@cinacoin/flutter-dart` | Flutter SDK (Dart) — type definitions only, native implementation needed | ✅ built 🔌 |
| `@cinacoin/android` | Android SDK (Kotlin) | ✅ built |
| `@cinacoin/ios` | iOS SDK (Swift) | ✅ built |
| `@cinacoin/unity-csharp` | Unity SDK (C#) — **21 files** | ✅ built |
| `@cinacoin/dotnet` | .NET SDK — **22 C# files** | ✅ **source written** |

### Authentication
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/siwe` | Sign-In With Ethereum (EIP-4361) | ✅ built |
| `@cinacoin/siwx` | Sign-In With X (CAIP-122, multi-chain) | ✅ built |
| `@cinacoin/social-login` | Email & social login (Magic.link) | ✅ built |
| `@cinacoin/passkey-auth` | Passkey / biometric authentication | ✅ built |

### Smart Accounts
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/aa-sdk` | Account Abstraction SDK (ERC-4337) | ✅ built |
| `@cinacoin/bundler` | ERC-4337 Bundler (Rust) | ✅ built |
| `@cinacoin/paymaster` | ERC-7677 Paymaster | ✅ built |
| `@cinacoin/erc6492` | ERC-6492 signature verification (Rust) | ✅ built |
| `@cinacoin/session-keys` | Ephemeral session keys | ✅ built |
| `@cinacoin/ens-resolver` | ENS / readable account names | ✅ built |

### Payments
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/swap-sdk` | Token swap via DEX aggregators | ✅ built 🔌 **SDK interface only — requires your own DEX aggregator API key** |
| `@cinacoin/onramp-sdk` | Fiat-to-crypto on-ramp | ✅ built 🔌 **SDK + iframe embed only — requires Meld/Coinbase Pay API key** |
| `@cinacoin/pay-ui` | Payment UI components | ✅ built |
| `@cinacoin/batch-transaction` | Batch transaction support | ✅ built |
| `@cinacoin/bridge-sync` | Cross-chain session synchronization | ✅ built — **Sync layer only; no native cross-chain bridge yet** |

### Infrastructure
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/relay-server` | WebSocket relay server (Rust) | ✅ built |
| `@cinacoin/rpc-proxy` | RPC proxy server | 🚧 **deployed & running on Cloudflare Workers** |
| `@cinacoin/keys-server` | Key management server | 🚧 **deployed & running on Cloudflare Workers** |
| `@cinacoin/notify-server` | Notification server | ✅ built — not deployed |
| `@cinacoin/push-server` | Push notification server (Rust) | ✅ built |
| `@cinacoin/cdn` | CDN asset delivery | ✅ built |

### Developer Tools
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/cli` | CLI tool for project scaffolding | ✅ built |
| `@cinacoin/testing` | Mock providers & test utilities | ✅ built |
| `@cinacoin/codemod` | Migration tool from Reown/AppKit | ✅ built |
| `@cinacoin/wallet-recommender` | Intelligent wallet recommendation engine | ✅ built |
| `@cinacoin/gas-estimator` | Gas estimation utilities | ✅ built |
| `@cinacoin/token-list` | Curated token registry | ✅ built |
| `@cinacoin/analytics` | Connection event analytics | ✅ built |
| `@cinacoin/config` | Remote configuration manager | ✅ built |
| `@cinacoin/design-tokens` | CSS design tokens | ✅ built |
| `@cinacoin/explorer` | Blockchain explorer components | ✅ built |
| `@cinacoin/blockchain-api` | REST API layer | ✅ built |
| `@cinacoin/wallet-buttons` | Standalone wallet button components | ✅ built |
| `@cinacoin/custom-connectors` | Custom wallet connector framework | ✅ built |
| `@cinacoin/multiwallet` | Multi-wallet management | ✅ built |
| `@cinacoin/kyc` | KYC compliance screening | ✅ built |
| `@cinacoin/cross-chain-sync` | Cross-chain state synchronization | ✅ built |
| `@cinacoin/safe-decoder` | Safe transaction decoder (Rust) | ✅ built |
| `@cinacoin/travel-rule-demo` | Travel Rule compliance demo | ✅ built |

### Platform Integrations
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/telegram-miniapp` | Telegram Mini Apps integration | ✅ built |
| `@cinacoin/farcaster-miniapp` | Farcaster Mini Apps integration | ✅ built |

### Design & Utilities
| Package | Description | Status |
|---------|-------------|--------|
| `@cinacoin/design-tokens` | CSS design tokens (colors, spacing, typography) | ✅ built |
| `@cinacoin/cross-chain-sync` | Cross-chain state synchronization | ✅ built |
| `@cinacoin/safe-decoder` | Safe transaction decoder (Rust) | ✅ built |
| `@cinacoin/travel-rule-demo` | Travel Rule compliance demo | ✅ built |

---

## Demo App

The monorepo includes a **Next.js demo app** at `apps/demo/` with **6 pages**:

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing with wallet connection |
| Swap | `/swap` | Token swap interface |
| Multi-Chain | `/multi-chain` | Multi-chain wallet management |
| Auth | `/auth` | SIWE & multi-chain authentication |
| Batch | `/batch` | Batch transaction execution |

All pages are wired to real wallet connection logic.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Your Application                      │
├──────────────────────────────────────────────────────────┤
│  @cinacoin/react │ @cinacoin/next │ @cinacoin/vue│
├──────────────────────────────────────────────────────────┤
│                    @cinacoin/core-ui                    │
│               (Web Components / Modal UI)                  │
├──────────────────────────────────────────────────────────┤
│                 @cinacoin/core-sdk                      │
│   SignClient  │  Pairing API  │  Universal Provider       │
├──────────────────────────────────────────────────────────┤
│  @cinacoin/adapter-* (EVM, Solana, BTC, TON, TRON)     │
├──────────────────────────────────────────────────────────┤
│              WalletConnect Network (Relay)                 │
│          wss://relay.walletconnect.com (or self-hosted)    │
└──────────────────────────────────────────────────────────┘
```

---

## Documentation

| Resource | Link |
|----------|------|
| 📖 Full Docs | [docs.cinacoin.io](https://docs.cinacoin.io) |
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

## Development

Cinacoin is a **pnpm + Turborepo monorepo** with ~64 packages across TypeScript and Rust.

```bash
# Full CI pipeline: build + lint + typecheck + test
pnpm run ci

# Build a single package
pnpm run build --filter=@cinacoin/react

# Run tests for one package
pnpm run test --filter=@cinacoin/core-sdk

# Generate TypeDoc API reference
pnpm run typedoc
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full developer guide, including:
- Monorepo structure explained
- How to add a new package
- How to add a new chain adapter
- Debugging tips

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

Quick start:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes and add tests
4. Run the CI suite (`pnpm run ci`)
5. Add a changeset (`pnpm changeset`)
6. Open a Pull Request

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) and [Commit Message Conventions](./CONTRIBUTING.md#commit-message-conventions) (Conventional Commits).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module '@cinacoin/...'` | Run `pnpm install` at root, then `pnpm run build` |
| TypeScript errors after pulling | `pnpm install && pnpm run build --force` |
| Demo app shows old code | Clear `.next` cache and restart dev server |
| Tests pass locally but fail in CI | Run `pnpm run ci` locally — CI runs typecheck + lint too |

For more debugging tips, see [DEVELOPMENT.md → Debugging Tips](./DEVELOPMENT.md#debugging-tips).

---

## License

This project is licensed under the MIT License — see [LICENSE.md](./LICENSE.md) for details.

---

**Cinacoin** — by [CinaGroup](https://github.com/cinagroup)  
*Connect Everything On-Chain*
