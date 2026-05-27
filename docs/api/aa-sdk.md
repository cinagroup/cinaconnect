# Account Abstraction SDK API

> `@cinacoin/aa-sdk` — ERC-4337 smart accounts, bundler client, and paymaster integration.

## Installation

```bash
npm install @cinacoin/aa-sdk viem
```

## Overview

The AA SDK provides a complete toolkit for building with ERC-4337 Account Abstraction:

- **SmartAccount** — Smart account with batched execution, signing, and nonce management
- **SmartAccountFactory** — Deterministic account creation and address prediction
- **BundlerClient** — Submit UserOperations to ERC-4337 bundlers
- **PaymasterClient** — Sponsor gas fees for gasless user transactions

## Quick Start

```typescript
import {
  SmartAccount,
  SmartAccountFactory,
  BundlerClient,
  PaymasterClient,
} from '@cinacoin/aa-sdk'

// 1. Create a smart account
const factory = new SmartAccountFactory({
  address: '0xFactoryAddress',
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032', // v0.7
  saltNonce: 0n,
})

const account = await SmartAccount.create({
  owner: '0xOwnerAddress',
  entryPoint: factory.getEntryPoint(),
  factoryAddress: factory.config.address,
  chainId: 1,
  rpcUrl: 'https://eth.llamarpc.com',
})

// 2. Predict the address
const predictedAddress = factory.computeAddress(account.config.owner)
console.log('Smart account address:', predictedAddress)

// 3. Deploy the account
const deployed = await factory.deploy(account.config.owner)
console.log('Deployed at:', deployed.address)

// 4. Build and send a UserOperation
const userOp = account.buildUserOperation([
  {
    to: '0xRecipient',
    value: 0n,
    data: '0x...',
  },
])

// 5. Submit through bundler
const bundler = new BundlerClient({
  url: 'https://bundler.yourdomain.com/v1',
})

const filled = await bundler.fillUserOperationDefaults(userOp)
const result = await bundler.sendUserOperation(filled)
console.log('UserOp hash:', result.userOpHash)
```

## SmartAccount

Represents an ERC-4337 compatible smart account with support for single and batched transactions.

```typescript
import { SmartAccount } from '@cinacoin/aa-sdk'

const account = await SmartAccount.create({
  owner: '0x1234...',
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  chainId: 1,
  rpcUrl: 'https://eth.llamarpc.com',
})
```

### SmartAccountConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `owner` | `string` | ✅ | — | EOA owner address |
| `entryPoint` | `string` | ✅ | — | EntryPoint contract address |
| `factoryAddress` | `string` | ❌ | — | Account factory address |
| `index` | `bigint` | ❌ | `0n` | Account index for multi-account |
| `chainId` | `number` | ✅ | — | Target chain ID |
| `rpcUrl` | `string` | ✅ | — | RPC endpoint for the chain |

### SmartAccountState

| Property | Type | Description |
|----------|------|-------------|
| `address` | `string` | Smart account address |
| `owner` | `string` | EOA owner address |
| `nonce` | `bigint` | Next UserOperation nonce |
| `balance` | `bigint` | Account balance (wei) |
| `isDeployed` | `boolean` | Whether the account is deployed |

### Methods

#### `create(config: SmartAccountConfig): Promise<SmartAccount>`

Static factory method. Derives the account address from owner + factory config without deploying.

#### `getState(): SmartAccountState`

Get a snapshot of the current account state.

```typescript
const state = account.getState()
console.log(state.address, state.nonce, state.isDeployed)
```

#### `getAddress(): string`

Get the smart account address.

#### `execute(to: string, value: bigint, data: string): Promise<UserOperationResult>`

Execute a single transaction through the smart account (builds a UserOperation internally).

```typescript
const result = await account.execute(
  '0xRecipient',
  0n,
  '0xa9059cbb...' // ERC-20 transfer calldata
)
console.log(result.userOpHash, result.status) // 'pending'
```

#### `executeBatch(transactions: BatchTransaction[]): Promise<UserOperationResult>`

Execute multiple transactions in a single UserOperation.

```typescript
const result = await account.executeBatch([
  { to: tokenA, value: 0n, data: approveCalldata },
  { to: router,   value: 0n, data: swapCalldata },
  { to: recipient,value: amount, data: '0x' },
])
```

#### `sign(userOp: UserOperation): Promise<string>`

Sign a UserOperation. Returns the signature hex string.

#### `buildUserOperation(transactions: BatchTransaction[]): UserOperation`

Build a UserOperation from transactions without signing.

```typescript
const userOp = account.buildUserOperation([
  { to: '0x...', value: 0n, data: '0x...' },
])
// userOp includes sender, nonce, gas limits, etc.
```

#### `hashUserOperation(userOp: UserOperation): string`

Hash a UserOperation per EIP-4337 specification (SHA-256).

#### `getNonce(): bigint`

Get the next UserOperation nonce (auto-increments with each build).

#### `updateBalance(balance: bigint): void`

Update the account's cached balance.

### BatchTransaction

```typescript
interface BatchTransaction {
  /** Target contract address */
  to: string
  /** ETH value in wei */
  value: bigint
  /** Calldata */
  data: string
}
```

### UserOperation

The full ERC-4337 v0.7 UserOperation structure:

```typescript
interface UserOperation {
  sender: string              // Smart account address
  nonce: bigint               // Anti-replay nonce
  initCode: string            // Factory + salt (empty if deployed)
  callData: string            // Execution calldata
  callGasLimit: bigint        // Gas for call execution
  verificationGasLimit: bigint // Gas for signature verification
  preVerificationGas: bigint   // Bundler overhead
  maxFeePerGas: bigint        // EIP-1559 max fee
  maxPriorityFeePerGas: bigint // EIP-1559 priority fee
  paymasterAndData: string     // Paymaster address + data
  signature: string            // Owner signature
}
```

### UserOperationResult

```typescript
interface UserOperationResult {
  userOpHash: string                        // Hash of the UserOperation
  transactionHash?: string                   // On-chain tx hash (after confirmation)
  status: 'pending' | 'success' | 'failed'  // Current status
}
```

## SmartAccountFactory

Creates smart accounts with deterministic addresses.

```typescript
import { SmartAccountFactory } from '@cinacoin/aa-sdk'

const factory = new SmartAccountFactory({
  address: '0xFactoryAddress',
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  saltNonce: 0n,
})
```

### FactoryConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `address` | `string` | ✅ | — | Factory contract address |
| `entryPoint` | `string` | ✅ | — | EntryPoint contract address |
| `saltNonce` | `bigint` | ❌ | `0n` | Default salt nonce for address derivation |

### Methods

#### `computeAddress(owner: string, salt?: bigint): string`

Predict a smart account address before deployment. Uses deterministic derivation from owner + factory address + salt.

```typescript
const addr = factory.computeAddress('0xOwner')
console.log('Predicted address:', addr)
```

#### `deploy(owner: string, salt?: bigint): Promise<{ address: string; hash: string }>`

Deploy a new smart account. Returns the deployed address and deployment transaction hash.

```typescript
const { address, hash } = await factory.deploy('0xOwner')
console.log(`Deployed at ${address} in tx ${hash}`)
```

#### `isDeployed(address: string): boolean`

Check if an account has been deployed.

#### `getEntryPoint(): string`

Get the factory's configured EntryPoint address.

## BundlerClient

Client for submitting UserOperations to ERC-4337 bundlers.

```typescript
import { BundlerClient } from '@cinacoin/aa-sdk'

const bundler = new BundlerClient({
  url: 'https://bundler.example.com/v1',
  apiKey: 'optional-api-key',
})
```

### BundlerConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `url` | `string` | ✅ | — | Bundler RPC endpoint |
| `apiKey` | `string` | ❌ | — | API key for authenticated bundlers |

### Methods

#### `sendUserOperation(userOp: UserOperation): Promise<BundlerSendResult>`

Submit a UserOperation to the bundler via `eth_sendUserOperation`.

```typescript
const result = await bundler.sendUserOperation(userOp)
console.log('UserOp submitted:', result.userOpHash)
```

#### `estimateUserOperationGas(userOp: UserOperation): Promise<BundlerEstimate>`

Estimate gas requirements for a UserOperation via `eth_estimateUserOperationGas`.

```typescript
const estimate = await bundler.estimateUserOperationGas(userOp)
console.log('Call gas limit:', estimate.callGasLimit)
```

#### `getUserOperationStatus(userOpHash: string): Promise<{ status: string; transactionHash?: string }>`

Query the status of a submitted UserOperation.

```typescript
const status = await bundler.getUserOperationStatus(result.userOpHash)
if (status.status === 'included') {
  console.log('Tx hash:', status.transactionHash)
}
```

#### `getSupportedEntryPoints(): Promise<string[]>`

Get the EntryPoint addresses supported by this bundler.

```typescript
const entryPoints = await bundler.getSupportedEntryPoints()
// ['0x0000000071727De22E5E9d8BAf0edAc6f37da032']
```

#### `fillUserOperationDefaults(userOp: Partial<UserOperation>): Promise<UserOperation>`

Fill in default gas estimates for missing UserOperation fields. Useful for building a complete UserOperation from a partial one.

```typescript
const filled = await bundler.fillUserOperationDefaults({
  sender: account.getAddress(),
  callData: '0x...',
})
// All gas limits are auto-filled
```

### BundlerEstimate

```typescript
interface BundlerEstimate {
  preVerificationGas: bigint
  verificationGasLimit: bigint
  callGasLimit: bigint
}
```

### BundlerSendResult

```typescript
interface BundlerSendResult {
  userOpHash: string  // Unique identifier for the UserOperation
}
```

## PaymasterClient

Client for gas sponsorship through paymaster services.

```typescript
import { PaymasterClient } from '@cinacoin/aa-sdk'

const paymaster = new PaymasterClient({
  url: 'https://paymaster.example.com/v1',
  apiKey: 'optional-api-key',
  sponsorType: 'gasless',
})
```

### PaymasterConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `url` | `string` | ✅ | — | Paymaster API endpoint |
| `apiKey` | `string` | ❌ | — | API key |
| `sponsorType` | `'gasless' \| 'partial' \| 'post-pay'` | ❌ | — | Sponsorship model |

### Methods

#### `sponsor(request: PaymasterRequest): Promise<PaymasterResponse>`

Request gas sponsorship for a UserOperation. Returns `paymasterAndData` to include in the UserOperation.

```typescript
const response = await paymaster.sponsor({
  userOperation: userOp,
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  chainId: 1,
})

userOp.paymasterAndData = response.paymasterAndData
```

#### `getGasLimits(userOp: UserOperation): Promise<{ verificationGasLimit: bigint; callGasLimit: bigint; preVerificationGas: bigint }>`

Get paymaster-specific gas limits for a UserOperation.

#### `getBalance(): Promise<bigint>`

Get the paymaster's current deposit balance.

#### `canSponsor(request: PaymasterRequest): boolean`

Check if the paymaster can sponsor a given operation.

### PaymasterRequest

```typescript
interface PaymasterRequest {
  userOperation: UserOperation
  entryPoint: string
  chainId: number
}
```

### PaymasterResponse

```typescript
interface PaymasterResponse {
  paymasterAndData: string       // Encoded paymaster address + validity + signature
  preVerificationGas?: bigint     // PVG override
  verificationGasLimit?: bigint   // VGL override
  callGasLimit?: bigint           // CGL override
}
```

## Sponsorship Models

The PaymasterClient supports three sponsorship modes via `sponsorType`:

| Mode | Description |
|------|-------------|
| `gasless` | dApp fully sponsors all gas costs |
| `partial` | Paymaster covers part of the gas; user pays the rest |
| `post-pay` | User pays gas upfront, paymaster reimburses the dApp |

## Architecture

```
┌─────────────┐        ┌─────────────────┐        ┌──────────────┐
│   dApp      │        │  AA SDK         │        │  Bundler     │
│             │        │                 │        │              │
│ SmartAccount│──UserOp─▶ BundlerClient  │──RPC───▶ Bundler      │
│   Factory   │        │  PaymasterClient│──API───▶ Paymaster API│
└─────────────┘        └─────────────────┘        └──────┬───────┘
                                                         │
                                                         ▼
                                                  EntryPoint Contract
                                                         │
                                                         ▼
                                                   On-Chain Execution
```

## See Also

- [Bundler (Rust)](./bundler.md) — Self-hosted bundler implementation
- [Paymaster Contracts (Solidity)](./paymaster.md) — On-chain paymaster contracts
- [Session Keys](./session-keys.md) — Temporary signing keys for smart accounts
- [Auto-generated docs](./generated/aa-sdk.md) — TypeDoc output
