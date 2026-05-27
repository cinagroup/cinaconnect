# @cinacoin/batch-transaction

Cinacoin Batch Transaction SDK — atomic multi-operation builder with gas estimation.

## Installation

```bash
npm install @cinacoin/batch-transaction
```

## Usage

```ts
import { BatchTransaction, BatchExecutor } from '@cinacoin/batch-transaction';

const batch = new BatchTransaction({ chainId: 1 });
batch.add(createTransferOperation({ to: '0x...', amount: '1.0' }));
const result = await BatchExecutor.execute(batch);
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `BatchTransaction` | class | Main batch transaction builder |
| `BatchExecutor` | class | Executes batch transactions |
| `createTransferOperation` | function | Create a transfer operation |
| `createApproveOperation` | function | Create an approve operation |
| `createSwapOperation` | function | Create a swap operation |
| `createCustomOperation` | function | Create a custom operation |
| `BatchConfig` | type | Batch configuration |
| `Operation` | type | Base operation type |
| `BatchExecutionResult` | type | Execution result type |
