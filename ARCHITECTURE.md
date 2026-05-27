# Architecture — Cinacoin

> **Last Updated:** 2026-05-27  
> **Monorepo:** pnpm + Turborepo · 75 packages · 3 apps · 321 test files  
> **Runtime:** Node.js ≥ 18 · TypeScript 5.7 · Vite · Next.js 15

---

## 1. System Overview

Cinacoin is a **self-hosted, open-source Web3 SDK** — a full replacement for Reown AppKit (formerly WalletConnect/Web3Modal). It provides wallet connections, multi-chain authentication, payments, smart accounts, and developer tools across web, mobile, and game engines.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Developer dApp                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │Connect   │ │ Wallet   │ │ Chain    │ │ Payment  │  Your App UI    │
│  │Modal     │ │List      │ │Switcher  │ │Widgets   │                  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘                │
├─────┴──────────────┴────────────┴──────────────┴─────────────────────┤
│                     Framework SDK Layer                              │
│  @cinacoin/react │ @cinacoin/next │ @cinacoin/vue │ @cinacoin/svelte│
│  @cinacoin/angular │ @cinacoin/nuxt │ @cinacoin/react-native         │
├──────────────────────────────────────────────────────────────────────┤
│                     Core SDK Layer                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  @cinacoin/core-sdk                                           │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐│   │
│  │  │SignClient│ │Pairing   │ │Universal  │ │ Connector System ││   │
│  │  │          │ │API       │ │Provider   │ │ (Event-driven)   ││   │
│  │  └─────────┘ └──────────┘ └──────────┘ └───────────────────┘│   │
│  └──────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────┤
│                     Chain Adapter Layer                              │
│  adapter-bitcoin │ adapter-solana │ adapter-ethereum (commented)    │
│  adapter-ton │ adapter-tron │ adapter-cosmos │ adapter-sui          │
│  adapter-starknet │ adapter-near │ adapter-hedera │ adapter-xrpl    │
├──────────────────────────────────────────────────────────────────────┤
│                     Infrastructure Layer                             │
│  ┌────────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐    │
│  │ RPC Proxy  │ │Keys Server│ │Relay Server│ │ Notify/Push   │    │
│  │(CF Worker) │ │(CF+D1/KV) │ │(CF Worker) │ │ (CF Workers)  │    │
│  └─────┬──────┘ └─────┬─────┘ └─────┬──────┘ └──────┬────────┘    │
├───────┴──────────────┴──────────────┴───────────────┴──────────────┤
│                     External Services                               │
│  Blockchain Nodes │ WalletConnect Network │ DEX APIs │ On-Ramp APIs│
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
cinacoin/                          # Root: pnpm workspace
├── package.json                   # Turborepo orchestration
├── pnpm-workspace.yaml            # Workspace definitions
├── turbo.json                     # Task pipeline config
├── tsconfig.json                  # Shared TypeScript config
├── vitest.workspace.ts            # Test workspace config
│
├── apps/                          # Deployable applications (3)
│   ├── demo/                      # Next.js demo app (6 pages)
│   ├── demo-react/                # React demo app
│   ├── backend-dashboard/          # Admin dashboard (Next.js + CF)
│   └── health-status/             # Health monitoring app (Next.js + CF)
│
├── packages/                      # Libraries and services (75)
│   │
│   ├── core-sdk/                  # Core SDK — wallet connections
│   ├── walletconnect-v2/          # WC v2 protocol integration
│   ├── core-ui/                   # Web Components (Lit-based)
│   │
│   │── adapters/ (11)
│   │   ├── adapter-bitcoin/       # Bitcoin BIP-122
│   │   ├── adapter-cosmos/        # Cosmos SDK chains
│   │   ├── adapter-hedera/        # Hedera Hashgraph
│   │   ├── adapter-near/          # NEAR Protocol
│   │   ├── adapter-starknet/      # Starknet L2
│   │   ├── adapter-sui/           # Sui Network
│   │   ├── adapter-xrpl/          # XRP Ledger
│   │   ├── adapter-ethereum/      # EVM (commented exports)
│   │   ├── adapter-solana/        # Solana SVM (commented)
│   │   ├── adapter-ton/           # TON
│   │   └── adapter-tron/          # TRON
│   │
│   │── framework-sdks/ (8)
│   │   ├── react/                 # React hooks + EIP-5792
│   │   ├── next/                  # Next.js App Router support
│   │   ├── vue/                   # Vue 3 composables
│   │   ├── svelte/                # Svelte 4/5 store & components
│   │   ├── angular/               # Angular integration
│   │   ├── nuxt/                  # Nuxt support
│   │   ├── react-native/          # React Native (types first)
│   │   └── testing/               # Mock providers & test utilities
│   │
│   │── mobile-game/ (5)
│   │   ├── android-kotlin/        # Android SDK (Kotlin)
│   │   ├── ios-swift/             # iOS SDK (Swift)
│   │   ├── flutter-dart/          # Flutter/Dart SDK
│   │   ├── unity-csharp/          # Unity (21 C# files)
│   │   └── dotnet/                # .NET (22 C# files, source complete)
│   │
│   │── auth/ (6)
│   │   ├── siwe/                  # Sign-In With Ethereum
│   │   ├── siwx/                  # Sign-In With X (CAIP-122)
│   │   ├── social-login/          # OAuth social login
│   │   ├── passkey-auth/          # Passkey / biometric
│   │   ├── embedded-wallet/       # Embedded wallet management
│   │   └── session-keys/          # Ephemeral session keys
│   │
│   │── smart-accounts/ (6)
│   │   ├── aa-sdk/                # Account Abstraction (ERC-4337)
│   │   ├── bundler/               # ERC-4337 Bundler (Rust)
│   │   ├── paymaster/             # ERC-7677 Paymaster (Rust)
│   │   ├── erc6492/               # ERC-6492 signature verification
│   │   ├── ens-resolver/          # ENS / readable names
│   │   └── safe-decoder/          # Safe transaction decoder (Rust)
│   │
│   │── payments/ (7)
│   │   ├── swap-sdk/              # DEX swap SDK 🔌
│   │   ├── onramp-sdk/            # Fiat-to-crypto on-ramp 🔌
│   │   ├── pay-ui/                # Payment UI components
│   │   ├── payment-flow/          # Payment orchestration
│   │   ├── deposit/               # Deposit management
│   │   ├── gas-estimator/         # Gas price estimation
│   │   ├── gas-sponsorship/       # ERC-4337 gas sponsorship
│   │   └── batch-transaction/     # Batch transaction builder
│   │
│   │── infrastructure/ (6)
│   │   ├── relay-server/          # WebSocket relay (Rust + CF Worker)
│   │   ├── rpc-proxy/             # RPC proxy (CF Worker)
│   │   ├── keys-server/           # Key management (CF Worker + D1)
│   │   ├── notify-server/         # Notification server (CF Worker)
│   │   ├── push-server/           # Push notification server
│   │   └── tx-indexer/            # Transaction indexer
│   │
│   │── advanced/ (8)
│   │   ├── cross-chain-sync/      # Cross-chain session sync
│   │   ├── multiwallet/           # Multi-wallet management
│   │   ├── wallet-recovery/       # Wallet recovery utilities
│   │   ├── wallet-recommender/    # Wallet recommendation engine
│   │   ├── blockchain-api/        # REST API layer
│   │   ├── explorer/              # Block explorer components
│   │   ├── kyc/                   # KYC compliance screening
│   │   └── travel-rule-demo/      # Travel Rule compliance demo
│   │
│   │── platform/ (4)
│   │   ├── telegram-miniapp/      # Telegram Mini Apps
│   │   ├── farcaster-miniapp/     # Farcaster Mini Apps
│   │   ├── wallet-buttons/        # Standalone wallet buttons
│   │   └── custom-connectors/     # Custom connector framework
│   │
│   │── devtools/ (8)
│   │   ├── cli/                   # CLI scaffolding tool
│   │   ├── codemod/               # Migration from Reown/AppKit
│   │   ├── analytics/             # Connection event analytics
│   │   ├── analytics-server/      # Analytics backend
│   │   ├── config/                # Shared config & types + CSRF
│   │   ├── token-list/            # Curated token registry
│   │   ├── cdn/                   # CDN asset delivery
│   │   └── design-tokens/         # CSS design tokens
│   │
│   │── utilities/ (2)
│   │   ├── performance-utils/     # Performance monitoring
│   │   └── i18n/                  # Internationalization
│   │   └── cinacoin-i18n/         # Branded i18n
│   │   └── ui-theme/              # Theme system
│   │   └── cinacoin-ui-theme/     # Branded UI theme
│
├── e2e/                           # End-to-end tests
│   ├── tests/                     # 6 spec suites
│   ├── maestro/                   # Mobile E2E (Maestro)
│   ├── playwright.config.ts       # Playwright config
│   └── cypress.config.ts          # Cypress config
│
├── cloudflare/                    # Cloudflare infrastructure configs
├── deploy/                        # Docker deployment configs
├── .github/workflows/             # CI/CD (17 workflows)
│   ├── ci.yml                     # Build + lint + test + typecheck
│   ├── security-scan.yml          # Weekly npm audit
│   ├── deploy-cloudflare.yml      # CF Workers deployment
│   └── ...                        # (14 more workflows)
│
├── docs/                          # Documentation (VitePress)
├── docs-site/                     # Static docs site
│
├── docker-compose.yml             # Docker Compose (6 services)
├── Dockerfile                     # Root Dockerfile
├── deploy-cloudflare.sh           # Cloudflare deployment script
│
└── scripts/                       # Build & publish scripts
```

---

## 3. Cloudflare Workers Architecture

### 3.1 Worker Deployment

Cinacoin deploys **4 Cloudflare Workers** leveraging Cloudflare's serverless edge:

```
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Edge (300+ PoPs)                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  RPC Proxy Worker                                            │ │
│  │  Endpoint: rpc-proxy.cinacoin.workers.dev                    │ │
│  │  Bindings: KV (cache)                                        │ │
│  │  Purpose: Cache + proxy JSON-RPC to blockchain nodes         │ │
│  │  Security: API Key auth, write-method block, CORS, headers   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Keys Server Worker                                          │ │
│  │  Endpoint: keys-server.cinacoin.workers.dev                  │ │
│  │  Bindings: D1 (SQLite), KV (sessions)                        │ │
│  │  Purpose: Keypair management, session creation/validation    │ │
│  │  Security: API Key auth, CORS, session expiry, CSRF          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Relay Server Worker                                         │ │
│  │  Endpoint: relay-server.cinacoin.workers.dev                 │ │
│  │  Bindings: KV (message routing)                              │ │
│  │  Purpose: WebSocket message relay for wallet connections     │ │
│  │  Security: API Key auth, CORS, input validation              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Notify Server Worker                                        │ │
│  │  Endpoint: notify-server.cinacoin.workers.dev                │ │
│  │  Bindings: D1 (subscriptions)                                │ │
│  │  Purpose: Push notification routing                          │ │
│  │  Security: API Key auth, input validation, CSRF              │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Worker Data Flow

```
Client App
    │
    ├──► RPC Proxy ──► KV Cache (read hit) ──► return cached
    │       │
    │       └──► Blockchain Node (cache miss) ──► cache ──► return
    │
    ├──► Keys Server ──► D1 (keypair storage)
    │       │
    │       └──► KV (session storage)
    │
    ├──► Relay Server ──► KV (message queue)
    │       │
    │       └──► WebSocket ↔ Client pairing
    │
    └──► Notify Server ──► D1 (subscription DB)
            │
            └──► Push notification delivery
```

### 3.3 Worker Security Stack

Every worker applies these middleware layers in order:

```
Request → CORS check → API Key auth → CSRF token → Size limit → JSON parse → Validation → Handler
```

---

## 4. Data Flow: Key Features

### 4.1 Wallet Connection Flow

```
┌──────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  User     │     │  @cinacoin/core-ui  │     │  @cinacoin/core-sdk  │
│  clicks   │────►│  Connect Button     │────►│  SignClient          │
│  "Connect"│     │  (Web Components)   │     │                      │
└──────────┘     └─────────────────────┘     └──────────┬───────────┘
                                                        │
                              ┌─────────────────────────┤
                              │                         │
                    ┌─────────▼──────────┐   ┌──────────▼──────────┐
                    │  EIP-6963          │   │  WalletConnect v2    │
                    │  Multi-Injected    │   │  Pairing Protocol     │
                    │  Provider Discovery│   │  X25519 + ChaCha20    │
                    └─────────┬──────────┘   └──────────┬──────────┘
                              │                         │
                    ┌─────────▼──────────┐   ┌──────────▼──────────┐
                    │  Injected Wallet   │   │  Relay Server (CF)   │
                    │  (MetaMask, etc.)  │   │  WebSocket ↔ Wallet  │
                    └─────────┬──────────┘   └──────────┬──────────┘
                              │                         │
                              └────────────┬────────────┘
                                           │
                                 ┌─────────▼──────────┐
                                 │  Adapter Layer      │
                                 │  (chain-specific)   │
                                 └─────────┬──────────┘
                                           │
                                 ┌─────────▼──────────┐
                                 │  Connected!         │
                                 │  { address, chain } │
                                 └────────────────────┘
```

### 4.2 Relay Communication Flow

```
dApp Frontend                           Self-Hosted Relay
┌──────────────┐                        ┌──────────────────────┐
│              │                        │                      │
│  SignClient  │─── pair({ uri }) ─────►│  Relay Server        │
│              │                        │  (Cloudflare Worker)  │
│              │◄── pairing_created ────│                      │
│              │                        │                      │
│  Connector   │─── request() ─────────►│  JSON-RPC over WS    │
│              │                        │                      │
│              │◄── response ───────────│  ┌────────────────┐  │
│              │                        │  │ Durable Object │  │
│              │                        │  │ (WebSocket mgmt│  │
│              │                        │  │  per session)  │  │
│              │                        │  └────────────────┘  │
│              │                        │                      │
│              │                        │  ┌────────────────┐  │
│              │                        │  │ KV Storage     │  │
│              │                        │  │ (message queue)│  │
│              │                        │  └────────────────┘  │
│              │                        │                      │
└──────────────┘                        └──────────────────────┘
```

### 4.3 Smart Account (ERC-4337) Flow

```
┌──────────────────┐
│  User Action     │  (approve + transfer in one click)
└────────┬─────────┘
         │
┌────────▼─────────┐
│  @cinacoin/react │  useSendCalls() / useAtomicBatch()
└────────┬─────────┘
         │
┌────────▼─────────┐
│  @cinacoin/aa-sdk│  UserOperation builder
└────────┬─────────┘
         │
┌────────▼─────────┐     ┌──────────────────┐
│  @cinacoin/      │────►│  Bundler         │
│  bundler (Rust)  │     │  (Cloudflare)    │
└────────┬─────────┘     └──────────────────┘
         │
┌────────▼─────────┐     ┌──────────────────┐
│  @cinacoin/      │◄────│  Paymaster       │
│  paymaster(Rust) │     │  (gas sponsorship│
└────────┬─────────┘     │   if configured)  │
         │               └──────────────────┘
┌────────▼─────────┐
│  EntryPoint      │
│  Contract (L2)   │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Transaction     │
│  Executed        │
└──────────────────┘
```

### 4.4 Authentication (SIWE/SIWX) Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  User    │    │  Frontend    │    │  Backend / Server│    │  Blockchain  │
│          │    │  (dApp)      │    │  (Your API)      │    │  Node        │
└────┬─────┘    └──────┬───────┘    └────────┬─────────┘    └──────┬───────┘
     │                 │                      │                    │
     │  Click "Sign In"│                      │                    │
     ├────────────────►│                      │                    │
     │                 │  Generate SIWE msg    │                    │
     │                 │  (@cinacoin/siwe)     │                    │
     │                 │                      │                    │
     │  Sign message   │                      │                    │
     │◄────────────────┤                      │                    │
     │                 │                      │                    │
     │  Sign & return  │                      │                    │
     ├────────────────►│                      │                    │
     │                 │  Send sig + message   │                    │
     │                 ├─────────────────────►│                    │
     │                 │                      │  Verify signature  │
     │                 │                      ├───────────────────►│
     │                 │                      │◄───────────────────┤
     │                 │                      │  Signature valid   │
     │                 │  Session created      │                    │
     │                 │◄─────────────────────┤                    │
     │  Logged in!     │                      │                    │
     │◄────────────────┤                      │                    │
     │                 │                      │                    │
```

---

## 5. Deployment Architecture

### 5.1 Docker Compose (Self-Hosted)

```
┌──────────────────────────────────────────────────────────────────┐
│                       Docker Compose                               │
│                                                                    │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Demo App  │  │  Relay   │  │ RPC      │  │  Keys Server │   │
│  │  Next.js   │  │  Server  │  │ Proxy    │  │  (PostgreSQL)│   │
│  │  :3000     │  │  (Rust)  │  │  (Go)    │  │  :3001       │   │
│  │  :5555     │  │  :5555   │  │  :8545   │  │              │   │
│  └─────┬──────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│        │              │              │               │            │
│  ┌─────▼──────────────▼──────────────▼───────────────▼───────┐   │
│  │                     Shared Services                        │   │
│  │  ┌──────────────┐         ┌──────────────┐               │   │
│  │  │  Redis       │         │  PostgreSQL   │               │   │
│  │  │  :6379       │         │  :5432        │               │   │
│  │  └──────────────┘         └──────────────┘               │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                    │
│  6 services · 6 health checks · restart: unless-stopped          │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Cloudflare Deployment (Serverless)

```
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Platform                        │
│                                                              │
│  ┌────────────┬───────────────┬──────────────────────────┐  │
│  │  Pages     │  Workers      │  Storage                  │  │
│  │            │               │                           │  │
│  │  • Demo    │  • RPC Proxy  │  • D1 (SQLite)            │  │
│  │  • Docs    │  • Keys Server│    → Keypair data         │  │
│  │  • SDK CDN │  • Relay      │  • KV                     │  │
│  │            │  • Notify     │    → Sessions, cache      │  │
│  │            │  • Push       │  • R2                     │  │
│  │            │               │    → SDK bundles           │  │
│  └────────────┴───────────────┴──────────────────────────┘  │
│                                                              │
│  Cost: $0 (within free tier limits)                        │
│  Workers: 100K req/day · Pages: 500 builds/mo              │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
│                                                              │
│  Pull Request → ─────────────────────────────────────────►  │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Build   │ │ Lint    │ │Typecheck│ │ Test    │          │
│  │ (turbo) │ │ (eslint)│ │ (tsc)   │ │ (vitest)│          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│       └───────────┴───────────┴───────────┘                │
│                           │                                │
│                    ┌──────▼──────┐                          │
│                    │ All pass?   │                          │
│                    └──────┬──────┘                          │
│                           │                                │
│              ┌────────────┼─────────────┐                  │
│              │            │             │                  │
│        ┌─────▼─────┐ ┌───▼────┐ ┌──────▼──────┐          │
│        │ Deploy CF  │ │ Publish│ │ E2E Tests   │          │
│        │ Workers    │ │ to npm │ │ Playwright  │          │
│        └───────────┘ └────────┘ └─────────────┘          │
│                                                              │
│  Weekly: Security Scan (npm audit + dependency check)       │
│  On merge: Release workflow + changelog                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Technology Stack

### 6.1 Core Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Language** | TypeScript | 5.7+ | Primary language (all SDK packages) |
| **Language** | Rust | — | Relay server, Bundler, Paymaster, ERC-6492, Safe decoder |
| **Language** | Swift | — | iOS SDK |
| **Language** | Kotlin | — | Android SDK |
| **Language** | Dart | — | Flutter SDK |
| **Language** | C# | — | Unity & .NET SDKs |
| **Package Mgr** | pnpm | 9.15.0 | Monorepo package manager |
| **Build** | Turborepo | 2.3+ | Task orchestration & caching |
| **Bundler** | Vite | — | Library bundling |
| **Framework** | Next.js | 15 | Demo app, Dashboard, Health Status |

### 6.2 Web3 & Cryptography

| Package | Purpose | License |
|---------|---------|---------|
| `@noble/curves` | X25519 key exchange, secp256k1, ed25519 | MIT |
| `@noble/ciphers` | ChaCha20-Poly1305 encryption | MIT |
| `@noble/hashes` | SHA-256, HMAC, PBKDF2 | MIT |
| `viem` | EVM chain interaction | MIT |
| `wagmi` | React hooks for EVM | MIT |
| `@walletconnect/*` | WalletConnect protocol | MIT |

### 6.3 UI & Framework

| Package | Purpose |
|---------|---------|
| Lit | Web Components (core-ui modal) |
| Zustand | State management |
| Tailwind CSS | Styling (demo, dashboard) |
| PostCSS | CSS processing |

### 6.4 Testing

| Framework | Scope |
|-----------|-------|
| Vitest | Unit tests (321 test files) |
| Playwright | E2E browser tests |
| Cypress | E2E browser tests (legacy) |
| Maestro | Mobile E2E tests |

### 6.5 Infrastructure

| Service | Purpose |
|---------|---------|
| Cloudflare Workers | Serverless edge computing |
| Cloudflare D1 | SQLite database at edge |
| Cloudflare KV | Key-value storage |
| Cloudflare R2 | Object storage (SDK bundles) |
| Cloudflare Pages | Static site hosting |
| Docker Compose | Self-hosted deployment |
| PostgreSQL | Keys Server DB (Docker) |
| Redis | Caching & message queue (Docker) |

### 6.6 CI/CD

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipeline (17 workflows) |
| Changesets | Version management & npm publishing |
| Dependabot | Automated dependency updates |
| Renovate | Dependency management |

---

## 7. Build System

### 7.1 Turborepo Pipeline

```
pnpm run ci
├── build (dependsOn: ^build)
│   └── Compiles TypeScript → dist/
│   └── Next.js apps → .next/
│
├── lint
│   └── ESLint across all packages
│
├── typecheck
│   └── TypeScript strict type checking
│
└── test (dependsOn: build)
    └── Vitest workspace runner
    └── Coverage via @vitest/coverage-v8
```

### 7.2 Package Categories

| Category | Count | Language | Build Tool |
|----------|-------|----------|------------|
| Core SDK | 3 | TypeScript | Vite |
| Adapters | 11 | TypeScript | Vite |
| Framework SDKs | 8 | TypeScript | Vite |
| Mobile/Game | 5 | Swift/Kotlin/Dart/C# | Platform-specific |
| Auth | 6 | TypeScript | Vite |
| Smart Accounts | 6 | TypeScript + Rust | Vite + Cargo |
| Payments | 8 | TypeScript | Vite |
| Infrastructure | 6 | TypeScript + Rust | Vite + Cargo |
| Advanced | 8 | TypeScript | Vite |
| Platform | 4 | TypeScript | Vite |
| DevTools | 8 | TypeScript | Vite |
| Utilities | 6 | TypeScript | Vite |
| Apps | 3 | TypeScript (Next.js) | Next.js |
| **Total** | **78** | | |

---

*Architecture documentation for Cinacoin v1.0 · CinaGroup Engineering · 2026-05-27*  
*See [SECURITY.md](./SECURITY.md) for security architecture and [SECURITY.md](./SECURITY.md) for deployment guides.*
