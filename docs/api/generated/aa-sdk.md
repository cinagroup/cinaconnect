# Account Abstraction SDK API Documentation

> Generated API reference for `@cinacoin/aa-sdk`.

## Overview

The Account Abstraction (AA) SDK provides a complete implementation of ERC-4337 (Account Abstraction Using Single Transaction Contract) for Cinacoin. It enables smart account creation, UserOperation building, bundler interaction, and paymaster integration — all through a unified TypeScript API.

## Installation

```bash
npm install @cinacoin/aa-sdk viem
```

## Core Classes

### `SmartAccountFactory`

Create and manage ERC-4337 smart accounts.

```typescript
import { SmartAccountFactory } from '@cinacoin/aa-sdk'

const factory = new SmartAccountFactory({
  chainId: 1,
  bundlerUrl: 'https://bundler.yourdomain.com/v1',
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',  // v0.7
})
```

#### Constructor Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `chainId` | `number` | ✅ | — | Target chain ID |
| `bundlerUrl` | `string` | ✅ | — | ERC-4337 bundler RPC URL |
| `entryPoint` | `Address` | ✅ | — | EntryPoint contract address |
| `factoryAddress` | `Address` | ❌ | auto | Account factory address |
| `publicClient` | `PublicClient` | ❌ | auto | Viem public client |

#### Methods

##### `createAccount(options: CreateAccountOptions): Promise<SmartAccount>`

Create a new smart account with the specified owner.

```typescript
const account = await factory.createAccount({
  owner: walletClient.account,
  salt: BigInt(Date.now()),
  index: 0,
})

console.log(account.address)
console.log(await account.isDeployed())
```

**CreateAccountOptions:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `owner` | `LocalAccount` | ✅ | — | EOA owner (signer) |
| `owners` | `LocalAccount[]` | ❌ | — | Multi-sig owners |
| `salt` | `bigint` | ❌ | random | Account salt for deterministic address |
| `index` | `number` | ❌ | `0` | Account index for same owner |
| `threshold` | `number` | ❌ | `1` | Multi-sig signature threshold |

##### `getAccount(address: Address): Promise<SmartAccount>`

Retrieve an existing smart account by address.

```typescript
const existing = await factory.getAccount('0x...')
console.log(await existing.getNonce())
```

##### `predictAddress(owner: Address, salt?: bigint, index?: number): Promise<Address>`

Predict the smart account address before deployment.

```typescript
const predicted = await factory.predictAddress(owner.address, salt)
console.log(`Account will be deployed at: ${predicted}`)
```

### `SmartAccount`

Represents an ERC-4337 smart account instance.

```typescript
const account = await factory.createAccount({ owner })
```

#### Methods

##### `isDeployed(): Promise<boolean>`

Check if the account has been deployed on-chain.

##### `getNonce(): Promise<bigint>`

Get the next UserOperation nonce.

##### `getUserOpHash(userOp: Partial<UserOperation>): Promise<Hex>`

Compute the UserOperation hash for signing.

##### `signUserOp(userOp: Partial<UserOperation>): Promise<UserOperation>`

Sign a UserOperation with the account's owner key(s).

```typescript
const userOp = await account.signUserOp({
  target: recipient,
  data: encodedCall,
  value: 0n,
})
```

##### `sendUserOp(userOp: Partial<UserOperation>): Promise<UserOperationReceipt>`

Build, sign, and submit a UserOperation through the bundler.

```typescript
const receipt = await account.sendUserOp({
  target: usdcAddress,
  data: encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [recipient, amount],
  }),
  value: 0n,
})

console.log(receipt.userOpHash)
console.log(receipt.success)
```

##### `deploy(): Promise<TransactionReceipt>`

Deploy the smart account (if not already deployed).

##### `getBalance(): Promise<bigint>`

Get the account's native token balance.

##### `setPaymaster(paymaster: PaymasterConfig): void`

Configure a paymaster for gas sponsorship.

```typescript
account.setPaymaster({
  address: paymasterAddress,
  type: 'erc20',
  token: usdcAddress,
})
```

### `BundlerClient`

Direct interaction with the ERC-4337 bundler.

```typescript
import { BundlerClient } from '@cinacoin/aa-sdk'

const bundler = new BundlerClient({
  url: 'https://bundler.yourdomain.com/v1',
  chainId: 1,
})
```

#### Methods

##### `sendUserOperation(userOp: UserOperation): Promise<Hex>`

Submit a UserOperation to the bundler.

##### `getUserOperationStatus(userOpHash: Hex): Promise<UserOperationStatus>`

Check the status of a submitted UserOperation.

##### `estimateUserOperationGas(userOp: Partial<UserOperation>): Promise<GasEstimation>`

Estimate gas for a UserOperation.

```typescript
const gasEstimate = await bundler.estimateUserOperationGas({
  sender: account.address,
  callData: encodedCall,
  nonce: await account.getNonce(),
})

console.log(gasEstimate.verificationGasLimit)
console.log(gasEstimate.callGasLimit)
console.log(gasEstimate.preVerificationGas)
```

##### `getSupportedEntryPoints(): Promise<Address[]>`

Get EntryPoint addresses supported by the bundler.

## Interfaces

### `CreateAccountOptions`

```typescript
interface CreateAccountOptions {
  owner: LocalAccount
  owners?: LocalAccount[]
  salt?: bigint
  index?: number
  threshold?: number
}
```

### `PaymasterConfig`

```typescript
type PaymasterConfig =
  | { type: 'none' }
  | { type: 'verifying'; address: Address }
  | { type: 'erc20'; address: Address; token: Address }
```

### `GasEstimation`

```typescript
interface GasEstimation {
  preVerificationGas: bigint
  verificationGasLimit: bigint
  callGasLimit: bigint
  paymasterVerificationGasLimit?: bigint
  paymasterPostOpGasLimit?: bigint
}
```

### `UserOperationReceipt`

```typescript
interface UserOperationReceipt {
  userOpHash: Hex
  sender: Address
  nonce: bigint
  success: boolean
  actualGasCost: bigint
  actualGasUsed: bigint
  transactionHash: Hex
  blockNumber: bigint
  logs: Log[]
  reason?: string
}
```

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| `AA_001` | `AccountNotDeployed` | Account has not been deployed on-chain |
| `AA_002` | `BundlerRejection` | Bundler rejected the UserOperation |
| `AA_003` | `SignatureInvalid` | UserOperation signature verification failed |
| `AA_004` | `OutOfGas` | UserOperation ran out of gas |
| `AA_005` | `NonceExpired` | Nonce already used |
| `AA_006` | `PaymasterRejection` | Paymaster rejected the UserOperation |
| `AA_007` | `InvalidEntryPoint` | EntryPoint version mismatch |

## Usage Examples

### Create and Use a Smart Account

```typescript
import { SmartAccountFactory } from '@cinacoin/aa-sdk'

const factory = new SmartAccountFactory({
  chainId: 1,
  bundlerUrl: 'https://bundler.yourdomain.com/v1',
})

// Create new smart account
const account = await factory.createAccount({
  owner: walletClient.account,
})

// Check if deployed
if (!(await account.isDeployed())) {
  console.log('Account not deployed yet, deploying...')
  await account.deploy()
}

// Send a sponsored transaction
const receipt = await account.sendUserOp({
  target: usdcAddress,
  data: encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [recipient, amount],
  }),
  value: 0n,
})

console.log('Transaction confirmed:', receipt.transactionHash)
```

### Multi-Sig Smart Account

```typescript
const multiSigAccount = await factory.createAccount({
  owners: [owner1, owner2, owner3],
  threshold: 2,  // 2-of-3 multi-sig
  salt: BigInt(Date.now()),
})
```

### Gas Sponsorship with Paymaster

```typescript
const account = await factory.createAccount({ owner })

account.setPaymaster({
  type: 'verifying',
  address: '0x...',  // Your paymaster address
})

// This transaction will be gas-sponsored
const receipt = await account.sendUserOp({
  target: usdcAddress,
  data: transferData,
  value: 0n,
})
```
