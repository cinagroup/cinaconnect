# AA SDK

> `@cinacoin/aa-sdk` — Account Abstraction (ERC-4337) SDK.

## Installation

```bash
npm install @cinacoin/aa-sdk @cinacoin/core-sdk
```

## Overview

The AA SDK provides tools for interacting with ERC-4337 smart accounts, including UserOperation creation, Bundler communication, and Paymaster integration.

## Usage

```typescript
import { AASDK } from '@cinacoin/aa-sdk'

const aa = new AASDK({
  bundlerUrl: 'https://bundler.yourdomain.com/v1',
  paymasterUrl: 'https://paymaster.yourdomain.com/v1',
  chainId: 1,
})
```

## Features

- **Smart Account Creation** — Deploy ERC-4337 smart accounts
- **UserOperations** — Create and send UserOperations
- **Gas Sponsorship** — Paymaster integration for gasless transactions
- **Session Keys** — Temporary signing keys with limits
- **Social Recovery** — Guardian-based recovery mechanism

## Related

- [Bundler](/api/bundler) — Self-hosted Bundler
- [Paymaster](/api/paymaster) — Self-hosted Paymaster
- [Session Keys](/api/session-keys) — Session key management
- [ERC-6492](/api/erc6492) — ERC-6492 signature validation
