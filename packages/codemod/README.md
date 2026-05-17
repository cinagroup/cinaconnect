# @onchainux/codemod

Automated codemods for migrating from **Web3Modal/AppKit** and **WalletConnect v1** to **OnChainUX**.

## Installation

```bash
npm install -D @onchainux/codemod
```

## Usage

### CLI

```bash
# See available transforms
npx onchainux-codemod --list

# Run a transform
npx onchainux/codemod --src-dir ./src --transform appkit-to-onchainux

# Dry run (no files modified)
npx onchainux/codemod --src-dir ./src --transform appkit-to-onchainux --dry-run

# Run multiple transforms
npx onchainux/codemod --src-dir ./src --transform appkit-to-onchainux --transform wc-v1-to-v2

# Verbose output
npx onchainux/codemod --src-dir ./src --transform appkit-to-onchainux --verbose

# Custom glob pattern
npx onchainux/codemod --src-dir ./src --transform appkit-to-onchainux --pattern "**/*.{ts,tsx}"
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--src-dir` | `src` | Directory to process |
| `--transform` | (required) | Transform name(s) to apply |
| `--dry-run` | `false` | Preview changes without writing |
| `--verbose` | `false` | Show per-file details |
| `--list` | `false` | List available transforms |
| `--pattern` | `**/*.{ts,tsx,js,jsx}` | Glob pattern for files |

### Programmatic API

```ts
import { transformAppKitToOnChainUX, transformWcV1ToV2 } from "@onchainux/codemod";

const source = `import { Web3Modal } from "@web3modal/react";`;

const result = transformAppKitToOnChainUX(source);
console.log(result.output);
// import { OnChainUX } from "@onchainux/react";

console.log(result.changes);
// ["[appkit-to-onchainux] Renamed package: @web3modal/react → @onchainux/react", ...]
```

## Available Transforms

### `appkit-to-onchainux`

Migrates Web3Modal / AppKit code to OnChainUX:

| Before | After |
|--------|-------|
| `@reown/appkit` | `@onchainux/core` |
| `@web3modal/react` | `@onchainux/react` |
| `@web3modal/ethereum` | `@onchainux/ethereum` |
| `Web3Modal` | `OnChainUX` |
| `createWeb3Modal` | `createOnChainUX` |
| `useWeb3Modal` | `useOnChainUX` |
| `W3mButton` | `OnChainUXButton` |
| `Web3ModalConfig` | `OnChainUXConfig` |
| `walletConnectProjectId` | `projectId` |

### `wc-v1-to-v2`

Migrates WalletConnect v1 patterns to v2:

| Before | After |
|--------|-------|
| `@walletconnect/client` | `@walletconnect/sign-client` |
| `bridge: 'https://...'` | `projectId: '...'` |
| `.on('connect', ...)` | `.on('session_proposal', ...)` |
| `.on('disconnect', ...)` | `.on('session_delete', ...)` |
| `.createSession()` | `.connect()` |
| `.killSession()` | `.disconnect()` |

## Recommended Migration Order

1. **Commit your code** before running codemods
2. Run `appkit-to-onchainux` first (package/identifier renames)
3. Run `wc-v1-to-v2` second (WalletConnect protocol updates)
4. Review changes with `git diff`
5. Fix any manual migration steps (e.g., API differences)
6. Run tests

## License

MIT
