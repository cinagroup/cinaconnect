# Publishing Guide

How to publish `@cinacoin/*` packages to npm.

## Overview

The Cinacoin monorepo contains **71 packages** under the `@cinacoin` npm scope. All packages have `"publishConfig": { "access": "public" }` set and are ready for public publishing.

Changesets are configured for version management (`@changesets/cli`), and manual publish scripts are available for direct publishing.

## Prerequisites

- **npm authentication**: You must be logged in to npm with publishing access to the `@cinacoin` scope.
  ```bash
  npm login
  ```
- **Build first**: Packages need a `dist/` (or `build/`) directory before publishing.
  ```bash
  pnpm build
  # or
  turbo run build
  ```

## Quick Start

### Dry Run (Recommended First)

Check what would be published without actually publishing:

```bash
# Via npm scripts
pnpm publish:dry-run

# Or directly
node scripts/publish-all.js
bash scripts/publish-all.sh
```

### Actual Publish

```bash
# Node.js version (better progress reporting, concurrent publishing)
pnpm publish:all:force

# Or
node scripts/publish-all.js --publish

# Bash version (sequential, simpler)
bash scripts/publish-all.sh --publish
```

## Using npm Scripts

The root `package.json` provides these convenience scripts:

| Script                      | Description                          |
|-----------------------------|--------------------------------------|
| `pnpm publish:dry-run`      | Simulate publish (safe, default)     |
| `pnpm publish:all`          | Dry run via Node.js                  |
| `pnpm publish:all:force`    | Actually publish all packages        |
| `pnpm publish:all:sh`       | Bash version (dry run)               |
| `pnpm changeset:publish`    | Publish via changesets workflow      |

## Publish Scripts Reference

### `scripts/publish-all.js` (Node.js)

The recommended publish script. Features:

- **Concurrent publishing** — publishes multiple packages in parallel (default: 4 at a time)
- **Registry checking** — compares local version against npm before publishing
- **Retry logic** — retries on transient network errors (2 retries with backoff)
- **Progress reporting** — shows emoji status for each package
- **Filtering** — publish only packages matching a pattern

```bash
# Dry run (default)
node scripts/publish-all.js

# Actually publish
node scripts/publish-all.js --publish

# Publish with higher concurrency
node scripts/publish-all.js --publish --concurrency=8

# Publish only adapter packages
node scripts/publish-all.js --publish --filter=adapter

# Publish multiple categories
node scripts/publish-all.js --publish --filter=react,ui,adapter
```

### `scripts/publish-all.sh` (Bash)

A simpler sequential alternative:

```bash
# Dry run (default)
bash scripts/publish-all.sh

# Actually publish
bash scripts/publish-all.sh --publish

# Filter by category
bash scripts/publish-all.sh --publish --filter=adapter
```

## Using Changesets

For the standard release workflow (recommended for CI):

```bash
# 1. Create changesets for modified packages
pnpm changeset

# 2. Bump versions
pnpm changeset:version

# 3. Publish all changed packages
pnpm changeset:publish
```

Changesets configuration is in `.changeset/config.json`:

- **Access**: `public`
- **Base branch**: `main`
- **Auto peer-dependency updates**: enabled

## Package Categories

The monorepo contains these package categories:

| Category | Packages |
|----------|----------|
| **Core** | `core-sdk`, `core-ui`, `config`, `testing`, `performance-utils` |
| **Adapters** | `adapter-bitcoin`, `adapter-cosmos`, `adapter-hedera`, `adapter-near`, `adapter-starknet`, `adapter-sui`, `adapter-xrpl` |
| **UI Frameworks** | `react`, `react-native`, `vue`, `angular`, `svelte`, `next`, `nuxt` |
| **UI Components** | `ui-theme`, `design-tokens`, `core-ui`, `wallet-buttons`, `pay-ui` |
| **SDKs** | `swap-sdk`, `onramp-sdk`, `bundler`, `aa-sdk`, `blockchain-api` |
| **Auth** | `siwe`, `siwx`, `passkey-auth`, `social-login`, `erc6492` |
| **Servers** | `keys-server`, `relay-server`, `push-server`, `notify-server`, `rpc-proxy` |
| **Mobile/Native** | `ios-swift`, `android-kotlin`, `flutter-dart`, `unity-types`, `dotnet` |
| **Features** | `multiwallet`, `embedded-wallet`, `cross-chain-sync`, `custom-connectors`, `walletconnect-v2` |
| **Other** | `cli`, `codemod`, `i18n`, `i18n-react`, `explorer`, `cdn`, `analytics` |

## Publishing a Single Package

```bash
cd packages/core-sdk
npm publish --access public
```

## Troubleshooting

### "You must be logged in to publish"
```bash
npm login
# Or use an auth token
export NPM_TOKEN=your_token_here
```

### "Package version already exists"
Bump the version first:
```bash
pnpm changeset           # create changeset
pnpm changeset:version   # apply version bumps
pnpm publish:all:force   # publish
```

### "No dist/ directory"
Build the package first:
```bash
pnpm build
# or for a specific package
turbo run build --filter=@cinacoin/core-sdk
```

### "403 Forbidden"
You don't have publishing access to the `@cinacoin` scope. Contact the package owner to be added as a collaborator on npm.

### "ECONNRESET / ETIMEDOUT"
Network errors are retried automatically (2 retries with backoff). If persistent, check your internet connection or try reducing concurrency:
```bash
node scripts/publish-all.js --publish --concurrency=1
```

## CI/CD Integration

For automated publishing in CI, use the changesets workflow:

```yaml
# .github/workflows/publish.yml (example)
- name: Setup npm auth
  run: echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" > .npmrc

- name: Build
  run: pnpm build

- name: Publish
  run: pnpm changeset:publish
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```
