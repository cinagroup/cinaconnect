# @cinaconnect/codemod

Automated codemods for migrating from **Reown/AppKit**, **RainbowKit**, **ConnectKit**, and **WalletConnect v1** to **CinaConnect**.

## Installation

```bash
npm install -D @cinaconnect/codemod
```

## Usage

### CLI

```bash
# See available transforms
npx cinaconnect-codemod --list

# Run a transform
npx cinaconnect/codemod --src-dir ./src --transform appkit-to-cinaconnect

# Dry run (no files modified)
npx cinaconnect/codemod --src-dir ./src --transform appkit-to-cinaconnect --dry-run

# Run multiple transforms
npx cinaconnect/codemod --src-dir ./src --transform appkit-to-cinaconnect --transform wc-v1-to-v2

# Verbose output
npx cinaconnect/codemod --src-dir ./src --transform appkit-to-cinaconnect --verbose

# Custom glob pattern
npx cinaconnect/codemod --src-dir ./src --transform appkit-to-cinaconnect --pattern "**/*.{ts,tsx}"
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
import { transformAppKitToCinaConnect, transformWcV1ToV2 } from "@cinaconnect/codemod";

const source = `import { Web3Modal } from "@web3modal/react";`;

const result = transformAppKitToCinaConnect(source);
console.log(result.output);
// import { CinaConnect } from "@cinaconnect/react";

console.log(result.changes);
// ["[appkit-to-cinaconnect] Renamed package: @web3modal/react → @cinaconnect/react", ...]
```

## Available Transforms

### `appkit-to-cinaconnect`

Migrates Web3Modal / AppKit code to CinaConnect:

| Before | After |
|--------|-------|
| `@reown/appkit` | `@cinaconnect/core-sdk` |
| `@web3modal/react` | `@cinaconnect/react` |
| `Web3Modal` | `CinaConnect` |
| `createWeb3Modal` | `createCinaConnect` |
| `useWeb3Modal` | `useCinaConnect` |
| `W3mButton` | `CinaConnectButton` |

### `rainbowkit-to-cinaconnect`

Migrates RainbowKit + wagmi code to CinaConnect:

| Before | After |
|--------|-------|
| `@rainbow-me/rainbowkit` | `@cinaconnect/react` |
| `RainbowKitProvider` | `CinaConnectProvider` |
| `ConnectButton` (RainbowKit) | `ConnectButton` (CinaConnect) |
| `useConnectModal` | `useCinaConnectModal` |
| `useChainModal` | `useCinaConnectChain` |
| `useAccount` (wagmi) | `useAccount` (from @cinaconnect/react) |
| `useConnect` (wagmi) | `useConnect` (from @cinaconnect/react) |
| `wagmi/chains` | `@cinaconnect/core-sdk` ChainConfig |
| `wagmi/connectors` | Wallet ID strings (`'metamask'`, `'walletconnect'`) |
| `wagmi` hooks | Same hooks from `@cinaconnect/react` |

### `connectkit-to-cinaconnect`

Migrates Family.co ConnectKit + wagmi code to CinaConnect:

| Before | After |
|--------|-------|
| `connectkit` | `@cinaconnect/react` |
| `ConnectKitProvider` | `CinaConnectProvider` |
| `ConnectKitButton` | `ConnectButton` |
| `useAccount` (wagmi) | `useAccount` (from @cinaconnect/react) |
| `createConfig` | Inline `CinaConnectProvider` config |
| `wagmi connectors` | Wallet ID strings |
| `@tanstack/react-query` | Removed (not needed) |

### `wc-v1-to-v2`

Migrates Web3Modal / AppKit code to CinaConnect:

| Before | After |
|--------|-------|
| `@reown/appkit` | `@cinaconnect/core` |
| `@web3modal/react` | `@cinaconnect/react` |
| `@web3modal/ethereum` | `@cinaconnect/ethereum` |
| `Web3Modal` | `CinaConnect` |
| `createWeb3Modal` | `createCinaConnect` |
| `useWeb3Modal` | `useCinaConnect` |
| `W3mButton` | `CinaConnectButton` |
| `Web3ModalConfig` | `CinaConnectConfig` |
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

### From Web3Modal/AppKit

1. **Commit your code** before running codemods
2. Run `appkit-to-cinaconnect` (package/identifier renames)
3. Run `wc-v1-to-v2` if using WalletConnect v1 patterns
4. Review changes with `git diff`
5. Fix any manual migration steps
6. Run tests

### From RainbowKit

1. **Commit your code** before running codemods
2. Run `rainbowkit-to-cinaconnect`
3. Review changes with `git diff` (chain configs need manual RPC URLs)
4. Update connector calls from objects to wallet ID strings
5. Run tests

### From ConnectKit

1. **Commit your code** before running codemods
2. Run `connectkit-to-cinaconnect`
3. Review changes with `git diff`
4. Update chain configuration with RPC URLs
5. Run tests

## License

MIT
