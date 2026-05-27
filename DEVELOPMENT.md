# Development Guide

This document covers the internal development workflow for the Cinacoin monorepo. It's aimed at contributors who want to understand how the project is structured and how to work with it effectively.

---

## Table of Contents

- [Monorepo Structure](#monorepo-structure)
- [Build System](#build-system)
- [How to Add a New Package](#how-to-add-a-new-package)
- [How to Add a New Chain Adapter](#how-to-add-a-new-chain-adapter)
- [Debugging Tips](#debugging-tips)
- [Environment Configuration](#environment-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Local Publishing](#local-publishing)

---

## Monorepo Structure

Cinacoin is a **pnpm monorepo** managed by [Turborepo](https://turbo.build/repo). All packages live under `packages/`, apps under `apps/`, and example projects under `examples/`.

```
cinacoin/
├── apps/                    # Deployable applications
│   ├── demo/                # Next.js demo app (main showcase)
│   └── demo-react/          # React-only demo app
│
├── packages/                # All library packages (~64 packages)
│   ├── core-sdk/            # Core TypeScript SDK (SignClient, Pairing, Universal Provider)
│   ├── adapter-ethereum/    # EVM chain adapter
│   ├── adapter-solana/      # Solana SVM chain adapter
│   ├── adapter-bitcoin/     # Bitcoin BIP-122 chain adapter
│   ├── adapter-*/           # Additional chain adapters (TON, TRON, Cosmos, etc.)
│   ├── chains/              # Chain definition registry (300+ chains)
│   ├── react/               # React hooks & components (EIP-5792 hooks)
│   ├── next/                # Next.js App Router support
│   ├── vue/                 # Vue 3 plugin & composables
│   ├── svelte/              # Svelte 4/5 store & components
│   ├── core-ui/             # Web Components (Lit-based modal & widgets)
│   ├── aa-sdk/              # Account Abstraction SDK (ERC-4337)
│   ├── bundler/             # ERC-4337 Bundler (Rust)
│   ├── paymaster/           # ERC-7677 Paymaster (Rust)
│   ├── relay-server/        # WebSocket relay server (Rust)
│   ├── rpc-proxy/           # RPC proxy service (TypeScript)
│   ├── keys-server/         # Key management server (TypeScript)
│   └── ...                  # 50+ more packages
│
├── examples/                # Example projects for each platform
├── e2e/                     # Playwright end-to-end tests
├── docs/                    # VitePress documentation site
├── scripts/                 # Build and utility scripts
├── .github/                 # GitHub Actions workflows & templates
│   └── workflows/
├── deploy/                  # Deployment configurations
├── cloudflare/              # Cloudflare Workers configuration
│
├── package.json             # Root workspace config + scripts
├── pnpm-workspace.yaml      # pnpm workspace definition
├── turbo.json               # Turborepo pipeline configuration
├── tsconfig.json            # Root TypeScript config
├── vitest.workspace.ts      # Vitest workspace configuration
└── typedoc.json             # TypeDoc configuration
```

### Package Naming

All packages use the `@cinacoin/` scope:

```
@cinacoin/core-sdk
@cinacoin/react
@cinacoin/adapter-ethereum
@cinacoin/aa-sdk
```

### Dependency Flow

```
apps/demo → @cinacoin/react → @cinacoin/core-ui → @cinacoin/core-sdk
                                                          ↓
                                                    @cinacoin/adapter-*
                                                          ↓
                                                    @cinacoin/chains
```

Internal dependencies use the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@cinacoin/core-sdk": "workspace:*"
  }
}
```

---

## Build System

### Turbo

We use [Turborepo](https://turbo.build/repo) for task orchestration. The pipeline is defined in `turbo.json`:

| Task | Description | Depends On |
|------|-------------|------------|
| `build` | Compile TypeScript / Rust | `^build` (upstream packages first) |
| `test` | Run Vitest tests | `build` |
| `lint` | ESLint checks | — |
| `dev` | Development server (uncached, persistent) | — |
| `typecheck` | TypeScript type checking | — |
| `clean` | Remove dist/ and artifacts | — |

### Running Tasks

```bash
# Build everything (parallel, with dependency ordering)
pnpm run build

# Build a single package and its dependencies
pnpm run build --filter=@cinacoin/react

# Run tests only for changed packages
pnpm run test --filter=...[HEAD^1]

# Run dev server for the demo app
pnpm run dev --filter=demo
```

### Build Tools by Language

| Language | Tool | Config File |
|----------|------|-------------|
| TypeScript | tsup / tsc | `tsconfig.json`, per-package build scripts |
| Rust | cargo | `Cargo.toml` in each Rust package |

---

## How to Add a New Package

### Step 1: Create the Package Directory

```bash
mkdir packages/your-package
cd packages/your-package
```

### Step 2: Create `package.json`

```json
{
  "name": "@cinacoin/your-package",
  "version": "0.0.0",
  "description": "Description of your package",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@cinacoin/core-sdk": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.0.0"
  }
}
```

### Step 3: Create `tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### Step 4: Create Source Structure

```bash
mkdir -p src test
touch src/index.ts test/index.test.ts
```

### Step 5: Verify Workspace Inclusion

Ensure the package is picked up by `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"    # ← Already covers new packages
  - "apps/*"
  - "examples/*"
```

### Step 6: Install & Build

```bash
# From the root
pnpm install
pnpm run build --filter=@cinacoin/your-package
pnpm run test --filter=@cinacoin/your-package
```

### Step 7: Write a README

Create `README.md` in your package directory with:
- Brief description
- Installation instructions
- Quick start example
- API reference or link to docs

---

## How to Add a New Chain Adapter

Chain adapters allow Cinacoin to interact with new blockchains. Follow these steps:

### Step 1: Create the Adapter Package

```bash
mkdir packages/adapter-<chain>
cd packages/adapter-<chain>
```

Use the same `package.json` and `tsconfig.json` structure as [above](#step-2-create-packagejson), adjusting the name to `@cinacoin/adapter-<chain>`.

### Step 2: Implement the Adapter Interface

The adapter should implement the standard interface defined in `@cinacoin/core-sdk`. At minimum:

```typescript
// src/adapter.ts
import type { ChainAdapter, WalletProvider, ConnectionInfo } from '@cinacoin/core-sdk';

export class ChainAdapter implements ChainAdapter {
  readonly chainId: string;
  readonly name: string;

  constructor() {
    this.chainId = 'eip155:<caip2-chain-id>';
    this.name = 'Chain Name';
  }

  async connect(options: ConnectOptions): Promise<ConnectionInfo> {
    // Implement wallet connection flow
    // Return: { address, chainId, provider, ... }
  }

  async disconnect(): Promise<void> {
    // Clean up connection
  }

  async signMessage(message: string, address: string): Promise<string> {
    // Sign a message with the connected wallet
  }

  async sendTransaction(tx: TransactionRequest): Promise<string> {
    // Send a transaction, return tx hash
  }
}
```

### Step 3: Add Wallet Discovery

If the chain supports EIP-6963 or equivalent wallet discovery:

```typescript
// src/discovery.ts
export function discoverWallets(): WalletInfo[] {
  // Return list of available wallets for this chain
  // Each wallet: { name, icon, rdns, connectionInfo }
}
```

### Step 4: Add Chain Definitions

If the chain isn't already in `@cinacoin/chains`, add it:

```typescript
// In packages/chains/src/<chain>.ts
export const myChain = defineChain({
  id: 12345,
  name: 'My Chain',
  network: 'mainnet',
  nativeCurrency: { name: 'TOKEN', symbol: 'TKN', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mychain.io'] } },
});
```

### Step 5: Register the Adapter

Export the adapter from the package's entry point:

```typescript
// src/index.ts
export { ChainAdapter } from './adapter.js';
export { discoverWallets } from './discovery.js';
```

### Step 6: Add Tests

```typescript
// test/adapter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ChainAdapter } from '../src/adapter.js';
import { createMockProvider } from '@cinacoin/testing';

describe('ChainAdapter', () => {
  it('should connect and return connection info', async () => {
    const adapter = new ChainAdapter();
    const mockProvider = createMockProvider();
    const info = await adapter.connect({ provider: mockProvider });
    expect(info.address).toBeDefined();
    expect(info.chainId).toBe(adapter.chainId);
  });
});
```

### Step 7: Wire It Into Core-SDK

If this adapter should be included in the universal provider, register it:

```typescript
// In packages/core-sdk/src/adapters/index.ts
import { ChainAdapter } from '@cinacoin/adapter-<chain>';

export const allAdapters = [
  // ... existing adapters
  ChainAdapter,
];
```

### Step 8: Verify

```bash
pnpm install
pnpm run build --filter=@cinacoin/adapter-<chain>
pnpm run test --filter=@cinacoin/adapter-<chain>
```

Test in the demo app by importing the adapter and verifying connection works.

---

## Debugging Tips

### TypeScript

#### Enable Verbose Build Output

```bash
# See exactly what Turbo is doing
pnpm run build --verbosity=2

# Build a single package with full output
pnpm run build --filter=@cinacoin/core-sdk -- --verbose
```

#### Debug Type Errors

```bash
# See the full type error context
pnpm run typecheck --filter=@cinacoin/core-sdk

# Or run tsc directly for more verbose output
cd packages/core-sdk && npx tsc --noEmit --pretty
```

#### Check Package Exports

If you get `Cannot find module` errors in a consuming package:

```bash
# Verify the dist/ directory was built
ls packages/core-sdk/dist/

# Check the exports field in package.json
node -e "console.log(require('./packages/core-sdk/package.json').exports)"

# Verify the module resolves
node -e "import('@cinacoin/core-sdk').then(m => console.log(Object.keys(m)))"
```

### Vitest

#### Run Tests with Debug Output

```bash
# Run a single test file with verbose output
cd packages/core-sdk && pnpm exec vitest run test/specific.test.ts --reporter=verbose

# Run tests in watch mode for a specific pattern
cd packages/core-sdk && pnpm exec vitest run -t "should connect"

# Debug with Node inspector
cd packages/core-sdk && node --inspect-brk ../../node_modules/.bin/vitest run --no-threads
```

### Rust

#### Debug Relay Server

```bash
cd packages/relay-server

# Build in debug mode
cargo build

# Run with RUST_LOG for verbose output
RUST_LOG=debug cargo run

# Run a single test
cargo test test_name -- --nocapture

# Debug with GDB/LLDB
cargo build && gdb target/debug/relay-server
```

#### Debug Compilation Issues

```bash
# Show detailed compilation errors
cargo check --verbose

# Check for clippy warnings
cargo clippy -- -W clippy::pedantic
```

### Demo App

#### Hot Reload Issues

If changes to a workspace package aren't reflected in the demo app:

```bash
# 1. Ensure the package is built
pnpm run build --filter=@cinacoin/react

# 2. Clear Next.js cache
cd apps/demo && rm -rf .next

# 3. Restart the dev server
pnpm run dev --filter=demo
```

#### Network Debugging

```bash
# Enable WalletConnect debug logging
# In your app code:
import { Core } from '@walletconnect/core';
const core = new Core({
  logger: 'debug',  // or 'trace' for maximum verbosity
  projectId: '...',
});
```

### Common Issues

| Issue | Fix |
|-------|-----|
| `Cannot find module '@cinacoin/...'` | Run `pnpm install` at root, then `pnpm run build` |
| TypeScript errors after pulling | `pnpm install && pnpm run build --force` |
| Demo app shows old code | Clear `.next` cache and restart dev server |
| Tests pass locally but fail in CI | Run `pnpm run ci` locally — CI runs typecheck + lint too |
| Rust package not found by Turbo | Ensure `Cargo.toml` exists with a build script |
| Changesets not detected | Run `pnpm changeset status` to verify |

---

## Environment Configuration

### `.env` File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `PROJECT_ID` | WalletConnect Cloud project ID | Yes (for demo) |
| `RPC_URL_*` | Custom RPC endpoints | No (fallbacks provided) |
| `RELAY_URL` | Self-hosted relay server URL | No |
| `CLOUDFLARE_ACCOUNT_ID` | For Cloudflare Workers deployment | No |
| `CLOUDFLARE_API_TOKEN` | For Cloudflare Workers deployment | No |

### Node Version Management

This project specifies Node.js ≥ 18 in `package.json` engines. We recommend:

- **[Volta](https://volta.sh/):** `volta install node@22` — pins versions per-project
- **[fnm](https://github.com/Schniz/fnm):** `fnm use` — reads `.nvmrc` if present

---

## CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Build | `.github/workflows/build.yaml` | PR, push to main | Build all packages |
| CI | `.github/workflows/ci.yml` | PR | Full CI: build + lint + test |
| Test | `.github/workflows/test.yml` | PR, push to main | Run test suite |
| E2E | `.github/workflows/e2e.yml` | PR, push to main | Playwright E2E tests |
| Quality | `.github/workflows/quality.yaml` | PR | Code quality checks |
| Size Check | `.github/workflows/size-check.yaml` | PR | Bundle size limits |
| Release | `.github/workflows/release.yml` | Push to main | Changesets-based release |
| Deploy | `.github/workflows/deploy.yaml` | Push to main | Deploy apps |
| Deploy Cloudflare | `.github/workflows/deploy-cloudflare.yml` | Push to main | Deploy Workers |
| Docs | `.github/workflows/docs.yaml` | Push to main | Build & deploy docs |
| Security Scan | `.github/workflows/security-scan.yml` | PR, push to main | Dependency security audit |

### Local CI Emulation

```bash
# Run the full CI pipeline locally
pnpm run ci
# Equivalent to: turbo run build lint typecheck test
```

---

## Local Publishing

For testing package publishing locally:

```bash
# Build all packages first
pnpm run build

# Publish to npm (requires npm auth)
pnpm changeset publish

# Or dry-run to see what would be published
pnpm changeset publish --dry-run
```

For local testing without publishing to npm:

```bash
# In the package directory
cd packages/core-sdk
pnpm link --global

# In a consuming project
pnpm link --global @cinacoin/core-sdk
```

Or use pnpm's workspace protocol directly — any local project that includes this monorepo as a dependency will get live packages via `workspace:*`.

---

> **Need more help?** Check [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines, or reach out in our community channels.
