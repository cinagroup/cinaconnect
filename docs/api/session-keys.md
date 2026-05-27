# Session Keys API

> `@cinacoin/session-keys` — Temporary signing keys with policies and social recovery for ERC-4337 smart accounts.

## Overview

Session Keys allow dApps to operate on behalf of a user without requiring a wallet signature for every transaction. Keys are scoped by policy (allowed contracts, methods, spending limits, expiration) and can be recovered through a Guardian-based social recovery system.

## Installation

```bash
npm install @cinacoin/session-keys
```

## Quick Start

```typescript
import {
  SessionKeyManager,
  SessionKeyPolicyManager,
  SocialRecoveryManager,
} from '@cinacoin/session-keys'

// Create a policy
const policyManager = new SessionKeyPolicyManager()
const dexPolicy = policyManager.createPolicy(
  SessionKeyPolicyManager.createDexPolicy(
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
    1n * 10n ** 18n,              // max 1 ETH per tx
    5n * 10n ** 18n,              // max 5 ETH per day
    Math.floor(Date.now() / 1000) + 86400,  // expires in 24h
    1,                            // Ethereum mainnet
  )
)

// Generate a session key
const keyManager = new SessionKeyManager()
const sessionKey = keyManager.generateKey(dexPolicy, 'dapp-session')

console.log(`Session key: ${sessionKey.publicKey}`)
console.log(`Expires: ${new Date(sessionKey.expiresAt * 1000).toISOString()}`)
```

## Core Classes

### SessionKeyManager

Manages generation, import, revocation, and validation of session keys.

```typescript
import { SessionKeyManager } from '@cinacoin/session-keys'

const keyManager = new SessionKeyManager()
```

#### Methods

##### `generateKey(policy?: SessionKeyPolicy, label?: string): SessionKey`

Generate a new session key with optional policy association.

```typescript
const key = keyManager.generateKey(dexPolicy, 'dapp-session')
// key.publicKey  → "0x..."
// key.privateKey → "0x..."
// key.expiresAt  → timestamp
```

##### `importKey(privateKey: Hex, policy?: SessionKeyPolicy, label?: string): SessionKey`

Import an existing session key from a private key.

##### `getKey(publicKey: Address): SessionKey | null`

Retrieve a session key by its public address.

##### `getActiveKeys(): SessionKey[]`

Get all non-expired session keys.

##### `getAllKeys(): SessionKey[]`

Get all keys including expired ones.

##### `revokeKey(publicKey: Address): boolean`

Revoke (delete) a session key. Returns `true` if found and revoked.

##### `revokeExpiredKeys(): number`

Revoke all expired keys. Returns count of keys revoked.

##### `signWithKey(publicKey: Address, message: string): Promise<Hex>`

Sign a message using the session key. Throws if key is expired or not found.

##### `getPolicy(publicKey: Address): SessionKeyPolicy | null`

Get the policy associated with a session key.

##### `registerPolicy(policy: SessionKeyPolicy): void`

Register a policy without creating a key.

##### `getAllPolicies(): SessionKeyPolicy[]`

Get all registered policies.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `keyCount` | `number` | Number of stored keys |
| `policyCount` | `number` | Number of stored policies |

### SessionKeyPolicyManager

Creates and manages policies that scope what session keys are allowed to do.

```typescript
import { SessionKeyPolicyManager } from '@cinacoin/session-keys'

const policyManager = new SessionKeyPolicyManager()
```

#### Static Factory Methods

##### `createDexPolicy(target: Address, maxAmountPerTx: bigint, dailyLimit: bigint, expiresAt: number, chainId: number): Partial<SessionKeyPolicy>`

Create a policy for interacting with a specific DEX.

```typescript
const dexPolicy = SessionKeyPolicyManager.createDexPolicy(
  '0xE592427A0AEce92De3Edee1F18E0157C05861564',  // Uniswap V3 Router
  1n * 10n ** 18n,        // max 1 ETH per tx
  5n * 10n ** 18n,        // max 5 ETH per day
  Math.floor(Date.now() / 1000) + 86400,  // 24h expiry
  1                        // mainnet
)
```

##### `createNftPolicy(target: Address, maxAmountPerTx: bigint, expiresAt: number, chainId: number): Partial<SessionKeyPolicy>`

Create a policy for NFT minting/interactions.

##### `createGamingPolicy(maxAmountPerTx: bigint, dailyLimit: bigint, expiresAt: number, chainId: number): Partial<SessionKeyPolicy>`

Create a policy for gaming dApps with higher frequency but lower per-tx limits.

#### Instance Methods

##### `createPolicy(params: Partial<SessionKeyPolicy>): SessionKeyPolicy`

Create a custom policy from partial parameters.

```typescript
const customPolicy = policyManager.createPolicy({
  allowedTargets: ['0x...'],
  allowedMethods: ['0xa9059cbb'],  // transfer()
  maxAmountPerTx: 100000000000000000n,
  dailyLimit: 500000000000000000n,
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  allowedChains: [1, 137],
  allowNativeTransfers: false,
  allowErc20Transfers: true,
  allowedTokens: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'], // USDC
})
```

### SocialRecoveryManager

Manages the guardian-based social recovery system for smart accounts.

```typescript
import { SocialRecoveryManager } from '@cinacoin/session-keys'

const recoveryManager = new SocialRecoveryManager()
```

#### Methods

##### `configureRecovery(config: RecoveryConfig): void`

Set up social recovery with guardians.

```typescript
recoveryManager.configureRecovery({
  guardianCount: 3,
  threshold: 2,              // 2 of 3 guardians required
  recoveryDelay: 86400,      // 24h timelock
  guardians: [
    { address: '0x...', name: 'Trusted Friend 1', isActive: true, addedAt: now },
    { address: '0x...', name: 'Trusted Friend 2', isActive: true, addedAt: now },
    { address: '0x...', name: 'Hardware Backup', isActive: true, addedAt: now },
  ],
})
```

##### `initiateRecovery(account: Address, newOwner: Address): Promise<RecoveryResult>`

Start a recovery request to change the account owner.

##### `addGuardianSignature(requestId: string, guardian: Address): Promise<void>`

Add a guardian's signature to a pending recovery request.

##### `executeRecovery(requestId: string): Promise<RecoveryResult>`

Execute a recovery request once the threshold is met and the timelock has passed.

##### `cancelRecovery(requestId: string): Promise<void>`

Cancel a pending recovery request.

##### `getRecoveryStatus(account: Address): RecoveryConfig | null`

Get the current recovery configuration for an account.

### Utility Functions

#### `encodeEnableSessionKey(sessionKey: SessionKey, policy: SessionKeyPolicy): Hex`

Generate the `enableSessionKey` calldata for a smart account.

```typescript
import { encodeEnableSessionKey } from '@cinacoin/session-keys'

const calldata = encodeEnableSessionKey(sessionKey, dexPolicy)
// Send this calldata to the smart account to register the session key
```

#### `encodeDisableSessionKey(sessionKey: SessionKey): Hex`

Generate the `disableSessionKey` calldata.

```typescript
import { encodeDisableSessionKey } from '@cinacoin/session-keys'

const calldata = encodeDisableSessionKey(sessionKey)
// Send to disable a session key on-chain
```

#### `isKeyValidForOperation(key: SessionKey, policy: SessionKeyPolicy, target: Address, method: Hex, amount: bigint): boolean`

Check if a session key is authorized for a specific operation.

```typescript
import { isKeyValidForOperation } from '@cinacoin/session-keys'

const allowed = isKeyValidForOperation(
  sessionKey,
  dexPolicy,
  '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  '0x414bf389',  // exactInputSingle() selector
  500000000000000000n,       // 0.5 ETH
)

if (allowed) {
  // Execute the swap via the session key
}
```

## Types

### SessionKey

```typescript
interface SessionKey {
  publicKey: Address           // Public key (EVM address)
  privateKey: Hex              // Private key (keep secret!)
  expiresAt: number            // Expiry Unix timestamp
  createdAt: number            // Creation Unix timestamp
  policyId?: string            // Associated policy ID
  label?: string               // Human-readable label
}
```

### SessionKeyPolicy

```typescript
interface SessionKeyPolicy {
  id: string                   // Unique policy ID
  expiresAt: number            // Policy expiry
  allowedTargets: Address[]    // Allowed contract addresses (empty = all)
  allowedMethods: Hex[]        // Allowed function selectors (empty = all)
  maxAmountPerTx: bigint       // Max per-transaction value (wei)
  dailyLimit: bigint           // Max daily spending (wei)
  allowedChains: number[]      // Allowed chain IDs (empty = all)
  allowNativeTransfers: boolean
  allowErc20Transfers: boolean
  allowedTokens: Address[]     // Allowed ERC-20 tokens (empty = all)
  metadata?: Record<string, string>
}
```

### DailySpend

```typescript
interface DailySpend {
  day: number                  // Day number (timestamp / 86400)
  spent: bigint                // Total spent today (wei)
  txCount: number              // Transaction count today
}
```

### Guardian

```typescript
interface Guardian {
  address: Address
  name: string
  isActive: boolean
  addedAt: number
}
```

### RecoveryConfig

```typescript
interface RecoveryConfig {
  guardianCount: number        // Total guardians
  threshold: number            // Required signatures
  recoveryDelay: number        // Timelock (seconds)
  guardians: Guardian[]
}
```

### RecoveryRequest

```typescript
interface RecoveryRequest {
  id: string
  account: Address
  newOwner: Address
  signatureCount: number
  signedGuardians: Address[]
  initiatedAt: number
  executableAt: number
  executed: boolean
  cancelled: boolean
}
```

### RecoveryResult

```typescript
interface RecoveryResult {
  success: boolean
  requestId?: string
  error?: string
}
```

## Common Patterns

### Gasless dApp Session

```typescript
// 1. User connects wallet and creates a smart account
// 2. dApp generates a session key with a limited policy
const policy = SessionKeyPolicyManager.createDexPolicy(
  dexRouterAddress,
  1000000000000000000n,      // 1 ETH max per tx
  3000000000000000000n,      // 3 ETH per day
  Math.floor(Date.now() / 1000) + 7200,  // 2 hours
  chainId,
)

const sessionKey = keyManager.generateKey(policy, 'swap-session')

// 3. Enable the session key on the smart account
const calldata = encodeEnableSessionKey(sessionKey, policy)
// Send userOp to register the key

// 4. dApp signs transactions with the session key
const signature = await keyManager.signWithKey(sessionKey.publicKey, message)
// Transaction executes without further user interaction
```

### Social Recovery Setup

```typescript
// Configure 3 guardians, requiring 2 signatures
recoveryManager.configureRecovery({
  guardianCount: 3,
  threshold: 2,
  recoveryDelay: 86400,  // 24h delay to prevent abuse
  guardians: [
    { address: friend1Address, name: 'Alice', isActive: true, addedAt: now },
    { address: friend2Address, name: 'Bob', isActive: true, addedAt: now },
    { address: hardwareAddress, name: 'Ledger Backup', isActive: true, addedAt: now },
  ],
})

// If user loses access, initiate recovery
const result = await recoveryManager.initiateRecovery(
  smartAccountAddress,
  newOwnerAddress
)

// Collect signatures from guardians
await recoveryManager.addGuardianSignature(result.requestId!, aliceAddress)
await recoveryManager.addGuardianSignature(result.requestId!, bobAddress)

// After timelock, execute
await recoveryManager.executeRecovery(result.requestId!)
```

## Security Considerations

1. **Never transmit the private key** — only the public key is sent on-chain
2. **Always set expiration** — session keys should have a short TTL
3. **Scope policies tightly** — only allow specific targets and methods
4. **Use spending limits** — both per-transaction and daily limits
5. **Guardian selection** — choose guardians who are independent and reliable
6. **Timelock is critical** — recovery delay prevents instant account takeover
