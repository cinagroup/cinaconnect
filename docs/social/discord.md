# Discord Announcement — Cinacoin v0.2.0

---

## 🔔 Cinacoin v0.2.0 is LIVE!

Hey everyone! We just shipped **Cinacoin v0.2.0** with **72 packages on npm**. Here's the TL;DR:

### 🎯 What's New

**EIP-5792 Wallet Call API** — React hooks for batch & atomic transactions:
- `useAtomicBatch` — one approval, multiple calls
- `useSendCalls` — dispatch batched calls
- `useWalletCapabilities` — discover what your wallet supports
- `useCallsStatus` — track async call status

**.NET SDK** — Full C# implementation with 22 source files, ready for NuGet.

**11 Chain Adapters** — EVM, Solana, Bitcoin, TON, TRON, Cosmos, Sui, Starknet, NEAR, Hedera, XRPL. One API, every chain.

### 📊 The Numbers

| | Count |
|--|-------|
| Packages on npm | **72** |
| Packages built (dist/) | **64+** |
| Test files | **104+** |
| Chain definitions | **300+** |
| Supported wallets | **600+** |
| Demo app pages | **6** |

### 🚀 Try It

```bash
npm install @cinacoin/react @cinacoin/adapter-ethereum
```

### 📱 Platform SDKs

Web: React, Next.js, Vue, Svelte, Angular, Nuxt
Mobile: React Native, Flutter, Android, iOS
Games: Unity (C#), .NET (C#)
Social: Telegram Mini Apps, Farcaster Mini Apps

### 🔧 Coming from Reown/AppKit?

```bash
npx @cinacoin/codemod migrate-from-reown ./src
```

### 📖 Links

- **Docs:** docs.cinacoin.io
- **GitHub:** github.com/cinacoin/cinacoin
- **npm:** npmjs.com/org/cinacoin
- **Migration Guide:** [Migrate from Reown](../../docs/guide/migrate-from-reown.md)

### 🗺️ What's Next

- npm publishing pipeline for all 64+ built packages
- Enable adapter exports in core-sdk
- Native implementations for React Native & Flutter
- Native cross-chain bridge
- Expanded test coverage

---

Drop your questions below! We're here to help you build. 🔢
