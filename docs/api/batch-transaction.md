# Batch Transaction API

> `@cinacoin/batch-transaction` — 原子批量交易构建和执行。

## Installation

```bash
npm install @cinacoin/batch-transaction
```

## Usage

```typescript
import { BatchTransaction, createTransferOperation, createApproveOperation, createSwapOperation } from '@cinacoin/batch-transaction'

const batch = new BatchTransaction({
  chainId: 1,
  from: '0x...',
})

// Add operations
batch.addOperation(createTransferOperation({
  to: '0x...',
  value: '1000000000000000000',
  token: 'ETH',
}))

batch.addOperation(createApproveOperation({
  token: '0x...',
  spender: '0x...',
  amount: '1000000000000000000',
}))

batch.addOperation(createSwapOperation({
  fromToken: '0x...',
  toToken: '0x...',
  amount: '1000000000000000000',
  slippage: 0.5,
}))

// Execute
const result = await batch.execute()
```

## MultiSend

```typescript
import {
  MULTI_SEND_ABI,
  MULTI_SEND_ADDRESSES,
  getMultiSendAddress,
  encodeMultiSendCall,
  encodeMultiSendBatch,
} from '@cinacoin/batch-transaction'

// Get MultiSend address for chain
const address = getMultiSendAddress(1) // Gnosis Safe MultiSend

// Encode a batch for MultiSend
const calldata = encodeMultiSendBatch(operations)
```

## React Hook

```tsx
import { useBatchTransaction } from '@cinacoin/batch-transaction'

const { batch, addOperation, execute, isExecuting, result } = useBatchTransaction({
  chainId: 1,
})
```

## Error Handling

```typescript
try {
  const result = await batch.execute()
} catch (err) {
  if (err.code === 'SIMULATION_FAILED') { /* batch simulation failed */ }
  if (err.code === 'INSUFFICIENT_BALANCE') { /* not enough funds */ }
}
```

## See Also

- [Core SDK](./core-sdk.md)
- [Swap SDK](./swap-sdk.md)
