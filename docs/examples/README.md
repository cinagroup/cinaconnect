# Cinacoin Examples

Complete, copy-paste runnable examples for every major use case.

## Quick Start

| Example | What It Covers |
|---------|---------------|
| [Ethereum](./ethereum.md) | MetaMask, WalletConnect, Coinbase Wallet connection |
| [Solana](./solana.md) | Phantom, Solflare wallet connection |
| [Bitcoin](./bitcoin.md) | Unisat, Xverse, Leather, OKX wallet connection |
| [Multi-Chain](./multi-chain.md) | Switching between EVM, Solana, Bitcoin chains |
| [SIWE Auth](./siwe-auth.md) | Sign-In With Ethereum (EIP-4361) |
| [EIP-5792 Batch](./eip5792-batch.md) | Atomic batch transactions via Wallet Call API |
| [React Integration](./react-integration.md) | Hooks, ConnectButton, ConnectModal |
| [Next.js](./nextjs.md) | App Router + Server Components |
| [.NET SDK](./dotnet.md) | C# client usage |

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x / **pnpm** ≥ 8.x
- A **Project ID** from your Cinacoin dashboard

## Project Structure

```
docs/examples/
├── README.md              ← You are here
├── ethereum.md            ← Full EVM wallet connection
├── solana.md              ← Solana wallet connection
├── bitcoin.md             ← Bitcoin wallet connection
├── multi-chain.md         ← Multi-chain switching
├── siwe-auth.md           ← SIWE authentication
├── eip5792-batch.md       ← Atomic batch transactions
├── react-integration.md   ← React hooks deep-dive
├── nextjs.md              ← Next.js App Router
└── dotnet.md              ← .NET / C# SDK
```

## All Packages

The full Cinacoin SDK is published as scoped `@cinacoin/*` packages. Install only what you need:

```bash
# Core (always required)
npm install @cinacoin/core-sdk

# React bindings
npm install @cinacoin/react

# SIWE authentication
npm install @cinacoin/siwe

# Batch transactions (EIP-5792)
npm install @cinacoin/batch-transaction

# Bitcoin adapter
npm install @cinacoin/adapter-bitcoin

# .NET (NuGet)
dotnet add package Cinacoin
```

## Related Docs

- [Quick Start Guide](../guide/quick-start.md)
- [Installation Guide](../guide/installation.md)
- [Configuration Reference](../guide/configuration.md)
- [API Reference](../api/)
