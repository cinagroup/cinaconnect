# Session Keys API Documentation

> Generated API reference for `@cinacoin/session-keys`.

## Overview

The Session Keys SDK implements ERC-7715 / EIP-5792 for creating and managing session keys — temporary, permissioned signing keys for smart account sessions. This enables seamless UX where users sign once to grant limited permissions to a dApp.

## Installation

```bash
npm install @cinacoin/session-keys viem
```

## Core Classes

### `SessionKeyManager`

Creates, stores, and manages session keys for smart accounts.

```typescript
import { SessionKeyManager } from '@cinacoin/session-keys'

const manager = new SessionKeyManager({
  client: walletClient,
  smartAccount: account,
})
```

#### Constructor Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `client` | `WalletClient` | ✅ | — | Viem wallet client |
| `smartAccount` | `SmartAccountClient` | ✅ | — | Smart account instance |
| `storage` | `SessionKeyStorage` | ❌ | `localStorage` | Key persistence layer |
| `defaultDuration` | `number` | ❌ | `3600000` | Default session duration (ms) |

#### Methods

##### `createSession(options: CreateSessionOptions): Promise<SessionKey>`

Generate a new session key with specified permissions.

```typescript
const session = await manager.createSession({
  permissions: [
    {
      type: 'erc20-transfer',
      target: usdcAddress,
      limit: parseUnits('100', 6),  // 100 USDC max
      window: 86400,                // per 24 hours
    },
    {
      type: 'approve',
      target: routerAddress,
      limit: parseUnits('1000', 6),
    },
  ],
  duration: 3600000,  // 1 hour
  metadata: {
    dappName: 'My DEX',
    origin: 'https://mydex.com',
  },
})

console.log(session.publicKey)
console.log(session.expiresAt)
```

**CreateSessionOptions:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `permissions` | `SessionPermission[]` | ✅ | Permission policies |
| `duration` | `number` | ❌ | Session duration in milliseconds |
| `expiresAt` | `Date` | ❌ | Hard expiration date (alternative to duration) |
| `metadata` | `SessionMetadata` | ❌ | Session metadata for tracking |
| `signer` | `LocalAccount` | ❌ | Custom key pair (auto-generated if omitted) |

##### `getSession(key: Address): Promise<SessionKey | null>`

Retrieve an active session by its public key.

##### `listSessions(filter?: SessionFilter): Promise<SessionKey[]>`

List all sessions, optionally filtered.

```typescript
// List all active sessions
const active = await manager.listSessions({ status: 'active' })

// List sessions for a specific dApp
const dappSessions = await manager.listSessions({
  metadata: { dappName: 'My DEX' },
})
```

**SessionFilter:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | `'active' \| 'expired' \| 'revoked'` | ❌ | Filter by session status |
| `metadata` | `Record<string, string>` | ❌ | Filter by metadata fields |

##### `revokeSession(key: Address): Promise<void>`

Revoke a session key on-chain.

```typescript
await manager.revokeSession(session.publicKey)
```

##### `revokeAll(): Promise<void>`

Revoke all active sessions at once.

##### `useSession(key: Address, call: UserOperationCall): Promise<UserOperation>`

Create a user operation signed with the session key instead of the owner key.

```typescript
const userOp = await manager.useSession(session.publicKey, {
  target: usdcAddress,
  data: encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [recipient, amount],
  }),
})
```

## Interfaces

### `SessionKey`

```typescript
interface SessionKey {
  publicKey: Address
  privateKey: Hex                // only available immediately after creation
  permissions: SessionPermission[]
  expiresAt: Date
  status: 'active' | 'expired' | 'revoked'
  metadata: SessionMetadata
  createdAt: Date
}
```

### `SessionPermission`

```typescript
type SessionPermission =
  | { type: 'erc20-transfer'; target: Address; limit: bigint; window?: number }
  | { type: 'approve'; target: Address; limit: bigint }
  | { type: 'native-transfer'; limit: bigint; window?: number }
  | { type: 'contract-call'; target: Address; selector: Hex }
  | { type: 'unlimited'; target?: Address }
```

### `SessionMetadata`

```typescript
interface SessionMetadata {
  dappName: string
  origin: string
  [key: string]: string
}
```

## Permission Types

| Type | Description | Fields |
|------|-------------|--------|
| `erc20-transfer` | Limit ERC-20 token transfers | `target`, `limit`, `window` |
| `approve` | Limit ERC-20 approvals | `target`, `limit` |
| `native-transfer` | Limit native token transfers | `limit`, `window` |
| `contract-call` | Allow specific contract function calls | `target`, `selector` |
| `unlimited` | Unrestricted (use with caution) | `target` (optional) |

## Error Handling

| Code | Error | Description |
|------|-------|-------------|
| `SK_001` | `SessionExpired` | Session key has expired |
| `SK_002` | `SessionRevoked` | Session key was revoked |
| `SK_003` | `PermissionDenied` | Operation exceeds session permissions |
| `SK_004` | `LimitExceeded` | Transfer exceeds rate limit window |
| `SK_005` | `InvalidKey` | Session key is malformed |

## Usage Examples

### Create a Session for Token Swaps

```typescript
import { SessionKeyManager } from '@cinacoin/session-keys'

const manager = new SessionKeyManager({ client, smartAccount })

const swapSession = await manager.createSession({
  permissions: [
    {
      type: 'erc20-transfer',
      target: WETH,
      limit: parseEther('10'),
      window: 86400,
    },
    {
      type: 'erc20-transfer',
      target: USDC,
      limit: parseUnits('30000', 6),
      window: 86400,
    },
    {
      type: 'approve',
      target: UNISWAP_ROUTER,
      limit: parseEther('100'),
    },
  ],
  duration: 7 * 24 * 3600000,  // 7 days
  metadata: { dappName: 'Cinacoin Swap', origin: 'https://swap.cinacoin.io' },
})

// Use session key for swap without wallet popup
const userOp = await manager.useSession(swapSession.publicKey, swapCall)
```

### Revoke on App Unload

```typescript
window.addEventListener('beforeunload', async () => {
  const sessions = await manager.listSessions({
    metadata: { origin: window.origin },
    status: 'active',
  })
  for (const session of sessions) {
    await manager.revokeSession(session.publicKey)
  }
})
```
