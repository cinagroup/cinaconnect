# Session Keys

> `@cinacoin/session-keys` — Session key management for ERC-4337 smart accounts.

## Installation

```bash
npm install @cinacoin/session-keys
```

## Overview

Session keys enable temporary signing keys with configurable permissions and limits, allowing users to authorize dApp actions without signing every transaction.

## Usage

```typescript
import { SessionKeys } from '@cinacoin/session-keys'

const sessionKeys = new SessionKeys({
  smartAccountAddress: '0x...',
  chainId: 1,
})

// Create a session key with limits
const key = await sessionKeys.create({
  validUntil: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  spendingLimit: '1000000000000000000', // 1 ETH
  allowedTargets: ['0x...'],
})
```

## Related

- [AA SDK](/api/aa-sdk)
- [SIWE](/api/siwe)
