# 🎉 Cinacoin v1.0.0 — Connect Everything On-Chain

**Cinacoin** is an open-source, all-in-one SDK for building seamless on-chain experiences. This is our **first stable release** — a fully self-hosted, white-label Web3 toolkit providing wallet connections, multi-chain authentication, payments, smart accounts, and developer tools across web, mobile, and game engines.

---

## What's New

Cinacoin v1.0.0 represents the culmination of extensive development, delivering a **complete alternative to Reown AppKit** with no licensing restrictions, no MAU caps, and full infrastructure autonomy.

### ✨ Key Features

- **🔗 600+ Wallets** — Connect via WalletConnect Network (EVM, Solana, Bitcoin, TON, TRON)
- **🌐 7 Chain Adapters** — Bitcoin, Cosmos, Hedera, NEAR, Starknet, Sui, XRPL (+ EVM)
- **📱 10+ Platform SDKs** — React, Vue, Svelte, Angular, Next.js, Nuxt, React Native, iOS, Android, Flutter, Unity, .NET
- **🔐 Real Cryptography** — X25519 key exchange + ChaCha20-Poly1305 AEAD (no placeholders)
- **💳 Payments** — Swaps, On-Ramp, Pay across 6 chains (USDC, USDT, SOL)
- **🔑 Smart Accounts** — ERC-4337 Account Abstraction with gasless transactions and session keys
- **🌍 i18n** — Full internationalization support
- **🤖 EIP-5792** — Wallet Call API with batch calls, atomic transactions, capability discovery
- **📡 Self-Hosted Infrastructure** — Relay Server + RPC Proxy deployable on Cloudflare Workers

### 📦 Package Count

| Category | Packages |
|----------|----------|
| Core & Infrastructure | 7 |
| Framework SDKs | 8 |
| Mobile & Game Engines | 5 |
| Chain Adapters | 8 |
| UI & Theme | 6 |
| Payments & DeFi | 6 |
| Authentication & Security | 6 |
| Advanced Features | 8 |
| Platform Integrations | 4 |
| Utilities & Services | 14 |
| **Total** | **72** |

### 📊 Project Stats

- **72 packages** published to npm
- **104+ test files**
- **2,519+ source files**
- **~259,000 lines of code**
- **53+ commits**
- **MIT License**

### 🔧 Technology Stack

- **TypeScript** + Vite + Turbo (monorepo)
- **Rust** for Relay Server (Actix-web)
- **Swift / Kotlin / Dart / C#** for mobile & game SDKs
- **Zustand** for state management
- **viem / wagmi** for EVM interaction
- **@noble/curves** + **@noble/ciphers** for cryptography
- **Cloudflare Workers** for deployment

---

## Getting Started

```bash
# Install with npm
npm install @cinacoin/react @cinacoin/adapter-ethereum

# Or pnpm
pnpm add @cinacoin/react @cinacoin/adapter-ethereum

# Or yarn
yarn add @cinacoin/react @cinacoin/adapter-ethereum
```

### Quick Example

```tsx
import { CinacoinProvider, useCinacoin } from '@cinacoin/react'
import { EthereumAdapter } from '@cinacoin/adapter-ethereum'

function App() {
  return (
    <CinacoinProvider adapters={[new EthereumAdapter()]}>
      <YourApp />
    </CinacoinProvider>
  )
}

function ConnectButton() {
  const { connect, account } = useCinacoin()
  return (
    <button onClick={() => connect()}>
      {account ? `Connected: ${account.address}` : 'Connect Wallet'}
    </button>
  )
}
```

---

## Migration from Reown AppKit

See our [migration guide](https://cinacoin.dev/docs/migration/from-appkit) for step-by-step instructions. Key differences:

| Feature | Reown AppKit | Cinacoin |
|---------|-------------|-------------|
| License | Community License (MAU cap) | **MIT** (no restrictions) |
| Infrastructure | Mandatory Reown Relay | **Self-hosted** (your relay) |
| MAU Limit | 500 | **Unlimited** |
| RPC Calls | 2.5M/month | **Unlimited** |
| IP Ownership | Reown owns modifications | **You own everything** |

---

## Breaking Changes from v0.x

v1.0.0 is the first stable release. If you've been using v0.1.x or v0.2.x, review the [migration guide](https://cinacoin.dev/docs/migration/v0-to-v1).

Key changes:
- All public APIs are now frozen — no breaking changes until v2.0.0
- Cryptographic implementations upgraded to production-ready noble libraries
- Core SDK `encrypt()`/`decrypt()` are now synchronous

---

## Documentation

- 📖 [Getting Started](https://cinacoin.dev/docs)
- 🔌 [API Reference](https://cinacoin.dev/api)
- 📱 [Mobile SDKs](https://cinacoin.dev/docs/mobile)
- 🏗️ [Architecture](https://cinacoin.dev/docs/architecture)
- 🔒 [Security](https://cinacoin.dev/docs/security)
- 🚀 [Deployment](https://cinacoin.dev/docs/deployment)

---

## Full Changelog

See [CHANGELOG.md](https://github.com/cinacoin/cinacoin/blob/main/CHANGELOG.md) for detailed changes.

---

## Contributors

Built by the Cinacoin team. Special thanks to 十三先生 (Mr. Thirteen) for project vision and architecture.

---

**License:** MIT  
**Repository:** https://github.com/cinacoin/cinacoin
