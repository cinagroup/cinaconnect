# @cinacoin/codemod

Automated codemods for migrating from **Reown/AppKit**, **RainbowKit**, **ConnectKit**, and **WalletConnect v1** to **Cinacoin**.

## Installation

```bash
npm install -D @cinacoin/codemod
```

## Usage

### CLI

```bash
# See available transforms
npx cinacoin-codemod --list

# Run a transform
npx cinacoin/codemod --src-dir ./src --transform appkit-to-cinacoin

# Dry run (no files modified)
npx cinacoin/codemod --src-dir ./src --transform appkit-to-cinacoin --dry-run

# Run multiple transforms
npx cinacoin/codemod --src-dir ./src --transform appkit-to-cinacoin --transform wc-v1-to-v2

# Verbose output
npx cinacoin/codemod --src-dir ./src --transform appkit-to-cinacoin --verbose

# Custom glob pattern
npx cinacoin/codemod --src-dir ./src --transform appkit-to-cinacoin --pattern "**/*.{ts,tsx}"
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
import { transformAppKitToCinacoin, transformWcV1ToV2 } from "@cinacoin/codemod";

const source = `import { Web3Modal } from "@web3modal/react";`;

const result = transformAppKitToCinacoin(source);
console.log(result.output);
// import { Cinacoin } from "@cinacoin/react";

console.log(result.changes);
// ["[appkit-to-cinacoin] Renamed package: @web3modal/react → @cinacoin/react", ...]
```

## Available Transforms

### `appkit-to-cinacoin`

Migrates Web3Modal / AppKit code to Cinacoin:

| Before | After |
|--------|-------|
| `@reown/appkit` | `@cinacoin/core-sdk` |
| `@web3modal/react` | `@cinacoin/react` |
| `Web3Modal` | `Cinacoin` |
| `createWeb3Modal` | `createCinacoin` |
| `useWeb3Modal` | `useCinacoin` |
| `W3mButton` | `CinacoinButton` |

### `rainbowkit-to-cinacoin`

Migrates RainbowKit + wagmi code to Cinacoin:

| Before | After |
|--------|-------|
| `@rainbow-me/rainbowkit` | `@cinacoin/react` |
| `RainbowKitProvider` | `CinacoinProvider` |
| `ConnectButton` (RainbowKit) | `ConnectButton` (Cinacoin) |
| `useConnectModal` | `useCinacoinModal` |
| `useChainModal` | `useCinacoinChain` |
| `useAccount` (wagmi) | `useAccount` (from @cinacoin/react) |
| `useConnect` (wagmi) | `useConnect` (from @cinacoin/react) |
| `wagmi/chains` | `@cinacoin/core-sdk` ChainConfig |
| `wagmi/connectors` | Wallet ID strings (`'metamask'`, `'walletconnect'`) |
| `wagmi` hooks | Same hooks from `@cinacoin/react` |

### `connectkit-to-cinacoin`

Migrates Family.co ConnectKit + wagmi code to Cinacoin:

| Before | After |
|--------|-------|
| `connectkit` | `@cinacoin/react` |
| `ConnectKitProvider` | `CinacoinProvider` |
| `ConnectKitButton` | `ConnectButton` |
| `useAccount` (wagmi) | `useAccount` (from @cinacoin/react) |
| `createConfig` | Inline `CinacoinProvider` config |
| `wagmi connectors` | Wallet ID strings |
| `@tanstack/react-query` | Removed (not needed) |

### `wc-v1-to-v2`

Migrates Web3Modal / AppKit code to Cinacoin:

| Before | After |
|--------|-------|
| `@reown/appkit` | `@cinacoin/core` |
| `@web3modal/react` | `@cinacoin/react` |
| `@web3modal/ethereum` | `@cinacoin/ethereum` |
| `Web3Modal` | `Cinacoin` |
| `createWeb3Modal` | `createCinacoin` |
| `useWeb3Modal` | `useCinacoin` |
| `W3mButton` | `CinacoinButton` |
| `Web3ModalConfig` | `CinacoinConfig` |
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
2. Run `appkit-to-cinacoin` (package/identifier renames)
3. Run `wc-v1-to-v2` if using WalletConnect v1 patterns
4. Review changes with `git diff`
5. Fix any manual migration steps
6. Run tests

### From RainbowKit

1. **Commit your code** before running codemods
2. Run `rainbowkit-to-cinacoin`
3. Review changes with `git diff` (chain configs need manual RPC URLs)
4. Update connector calls from objects to wallet ID strings
5. Run tests

### From ConnectKit

1. **Commit your code** before running codemods
2. Run `connectkit-to-cinacoin`
3. Review changes with `git diff`
4. Update chain configuration with RPC URLs
5. Run tests

## License

MIT
