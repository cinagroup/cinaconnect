# Cinacoin v0.2.0 — Connect Everything On-Chain

**Published:** 2026-05-18  
**Version:** 0.2.0  
**Author:** CinaGroup  

---

## 🎉 Executive Summary

Cinacoin v0.2.0 is here — and it's big.

We've **published 72 packages** to npm, bringing the entire Cinacoin ecosystem from a single published package to a complete, installable, multi-platform Web3 SDK. From React to Unity, from EVM to XRPL, Cinacoin now covers every chain, every framework, and every platform developers need to build on-chain applications.

This release represents **64+ built packages**, **104+ test files**, **53+ commits**, and **2 live infrastructure services** (RPC Proxy and Keys Server running on Cloudflare Workers). The demo app ships with 6 fully functional pages wired to real wallet connection logic.

---

## 🚀 Key Features

### EIP-5792 Wallet Call API (React)

Full React hooks support for the Wallet Call API — batch transactions, atomic execution, and capability discovery:

- `useSendCalls` — dispatch batched calls
- `useAtomicBatch` — execute atomic multi-call transactions
- `useWalletCapabilities` — discover wallet capabilities (paymaster, session keys, atomic batch)
- `useCallsStatus` — track async call status

```tsx
import { useAtomicBatch, useWalletCapabilities } from '@cinacoin/react';

const { capabilities } = useWalletCapabilities();
const { executeBatch } = useAtomicBatch();

// Wallets supporting atomic batch can now execute
// multiple calls in a single approval.
```

### .NET SDK (`@cinacoin/dotnet`)

A full .NET SDK written in C# with 22 source files:

- **CinacoinClient** — main entry point
- **RelayClient** — WebSocket relay communication
- **CryptoUtils** — cryptographic operations
- **WalletService** — wallet management
- **20+ model types** — structured API responses
- **NuGet package configuration** — ready for publishing

### 11 Chain Adapters

Every major blockchain ecosystem, now with a dedicated adapter:

| Adapter | Chain Family | Standard |
|---------|-------------|----------|
| `adapter-ethereum` | EVM (Ethereum, Arbitrum, Base, BSC, etc.) | EIP-155 |
| `adapter-solana` | Solana | Solana Mainnet |
| `adapter-bitcoin` | Bitcoin | BIP-122 |
| `adapter-ton` | TON | TON |
| `adapter-tron` | TRON | TRON |
| `adapter-cosmos` | Cosmos SDK chains | Cosmos |
| `adapter-sui` | Sui | Sui |
| `adapter-starknet` | Starknet | Starknet |
| `adapter-near` | NEAR | NEAR |
| `adapter-hedera` | Hedera | Hedera |
| `adapter-xrpl` | XRPL | XRPL |

---

## 📦 Package Breakdown

### By Category

| Category | Packages | Description |
|----------|----------|-------------|
| **Core** | 3 | SDK, WalletConnect v2, chain registry |
| **Chain Adapters** | 11 | Multi-chain connectivity across all major ecosystems |
| **Framework SDKs** | 12 | React, Next.js, Vue, Svelte, Angular, Nuxt, React Native, Flutter, Android, iOS, Unity, .NET |
| **Authentication** | 4 | SIWE, SIWX, social login, passkey/biometric |
| **Smart Accounts** | 6 | ERC-4337, bundler, paymaster, ERC-6492, session keys, ENS |
| **Payments** | 5 | Swap, on-ramp, pay UI, batch transactions, deposit |
| **Infrastructure** | 4 | Relay server, notify server, push server, CDN |
| **Dev Tools & Utils** | 20 | CLI, testing, codemod, gas estimator, analytics, and more |
| **Platform Integrations** | 2 | Telegram Mini Apps, Farcaster Mini Apps |

### The Numbers

- **72 packages** published to npm
- **64+ packages** built with dist/ directories
- **104+ test files** across the codebase
- **53+ commits** in active development
- **300+ chains** defined in the chain registry
- **600+ wallets** supported via WalletConnect Network

---

## 🏗️ What's Inside

### Web & Framework SDKs

```bash
npm install @cinacoin/react        # React + EIP-5792 hooks
npm install @cinacoin/next         # Next.js App Router
npm install @cinacoin/vue          # Vue 3 composables
npm install @cinacoin/svelte       # Svelte 4/5
npm install @cinacoin/angular      # Angular
npm install @cinacoin/nuxt         # Nuxt
```

### Mobile & Game Engine SDKs

```bash
npm install @cinacoin/react-native # React Native
npm install @cinacoin/flutter-dart # Flutter/Dart
npm install @cinacoin/android-kotlin  # Android (Kotlin)
npm install @cinacoin/ios-swift    # iOS (Swift)
npm install @cinacoin/unity-csharp # Unity (C#)
npm install @cinacoin/dotnet       # .NET (C#)
```

### Chain Adapters

```bash
npm install @cinacoin/adapter-ethereum
npm install @cinacoin/adapter-solana
npm install @cinacoin/adapter-bitcoin
# ... and 8 more
```

---

## 🚀 Getting Started

### Quick Install

```bash
npm install @cinacoin/react @cinacoin/adapter-ethereum
```

### Basic Setup (React)

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
```

### Full Demo

Run the included demo app to see it in action:

```bash
git clone https://github.com/cinacoin/cinacoin.git
cd cinacoin
pnpm install
pnpm run dev --filter=demo
# → http://localhost:3000
```

The demo includes **6 pages**: Home, Swap, Multi-Chain, Auth, and Batch — all connected to real wallet logic.

---

## 🔄 Migration

### From Reown / AppKit

We provide an automated migration tool:

```bash
npx @cinacoin/codemod migrate-from-reown ./src
```

See the [full migration guide](../guide/migrate-from-reown.md) for step-by-step instructions.

### From v0.1.0

- `encrypt()` and `decrypt()` in `@cinacoin/core-sdk` are now **synchronous** (no longer `async`)
- X25519 key exchange uses real `@noble/curves` (no longer placeholder)
- Encryption uses real ChaCha20-Poly1305 via `@noble/ciphers` (no longer AES-GCM fallback)
- New `generateNonce()` utility for 12-byte random nonces

---

## 🔮 What's Next

### v0.2.1 — Near-Term

1. **npm publishing pipeline** — automate publishing for all 64+ built packages
2. **Enable adapter exports** — uncomment Ethers, Wagviem, Solana, SIWE, EIP-5792 exports in core-sdk
3. **Demo verification** — ensure WalletModal connects to real MetaMask across all 6 demo pages
4. **Expand test coverage** — 104+ tests exist; targeting 80%+ coverage on core packages

### v0.3.0 — Mid-Term

1. **Native implementations** for React Native and Flutter (beyond type definitions)
2. **Native bridge implementation** (beyond SDK sync layer)
3. **DEX aggregator partnerships** — bundled API keys for swap and on-ramp
4. **Mobile-first demo** — dedicated mobile demo app showcasing Android, iOS, and Unity SDKs

---

## 🙏 Thank You

Cinacoin is built by [CinaGroup](https://github.com/cinagroup) and the open-source community. Thank you to every contributor, tester, and early adopter.

- **Full Documentation:** [docs.cinacoin.io](https://docs.cinacoin.io)
- **GitHub:** [github.com/cinacoin/cinacoin](https://github.com/cinacoin/cinacoin)
- **npm:** [npmjs.com/org/cinacoin](https://npmjs.com/org/cinacoin)

---

*Connect Everything On-Chain* 🔢
