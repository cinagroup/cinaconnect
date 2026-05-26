# Core SDK

> `@cinaconnect/core-sdk` — CinaConnect 核心 SDK 参考。

## Overview

The Core SDK is the foundation of CinaConnect. It manages wallet connections, chain switching, sessions, and the core communication layer with the Relay Server.

## Installation

```bash
npm install @cinaconnect/core-sdk
```

## Usage

### Initialize

```typescript
import { CinaConnect } from '@cinaconnect/core-sdk'

const cinaconnect = new CinaConnect({
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.yourdomain.com/v1',
  chains: [mainnet, polygon],
})
```

## API Reference

::: tip
For the full generated API reference with all types, run `npm run typedoc` locally.
:::

## Related

- [React Adapter](/api/react) — React hooks and provider
- [SIWE](/api/siwe) — Sign-In with Ethereum
- [Swap SDK](/api/swap-sdk) — Swap aggregator
- [AA SDK](/api/aa-sdk) — Account Abstraction
