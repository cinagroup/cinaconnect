# Contributing to Cinacoin

Thank you for your interest in contributing to Cinacoin! We welcome contributions from everyone — whether you're fixing a typo, adding a new chain adapter, or building a core feature.

This guide covers everything you need to get started, contribute effectively, and get your work merged.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Fork & Clone](#fork--clone)
  - [Install Dependencies](#install-dependencies)
  - [Build the Project](#build-the-project)
  - [Run the Demo App](#run-the-demo-app)
- [Development Workflow](#development-workflow)
  - [Branching Strategy](#branching-strategy)
  - [Making Changes](#making-changes)
  - [Testing Your Changes](#testing-your-changes)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)
  - [TypeScript](#typescript)
  - [Rust](#rust)
  - [Documentation](#documentation)
- [Testing Guidelines](#testing-guidelines)
  - [TypeScript Packages (Vitest)](#typescript-packages-vitest)
  - [Rust Packages](#rust-packages)
  - [E2E Tests](#e2e-tests)
- [Documentation Guidelines](#documentation-guidelines)
- [Adding a New Package](#adding-a-new-package)
- [Adding a New Chain Adapter](#adding-a-new-chain-adapter)
- [Versioning & Releases](#versioning--releases)
- [Security](#security)

---

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating. Be respectful, inclusive, and constructive.

---

## Getting Started

### Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| [Node.js](https://nodejs.org/) | ≥ 18 (LTS recommended) | Core SDK runtime |
| [pnpm](https://pnpm.io/) | ≥ 9.15 | Package manager (workspace protocol) |
| [Rust](https://rustup.rs/) | ≥ 1.70 | Relay server, bundler, and other Rust packages |
| [Git](https://git-scm.com/) | Latest | Version control |

> **Tip:** Install [Volta](https://volta.sh/) or [fnm](https://github.com/Schniz/fnm) to manage Node versions automatically. This project includes an `engines` field in `package.json`.

### Fork & Clone

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/cinacoin.git
cd cinacoin

# 2. Add the upstream remote to stay in sync
git remote add upstream https://github.com/cinacoin/cinacoin.git
git fetch upstream
```

### Install Dependencies

```bash
# Install all workspace dependencies (Node + Rust)
pnpm install
```

This installs dependencies for all packages in the monorepo via pnpm workspaces. The `pnpm-lock.yaml` ensures reproducible installs.

### Build the Project

```bash
# Build all packages (uses Turbo for parallel builds)
pnpm run build

# Build a single package
cd packages/core-sdk && pnpm run build

# Or use Turbo's filter:
pnpm run build --filter=@cinacoin/core-sdk
```

### Run the Demo App

```bash
# Start the Next.js demo app with hot reload
cd apps/demo
pnpm run dev
# Open http://localhost:3000
```

The demo app has 6 pages wired to real wallet connection logic — it's the best way to test UI changes.

---

## Development Workflow

### Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable branch, always deployable |
| `feat/*` | New features (e.g., `feat/solana-wallet-adapter`) |
| `fix/*` | Bug fixes (e.g., `fix/race-condition-relay`) |
| `docs/*` | Documentation changes |
| `chore/*` | Maintenance, tooling, CI changes |

Keep branches focused — one concern per branch.

### Making Changes

1. **Sync with upstream:** `git pull upstream main`
2. **Create your branch:** `git checkout -b feat/your-feature`
3. **Make your changes** following the code style below
4. **Write tests** for new functionality
5. **Run the full CI suite** before pushing (see [Testing](#testing-your-changes))
6. **Commit** with Conventional Commits format (see below)

### Testing Your Changes

Before submitting a PR, run the full CI pipeline locally:

```bash
# Full CI pipeline: build + lint + typecheck + test
pnpm run ci

# Or run individual checks:
pnpm run build       # Build all packages
pnpm run lint        # ESLint across all packages
pnpm run typecheck   # TypeScript type checking
pnpm run test        # Run all tests via Vitest
pnpm run format:check # Verify Prettier formatting
```

For Rust packages:

```bash
cd packages/relay-server
cargo build
cargo test
cargo clippy
cargo fmt --check
```

---

## Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/). This enables automated changelog generation and semantic versioning via [Changesets](https://github.com/changesets/changesets).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, semicolons) — no logic change |
| `refactor` | Code restructuring — no feature or bug fix |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Tooling, CI, deps, or maintenance |
| `build` | Build system or external dependency changes |
| `ci` | CI/CD configuration changes |

### Scopes

Use the package name or area affected:

- `core-sdk`, `react`, `chains`, `adapter-ethereum`, `adapter-solana`
- `relay-server`, `bundler`, `paymaster`
- `ui`, `demo`, `docs`, `ci`
- `deps` (for dependency updates)

### Examples

```
feat(adapter-solana): add Phantom wallet EIP-6963 discovery
fix(core-sdk): resolve race condition in relay transport
docs: update API reference for SessionManager
test(relay-server): add roundtrip tests for ChaCha20-Poly1305
chore(deps): update viem to 2.21.0
refactor(react): extract useWalletCapabilities hook from provider
perf(core-sdk): lazy-load chain definitions on demand
```

### Breaking Changes

Include `BREAKING CHANGE:` in the commit footer or append `!` to the type:

```
feat(core-sdk)!: change SignClient constructor signature

BREAKING CHANGE: SignClient now requires projectId as the first argument.
Migrate by passing projectId in the constructor options.
```

---

## Pull Request Process

### Before Opening a PR

1. **Rebase on latest `main`:** `git rebase upstream/main`
2. **Run the full CI suite:** `pnpm run ci`
3. **Write a changeset** for user-facing changes: `pnpm changeset`
4. **Test in the demo app** if your changes affect UI

### Opening a PR

1. Push your branch to your fork
2. Open a PR against `main` on the upstream repo
3. Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md) — it's auto-loaded
4. Fill in all sections honestly

### PR Checklist

- [ ] Description clearly explains **what** changed and **why**
- [ ] Related issues are linked (`Fixes #123`)
- [ ] Code follows project style (lint, format, typecheck pass)
- [ ] Tests are added or updated
- [ ] Demo app works with the changes (if applicable)
- [ ] Documentation is updated (if API/usage changes)
- [ ] Changeset is included (if version bump needed)
- [ ] No unrelated changes in the diff

### Review Process

- PRs require **at least one approval** from a maintainer
- Address review feedback promptly and push follow-up commits
- Maintainers may squash-merge or rebase-merge — don't worry about commit history within the PR
- If a PR goes stale (> 14 days without activity), it may be closed

### Changesets (Versioning)

For any change that affects published packages, run:

```bash
pnpm changeset
```

Follow the interactive prompts to select packages and choose the bump type (`patch`, `minor`, `major`). The changeset file will be committed with your PR.

Docs-only and CI-only changes don't need changesets.

---

## Code Style Guidelines

### TypeScript

- **ESLint + Prettier** — configured per-package in `eslint.config.js` (or `.eslintrc`)
- **Formatting:** 2-space indent, single quotes, semicolons required, trailing commas
- **Imports:** Use ES modules with `.js` extension for `@noble` packages
- **Naming:** camelCase for variables/functions, PascalCase for types/classes, UPPER_SNAKE_CASE for constants
- **Types:** Prefer explicit types over `any`. Use `unknown` before `any` if type is truly uncertain.
- **Comments:** JSDoc for public APIs. Explain *why*, not *what*.

```bash
# Format all files
pnpm run format

# Check without modifying
pnpm run format:check

# Lint
pnpm run lint

# Auto-fix lint issues
pnpm run lint:fix
```

### Rust

- **Formatting:** `cargo fmt` (standard Rust style)
- **Linting:** `cargo clippy` (no warnings allowed)
- **Naming:** Follow Rust conventions (snake_case for functions/variables, PascalCase for types, UPPER_SNAKE_CASE for constants)
- **Comments:** `///` for public API docs, `//` for implementation notes

```bash
cd packages/relay-server
cargo fmt
cargo clippy -- -D warnings
```

### Documentation

- Write in **Markdown** under `docs/`
- Use **kebab-case** for filenames (e.g., `quick-start.md`)
- Code examples must be **tested** — don't document untested snippets
- Keep docs in sync with code — update docs when API changes
- Use [VitePress](https://vitepress.dev/) for the docs site:

```bash
pnpm run docs:dev    # Local dev server
pnpm run docs:build  # Production build
```

---

## Testing Guidelines

### TypeScript Packages (Vitest)

We use [Vitest](https://vitest.dev/) for testing. Tests live in `packages/<name>/test/` or alongside source files as `*.test.ts`.

```bash
# Run all tests
pnpm run test

# Run tests for a single package
pnpm run test --filter=@cinacoin/core-sdk

# Run tests in watch mode
cd packages/core-sdk && pnpm run test --watch

# Run with coverage
cd packages/core-sdk && pnpm run test --coverage
```

**What to test:**
- Public API functions and methods
- Edge cases (empty inputs, error states, boundary values)
- Crypto roundtrips (encrypt → decrypt → verify)
- React hooks (use `@testing-library/react`)

**Test structure:**
```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from '../src/module.js';

describe('module', () => {
  it('should do something specific', () => {
    const result = functionName(input);
    expect(result).toEqual(expected);
  });
});
```

### Rust Packages

```bash
cd packages/relay-server
cargo test          # All tests
cargo test --lib    # Unit tests only
cargo test --test integration  # Integration tests
```

**Crypto changes require roundtrip tests:**
1. Generate keypair → derive shared secret → encrypt → decrypt → verify plaintext matches
2. Test with wrong key → verify decryption fails
3. Test deterministic operations (topic derivation, serialization)

### E2E Tests

E2E tests use [Playwright](https://playwright.dev/) and live in `e2e/`:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui
```

---

## Documentation Guidelines

- **API docs:** Use TypeDoc for auto-generated API reference:

```bash
pnpm run typedoc        # Generate once
pnpm run typedoc:watch  # Watch mode
```

- **Guides:** Written for the docs site under `docs/guide/`
- **Examples:** Code samples under `docs/examples/` and `examples/`
- **README:** Each package should have its own `README.md` with usage examples

When updating documentation:
1. Check that code examples still compile/run
2. Update version references if API changed
3. Run `pnpm run docs:build` to verify the docs site builds cleanly

---

## Adding a New Package

See [DEVELOPMENT.md](./DEVELOPMENT.md#how-to-add-a-new-package) for detailed instructions.

Quick overview:
1. Create directory under `packages/your-package/`
2. Create `package.json` with `@cinacoin/` scope
3. Add build scripts (tsup for TypeScript, standard Cargo for Rust)
4. Ensure it's included in `pnpm-workspace.yaml`
5. Add to `turbo.json` task pipeline
6. Write a `README.md` for the package

---

## Adding a New Chain Adapter

See [DEVELOPMENT.md](./DEVELOPMENT.md#how-to-add-a-new-chain-adapter) for detailed instructions.

Quick overview:
1. Create `packages/adapter-<chain>/`
2. Implement the adapter interface (defined in core-sdk)
3. Add chain definitions to `@cinacoin/chains` if not present
4. Wire up wallet discovery and connection flow
5. Add tests with mock providers
6. Update the adapter registry in core-sdk

---

## Versioning & Releases

We use [Changesets](https://github.com/changesets/changesets) for version management and follow **[Semantic Versioning 2.0.0](https://semver.org/)**:

| Bump | Format | When to Use |
|------|--------|-------------|
| **Patch** | `x.y.Z` | Bug fixes, no API changes |
| **Minor** | `x.Y.0` | New backward-compatible features |
| **Major** | `X.0.0` | Breaking changes |

### For Contributors

Include a changeset with any PR that affects published packages:

```bash
pnpm changeset
```

Follow the prompts to select packages and bump type. The changeset file is committed with your PR.

Docs-only and CI-only changes do **not** require changesets.

### Release Process

Releases are managed by maintainers:

1. Changesets are consumed: `pnpm changeset version`
2. Version bump is committed to `main`
3. A Git tag is created: `git tag -a v1.1.0 -m "Release v1.1.0"`
4. Tag is pushed: `git push origin v1.1.0`
5. GitHub Actions automatically:
   - Builds and tests
   - Publishes packages to npm
   - Creates a GitHub Release with changelog
   - Deploys documentation to Cloudflare Pages

For detailed release procedures, see [docs/git-workflow.md](docs/git-workflow.md).

### Tag Format

All release tags use the `v` prefix:

```
v0.1.0   → Initial release
v0.2.1   → Patch fix
v1.0.0   → First stable release
v2.0.0   → Breaking changes
```

Use `./scripts/release-tag.sh` for automated tag creation.

---

## Security

If you discover a security vulnerability, **do not open a public issue**. Follow our [Security Policy](SECURITY.md) and report it responsibly.

Security-sensitive areas include:
- Cryptographic implementations (X25519, ChaCha20-Poly1305, SHA-256)
- Key management and storage
- Wallet connection and session handling
- Smart account and paymaster logic

---

Thank you for contributing to Cinacoin! 🚀
