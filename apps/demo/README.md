# Cinacoin Demo App

A Next.js 15 demo application showcasing the Cinacoin SDK's multi-chain wallet connection, swap, and UI components.

## Getting Started

```bash
# Install dependencies (from monorepo root)
pnpm install

# Run the dev server
pnpm -F cinacoin-demo dev
```

The app will be available at `http://localhost:3000`.

## Pages

- **`/`** — Home page with ConnectButton and chain switcher demo
- **`/swap`** — Cross-chain token swap interface
- **`/multi-chain`** — Multi-chain adapter showcase (EVM, Solana, Bitcoin)

## Architecture

```
apps/demo/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Home — ConnectButton demo
│   │   ├── swap/page.tsx     # Swap interface
│   │   └── multi-chain/page.tsx  # Multi-chain showcase
│   └── components/
│       └── DemoLayout.tsx    # Shared layout with navbar
├── next.config.ts
└── package.json
```

## Dependencies

- **Next.js 15** — App Router
- **React 19** — UI framework
- **@cinacoin/core-sdk** — Core SDK (workspace)
- **@cinacoin/core-ui** — Web components (workspace)
- **@cinacoin/react** — React bindings (workspace)

## Tech Stack

- TypeScript
- Tailwind CSS (via Next.js)
- Cinacoin Web Components (`<ocx-connect-button>`, `<ocx-chain-switcher>`, etc.)
- i18n support (10+ languages)
