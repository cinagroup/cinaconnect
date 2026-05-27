# Gas Estimator API

> `@cinacoin/gas-estimator` — EVM 和 Solana 的 Gas 估算。

## Installation

```bash
npm install @cinacoin/gas-estimator
```

## Usage

```typescript
import { GasEstimator, DEFAULT_CHAINS } from '@cinacoin/gas-estimator'

const estimator = new GasEstimator({
  chains: DEFAULT_CHAINS,
  cacheDuration: 30_000,
})

// EVM gas estimation
const estimate = await estimator.estimateGas({
  chainId: 1,
  to: '0x...',
  data: '0x',
  value: '1000000000000000000',
})
console.log(`Gas: ${estimate.gasLimit} | Price: ${estimate.gasPrice}`)

// Solana gas estimation
const solEstimate = await estimator.estimateSolana({
  feePayer: 'So11111111111111111111111111111111111111112',
})
```

## Gas Price Cache

```typescript
import { GasPriceCache } from '@cinacoin/gas-estimator'

const cache = new GasPriceCache({ ttl: 60_000 })
cache.set(1, gasData) // cache for chain ID 1
const cached = cache.get(1)
```

## Chain-specific Estimators

```typescript
import { EVMEstimator, SolanaEstimator } from '@cinacoin/gas-estimator'

const evmEstimator = new EVMEstimator({ rpcUrl: 'https://eth.llamarpc.com' })
const solEstimator = new SolanaEstimator({ rpcUrl: 'https://api.mainnet-beta.solana.com' })
```

## Error Handling

```typescript
try {
  const estimate = await estimator.estimateGas({ chainId: 1, to: '0x...', data: '0x' })
} catch (err) {
  if (err.code === 'RPC_ERROR') { /* RPC failed */ }
  if (err.code === 'ESTIMATION_FAILED') { /* could not estimate */ }
}
```

## See Also

- [Gas Sponsorship](./gas-sponsorship.md)
