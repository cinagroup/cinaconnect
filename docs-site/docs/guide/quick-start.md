# Quick Start

> Get started with CinaConnect in 5 minutes.

## Prerequisites

- Node.js 18+
- A project ID (self-hosted Relay Server)

## Installation

```bash
npm install @cinaconnect/core-sdk @cinaconnect/react
```

## Basic Setup

```tsx
import { CinaConnectProvider, ConnectButton } from '@cinaconnect/react'
import { EvmAdapter } from '@cinaconnect/core-sdk'

function App() {
  return (
    <CinaConnectProvider
      adapter={new EvmAdapter({
        projectId: 'your-project-id',
        relayUrl: 'wss://relay.yourdomain.com/v1',
      })}
    >
      <ConnectButton />
    </CinaConnectProvider>
  )
}
```

## Next Steps

- [Installation Guide](/guide/installation) — Detailed installation for all frameworks
- [Configuration](/guide/configuration) — Full configuration options
- [Core SDK API](/api/core-sdk) — Core SDK reference
- [React API](/api/react) — React adapter reference
