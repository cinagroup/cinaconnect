# @cinacoin/gas-estimator

Gas estimation for EVM (EIP-1559 + legacy) and Solana compute budget transactions. Includes caching, fee history analysis, and price prediction.

## Installation

```bash
npm install @cinacoin/gas-estimator
```

## Usage

### EVM Gas Estimation

```ts
import { GasEstimator } from '@cinacoin/gas-estimator';

const estimator = new GasEstimator();

// EIP-1559 estimation
const evm = await estimator.estimateEvm(
  21000n,       // gas limit
  20_000_000_000n,  // base fee
  2_000_000_000n,   // priority fee
);
console.log(evm.estimatedCost);

// Gas price prediction
const history = await estimator.getFeeHistory(3);
const prediction = await estimator.predictGasPrices(20_000_000_000n, history);
console.log(prediction.fast); // { maxFeePerGas, maxPriorityFeePerGas, estimatedTime }
```

### Solana Compute Budget

```ts
// Solana compute budget estimation
const sol = await estimator.estimateSolana(200_000, 1000n);
console.log(sol.estimatedCost); // total in lamports
```

## API

### GasEstimator

| Method | Description |
|--------|-------------|
| `estimateEvm(gasLimit, baseFee, priorityFee)` | Estimate EIP-1559 gas |
| `estimateSolana(computeUnits?, unitPrice?)` | Estimate Solana compute budget |
| `getGasPrice(rpcUrl)` | Get current gas price |
| `getFeeHistory(blockCount?)` | Get fee history |
| `predictGasPrices(baseFee, history)` | Predict price tiers (slow/standard/fast) |
| `clearCache()` | Clear cached gas data |

## License

MIT
