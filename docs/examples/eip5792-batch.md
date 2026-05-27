# EIP-5792 Atomic Batch Transactions

> Build and execute atomic batch transactions using the EIP-5792 Wallet Call API — approve + swap in one click.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 / pnpm ≥ 8
- A project ID from your Cinacoin dashboard
- A wallet that supports EIP-5792 (e.g., latest MetaMask, Coinbase Wallet)

## Installation

```bash
npm install @cinacoin/core-sdk @cinacoin/react @cinacoin/batch-transaction
```

## Quick Start

```tsx
import { BatchTransaction, createTransferOperation, createApproveOperation } from '@cinacoin/batch-transaction'
import { useAtomicBatch, useSendCalls } from '@cinacoin/react'

// Build a batch
const batch = new BatchTransaction({ chainId: 1, atomic: true })
batch.add(createTransferOperation({
  from: '0x...',
  to: '0x...',
  value: 1000000000000000000n, // 1 ETH
}))
batch.add(createApproveOperation({
  from: '0x...',
  tokenAddress: '0xToken...',
  spender: '0xRouter...',
  amount: 1000000000000000000n,
}))

// Validate & execute
const summary = batch.validate()
console.log('Operations:', summary.operationCount)
console.log('Valid:', summary.valid)
```

## Complete Example

### 1. Build & Execute a Batch

```ts
// src/batch-example.ts
import {
  BatchTransaction,
  BatchExecutor,
  createTransferOperation,
  createApproveOperation,
  createSwapOperation,
  createCustomOperation,
} from '@cinacoin/batch-transaction'

async function runBatchExample(fromAddress: string) {
  // Step 1: Create a batch
  const batch = new BatchTransaction({
    chainId: 1,
    atomic: true,       // All-or-nothing execution
    maxGas: 5_000_000n, // Optional gas limit
  })

  // Step 2: Add operations
  // Transfer 0.5 ETH
  batch.add(createTransferOperation({
    from: fromAddress,
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
    value: 500000000000000000n, // 0.5 ETH in wei
    label: 'Send 0.5 ETH to friend',
  }))

  // Approve USDC spending
  batch.add(createApproveOperation({
    from: fromAddress,
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    spender: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap Router
    amount: 1000000000n, // 1000 USDC (6 decimals)
    label: 'Approve USDC for swap',
  }))

  // Step 3: Validate before executing
  const summary = batch.validate()
  console.log(`Batch: ${summary.operationCount} operations`)
  console.log(`Estimated gas: ${summary.estimatedGas}`)
  console.log(`Valid: ${summary.valid}`)

  if (!summary.valid) {
    console.error('Errors:', summary.errors)
    return
  }

  // Step 4: Execute
  const executor = new BatchExecutor({ atomic: true })
  const result = await executor.execute(batch.getOperations(), {
    simulate: true, // Set false for actual execution
  })

  console.log('Success:', result.success)
  console.log('Total gas used:', result.totalGasUsed)
  console.log('Results:', result.results.map(r => ({
    index: r.index,
    success: r.success,
    txHash: r.txHash,
  })))

  return result
}
```

### 2. React Hook: Atomic Batch

```tsx
// src/components/AtomicBatchDemo.tsx
import { useState } from 'react'
import { useAtomicBatch, useSendCalls, useWalletCapabilities } from '@cinacoin/react'
import { useAccount } from '@cinacoin/react'

function AtomicBatchDemo() {
  const account = useAccount()
  const { atomicBatch, status: batchStatus, execute, reset } = useAtomicBatch()
  const { sendCalls, status: sendStatus } = useSendCalls()
  const { capabilities } = useWalletCapabilities()

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Check if wallet supports atomic batch
  const supportsBatch = capabilities?.atomicBatch ?? false

  async function executeBatch() {
    if (!account.address) return
    setLoading(true)

    try {
      const result = await execute([
        {
          to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
          value: '0x100000000000000000', // 0.1 ETH
          data: '0x',
        },
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
          data: '0x095ea7b3...' + // approve calldata
                '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'.padStart(64, '0') +
                BigInt(1000e6).toString(16).padStart(64, '0'),
        },
      ])

      setResult(result)
      console.log('Batch result:', result)
    } catch (err) {
      console.error('Batch execution failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function sendCallsExample() {
    if (!account.address) return

    const batchId = await sendCalls([
      {
        to: '0xRecipient1...',
        value: '0x16345785D8A0000', // 0.1 ETH
      },
      {
        to: '0xRecipient2...',
        value: '0x2386F26FC10000', // 0.01 ETH
      },
    ])

    console.log('Batch call ID:', batchId)
  }

  return (
    <div>
      <h3>EIP-5792 Atomic Batch</h3>

      <p>Wallet supports atomic batch: {supportsBatch ? '✅ Yes' : '❌ No'}</p>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={executeBatch}
          disabled={!account.address || !supportsBatch || loading}
        >
          {loading ? 'Executing...' : 'Execute Atomic Batch'}
        </button>

        <button onClick={sendCallsExample} disabled={!account.address}>
          Send Calls (Non-Atomic)
        </button>
      </div>

      {result && (
        <div>
          <h4>Result</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          <button onClick={() => reset()}>Reset</button>
        </div>
      )}
    </div>
  )
}
```

### 3. Swap + Approve in One Click

```tsx
import { useState } from 'react'
import { useAccount } from '@cinacoin/react'
import { useAtomicBatch } from '@cinacoin/react'
import { BatchTransaction, createApproveOperation, createSwapOperation } from '@cinacoin/batch-transaction'

function OneClickSwap() {
  const account = useAccount()
  const { execute } = useAtomicBatch()
  const [swapping, setSwapping] = useState(false)

  async function swap() {
    if (!account.address) return
    setSwapping(true)

    try {
      // Build the batch: approve then swap
      const batch = new BatchTransaction({
        chainId: 1,
        atomic: true,
      })

      batch.add(createApproveOperation({
        from: account.address,
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        spender: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap Router
        amount: 1000000000n, // 1000 USDC
      }))

      batch.add(createSwapOperation({
        from: account.address,
        fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',   // WETH
        fromAmount: 1000000000n,
        minToAmount: 0n, // Set based on slippage
      }))

      // Validate
      const summary = batch.validate()
      if (!summary.valid) {
        console.error('Validation failed:', summary.errors)
        return
      }

      // Execute atomic batch
      const result = await execute([
        ...batch.getOperations().map(op => ({
          to: (op as any).to || (op as any).tokenAddress,
          data: (op as any).data || '',
          value: '0x0',
        })),
      ])

      console.log('Swap completed:', result)
    } catch (err) {
      console.error('Swap failed:', err)
    } finally {
      setSwapping(false)
    }
  }

  return (
    <button onClick={swap} disabled={!account.address || swapping}>
      {swapping ? 'Swapping...' : 'Approve & Swap (1 Click)'}
    </button>
  )
}
```

### 4. Wallet Capabilities Discovery

```tsx
import { useWalletCapabilities } from '@cinacoin/react'

function WalletFeatures() {
  const { capabilities, isLoading } = useWalletCapabilities()

  if (isLoading) return <p>Loading capabilities...</p>

  return (
    <div>
      <h3>Wallet Capabilities</h3>
      <ul>
        <li>Atomic Batch: {capabilities?.atomicBatch ? '✅' : '❌'}</li>
        <li>Paymaster: {capabilities?.paymasterService ? '✅' : '❌'}</li>
        <li>Session Keys: {capabilities?.sessionKey ? '✅' : '❌'}</li>
      </ul>
    </div>
  )
}
```

## Expected Output

```
Batch: 3 operations
Estimated gas: 450000
Valid: true
Success: true
Total gas used: 423891
Results: [
  { index: 0, success: true, txHash: '0xabc...' },
  { index: 1, success: true, txHash: '0xdef...' },
  { index: 2, success: true, txHash: '0xghi...' },
]
```

## Operation Types

| Type | Description | Key Fields |
|------|-------------|------------|
| `transfer` | Native or ERC-20 token transfer | `from`, `to`, `value` |
| `approve` | ERC-20 allowance approval | `from`, `tokenAddress`, `spender`, `amount` |
| `swap` | Token swap via DEX router | `fromToken`, `toToken`, `fromAmount`, `minToAmount` |
| `custom` | Arbitrary contract call | `to`, `data`, `value` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wallet doesn't support atomic batch | Fall back to sequential execution |
| Gas estimation too high | Check calldata complexity; reduce operations |
| Batch fails atomically | Check individual operation validity; use `simulate: true` for dry run |

## Related

- [Ethereum](./ethereum.md)
- [React Integration](./react-integration.md)
- [SIWE Auth](./siwe-auth.md)
