# AA-SDK Integration Flow

## Overview

The `@cinacoin/aa-sdk` package provides a complete Account Abstraction (ERC-4337) SDK wired to real bundler and paymaster RPC endpoints, with viem-based cryptographic signing and contract deployment.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Your App                              │
├─────────────────────────────────────────────────────────────┤
│   createSmartAccount(config)                                 │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│   │ SmartAccount│  │ BundlerClient│  │PaymasterClient│      │
│   │             │  │              │  │              │      │
│   │ - viem sign │  │ - HTTP JSON  │  │ - HTTP JSON  │      │
│   │ - keccak hash│ │   -RPC calls │  │   -RPC calls │      │
│   │ - on-chain  │  │              │  │              │      │
│   │   nonce     │  │              │  │              │      │
│   └──────┬──────┘  └──────┬───────┘  └──────┬───────┘      │
│          │                │                 │               │
│   ┌──────┴────────────────┴─────────────────┴──────┐        │
│   │              SmartAccountFactory               │        │
│   │  - computeAddress (on-chain + local fallback)  │        │
│   │  - deploy (viem writeContract)                 │        │
│   │  - isDeployedOnChain (getCode check)           │        │
│   └────────────────────────┬───────────────────────┘        │
└────────────────────────────┼────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     ┌────▼────┐      ┌─────▼─────┐      ┌────▼────┐
     │ Bundler │      │ Paymaster │      │  Node   │
     │  RPC    │      │  Service  │      │  RPC    │
     │(Rust/   │      │           │      │(Ethereum│
     │ Axum)   │      │           │      │ / L2)   │
     └─────────┘      └───────────┘      └─────────┘
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AA_PRIVATE_KEY` | Yes | Owner private key (0x-prefixed, 64 hex chars) |
| `AA_BUNDLER_URL` | Yes | Bundler RPC endpoint URL |
| `AA_BUNDLER_API_KEY` | No | API key for bundler authentication |
| `AA_PAYMASTER_URL` | Yes | Paymaster service endpoint URL |
| `AA_PAYMASTER_API_KEY` | No | API key for paymaster authentication |
| `AA_FACTORY_ADDRESS` | Yes | SmartAccountFactory contract address |
| `AA_ENTRY_POINT` | Yes | ERC-4337 entry point contract address |
| `AA_RPC_URL` | Yes | Ethereum/L2 node RPC URL for on-chain reads |
| `AA_CHAIN_ID` | Yes | Chain ID (1=mainnet, 11155111=sepolia, etc.) |
| `AA_SPONSOR_TYPE` | No | Paymaster sponsor type: `gasless` | `partial` | `post-pay` (default: `gasless`) |
| `AA_INDEX` | No | Account salt/index for deterministic address (default: `0`) |

## UserOperation Flow

### Step-by-step

```
1. Build UserOp
   SmartAccount.buildUserOperation(txs)
   → sets sender, nonce (on-chain), callData, initCode (if not deployed)
   → placeholder gas limits

2. Sponsor (Paymaster)
   PaymasterClient.sponsor({ userOp, entryPoint, chainId })
   → POST to paymaster with UserOperation
   → returns paymasterAndData + refined gas limits

3. Estimate Gas (Bundler)
   BundlerClient.estimateUserOperationGas(userOp, entryPoint)
   → POST eth_estimateUserOperationGas to bundler
   → returns preVerificationGas, verificationGasLimit, callGasLimit

4. Sign
   SmartAccount.signUserOp(userOp)
   → hashUserOperation(userOp) → keccak256 of packed fields
   → viem.sign({ hash, privateKey }) → real ECDSA signature

5. Send to Bundler
   BundlerClient.sendUserOperation(signedUserOp, entryPoint)
   → POST eth_sendUserOperation to bundler
   → returns userOpHash

6. Poll for Receipt
   BundlerClient.waitForReceipt(userOpHash)
   → polls eth_getUserOperationReceipt until non-null or timeout
   → returns UserOperationReceipt with success/failure status
```

### Convenience: `executeUserOperation()`

The `executeUserOperation()` function from `createClients.ts` performs all 6 steps automatically:

```typescript
import { createSmartAccount, executeUserOperation } from '@cinacoin/aa-sdk';
import { sepolia } from 'viem/chains';

const sdk = createSmartAccount({
  privateKey: process.env.AA_PRIVATE_KEY!,
  bundlerUrl: process.env.AA_BUNDLER_URL!,
  paymasterUrl: process.env.AA_PAYMASTER_URL!,
  factoryAddress: process.env.AA_FACTORY_ADDRESS!,
  entryPoint: process.env.AA_ENTRY_POINT!,
  chain: sepolia,
  rpcUrl: process.env.AA_RPC_URL!,
});

const { userOpHash, receipt } = await executeUserOperation(
  sdk,
  '0xRecipientAddress',
  0n,
  '0x',
  { waitForReceipt: true },
);

console.log('UserOp hash:', userOpHash);
console.log('Success:', receipt?.success);
```

## Bundler RPC Interface

The cinacoin bundler (Rust/Axum) exposes these JSON-RPC methods:

| Method | Description |
|---|---|
| `eth_sendUserOperation` | Submit a UserOperation for inclusion |
| `eth_estimateUserOperationGas` | Estimate gas limits for a UserOp |
| `eth_getUserOperationByHash` | Retrieve a UserOp by its hash |
| `eth_getUserOperationReceipt` | Get execution receipt for a UserOp |
| `eth_supportedEntryPoints` | List supported entry point addresses |
| `web3_clientVersion` | Bundler version string |
| `cinacoin_getBundlerConfig` | Get bundler config (redacted) |
| `cinacoin_getReputationStats` | Sender reputation statistics |

All methods accept standard JSON-RPC 2.0 request format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_sendUserOperation",
  "params": [{ ...userOp }, "0xEntryPoint"]
}
```

## Deployment Flow

Deploying a new smart account via the factory contract:

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const deployer = createWalletClient({
  account: privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY!),
  chain: sepolia,
  transport: http(process.env.AA_RPC_URL!),
});

const { address, hash } = await sdk.factory.deploy(
  deployer,
  sdk.account.getAddress(),
  0n, // salt
);

console.log('Deployed at:', address);
console.log('Tx hash:', hash);
```

## Testing

### Unit tests with mocked RPC

```bash
cd packages/aa-sdk
pnpm test
```

Tests in `tests/smartAccount.test.ts` use `vi.fn()` to mock `global.fetch` and verify:
- Correct RPC method names in request bodies
- API key propagation in Authorization headers
- Error handling for HTTP and RPC errors
- Hex serialization of bigint values

### Legacy test runner

```bash
cd packages/aa-sdk
npx tsx tests/aa.test.ts
```

### What's wired (production-ready)

| Component | Status | Details |
|---|---|---|
| `SmartAccount.signUserOp()` | ✅ Real | viem `sign()` with private key, keccak256 UserOp hash |
| `SmartAccount.getNonce()` | ✅ Real | On-chain `entryPoint.getNonce()` with local fallback |
| `SmartAccount.buildUserOperation()` | ✅ Real | ABI-encoded callData, initCode with factory call data |
| `BundlerClient.sendUserOperation()` | ✅ Real | HTTP POST `eth_sendUserOperation` with hex-serialised UserOp |
| `BundlerClient.estimateUserOperationGas()` | ✅ Real | HTTP POST `eth_estimateUserOperationGas` |
| `BundlerClient.getUserOperationReceipt()` | ✅ Real | HTTP POST `eth_getUserOperationReceipt` |
| `BundlerClient.waitForReceipt()` | ✅ Real | Polling loop with configurable interval/retries |
| `PaymasterClient.sponsor()` | ✅ Real | HTTP POST `pm_sponsorUserOperation` |
| `PaymasterClient.getGasLimits()` | ✅ Real | HTTP POST `pm_getGasLimits` |
| `SmartAccountFactory.computeAddress()` | ✅ Real | On-chain `factory.getAddress()` with local fallback |
| `SmartAccountFactory.deploy()` | ✅ Real | viem `writeContract` → `createAccount` on factory |
| `SmartAccountFactory.isDeployedOnChain()` | ✅ Real | viem `getCode()` check |
| `createSmartAccount()` | ✅ Real | Wires all components together with config |
| `executeUserOperation()` | ✅ Real | Full 6-step pipeline: build → sponsor → estimate → sign → send → poll |

### Remaining gaps

| Gap | Priority | Notes |
|---|---|---|
| Full end-to-end test with live bundler | Medium | Requires a running bundler + testnet deployment |
| Paymaster signature verification | Low | Paymaster may need to verify the UserOp signature |
| EIP-1559 gas price oracle | Low | Currently uses hardcoded gas prices; could fetch from node |
| initCode format per ERC-4337 spec | Medium | Current implementation concatenates factory + call data; spec requires `factory || factoryCallData` |
| UserOp hash per entry point v0.7 | High | EIP-4337 v0.7 changed the hash format; current implementation uses a simplified keccak256 of packed fields |
| Batch execution with proper ABI | Medium | `executeBatch` encoding could use actual ERC-4337 smart account ABI |

## Quick Start

```bash
# 1. Set environment variables
export AA_PRIVATE_KEY="0x..."
export AA_BUNDLER_URL="http://localhost:3000"
export AA_PAYMASTER_URL="http://localhost:4000"
export AA_FACTORY_ADDRESS="0x..."
export AA_ENTRY_POINT="0x0000000071727De22E5E9d8BAf0edAc6f37da032"
export AA_RPC_URL="https://rpc.sepolia.org"

# 2. Install deps
pnpm install

# 3. Build
pnpm build --filter=@cinacoin/aa-sdk

# 4. Test
pnpm test --filter=@cinacoin/aa-sdk
```
