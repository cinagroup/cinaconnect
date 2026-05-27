# Quick Start

> Get started with Cinacoin in 5 minutes.

## Prerequisites

- Node.js 18+
- A project ID (self-hosted Relay Server)

## Installation

```bash
npm install @cinacoin/core-sdk @cinacoin/react
```

## Basic Setup

```tsx
import { CinacoinProvider, ConnectButton } from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'

function App() {
  return (
    <CinacoinProvider
      adapter={new EvmAdapter({
        projectId: 'your-project-id',
        relayUrl: 'wss://relay.yourdomain.com/v1',
      })}
    >
      <ConnectButton />
    </CinacoinProvider>
  )
}
```

## Next Steps

- [Installation Guide](/guide/installation) — Detailed installation for all frameworks
- [Configuration](/guide/configuration) — Full configuration options
- [Core SDK API](/api/core-sdk) — Core SDK reference
- [React API](/api/react) — React adapter reference
