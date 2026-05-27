# @cinacoin/cli

Command-line interface for the **Cinacoin** self-hosted wallet connection toolkit.

## Installation

```bash
npm install -g @cinacoin/cli
# or
npx @cinacoin/cli <command>
```

## Commands

### `init` — Scaffold a new Cinacoin project

```bash
cinacoin init my-app
cinacoin init my-app --template react
cinacoin init my-app --template next --package-manager pnpm
cinacoin init my-app --dry-run
```

| Option | Description | Default |
|---|---|---|
| `--template` | Template to use (`web`, `react`, `vue`, `next`) | `web` |
| `--package-manager` | Package manager (`npm`, `yarn`, `pnpm`) | `pnpm` |
| `--dry-run` | Show what would be created without writing | `false` |

### `add` — Add adapters, plugins, or components

```bash
cinacoin add @cinacoin/react
cinacoin add @cinacoin/swap-sdk --dev
cinacoin list   # List all available addons
```

| Option | Description | Default |
|---|---|---|
| `--dev` | Add as devDependency | `false` |

**Available addons:**

| Addon | Description |
|---|---|
| `@cinacoin/evm` | EVM chain adapter |
| `@cinacoin/solana` | Solana chain adapter |
| `@cinacoin/bitcoin` | Bitcoin chain adapter |
| `@cinacoin/react` | React UI components |
| `@cinacoin/vue` | Vue UI components |
| `@cinacoin/react-native` | React Native components |
| `@cinacoin/swap-sdk` | DEX swap aggregator |
| `@cinacoin/siwe` | Sign-In With Ethereum |
| `@cinacoin/onramp-sdk` | Fiat on-ramp aggregator |
| `@cinacoin/walletconnect-v2` | WalletConnect v2 integration |
| `@cinacoin/session-keys` | ERC-4337 session keys |
| `@cinacoin/social-login` | Social login providers |

### `build` — Build SDK packages

```bash
cinacoin build
cinacoin build --scope @cinacoin/core
cinacoin build --force
```

| Option | Description | Default |
|---|---|---|
| `--scope` | Build a specific package only | all packages |
| `--force` | Force rebuild (clean dist first) | `false` |

### `test` — Run tests

```bash
cinacoin test              # Run all tests
cinacoin test --unit       # Unit tests only
cinacoin test --e2e        # E2E tests only
cinacoin test --coverage   # With coverage
cinacoin test --watch      # Watch mode
cinacoin test --ui         # Playwright UI mode
cinacoin test --project chromium
```

| Option | Description | Default |
|---|---|---|
| `--unit` | Run unit tests only (vitest) | — |
| `--e2e` | Run E2E tests only (playwright) | — |
| `--coverage` | Generate coverage report | `false` |
| `--watch` | Watch mode (unit tests only) | `false` |
| `--project` | Playwright project name | all |
| `--ui` | Playwright UI mode | `false` |

## Programmatic Usage

```ts
import { program } from '@cinacoin/cli';

program.parse(['node', 'cli', 'init', 'my-app', '--template', 'react']);
```

## Architecture

```
packages/cli/
├── src/
│   ├── index.ts              # CLI entry (commander setup)
│   ├── commands/
│   │   ├── init.ts           # ocx init — scaffold projects
│   │   ├── add.ts            # ocx add — add dependencies
│   │   ├── build.ts          # ocx build — turbo builds
│   │   └── test.ts           # ocx test — run vitest + playwright
│   └── utils/
│       ├── fs.ts             # File system utilities
│       └── logger.ts         # Colored logger + spinner
├── package.json
└── README.md
```

## License

MIT
