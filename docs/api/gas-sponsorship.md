# Gas Sponsorship API

> `@cinacoin/gas-sponsorship` — 企业级 Gas 代付，支持 paymaster 集成。

## Installation

```bash
npm install @cinacoin/gas-sponsorship
```

## Usage

```typescript
import { GasSponsor, useGasSponsorship } from '@cinacoin/gas-sponsorship'

const sponsor = new GasSponsor({
  paymasterProvider: 'pimlico', // or 'alchemy', 'candle'
  paymasterUrl: 'https://api.pimlico.io/v2/...',
  apiKey: 'your-api-key',
})

// Sponsor a transaction
const result = await sponsor.sponsor({
  chainId: 1,
  target: '0x...',
  data: '0x...',
  value: '0',
})
```

## Paymaster Integration

```typescript
import { getPaymasterData, getPaymasterAndData, detectProvider } from '@cinacoin/gas-sponsorship'

// Get paymaster data for a transaction
const paymasterData = await getPaymasterData({
  chainId: 1,
  target: '0x...',
  data: '0x...',
  value: '0',
  sponsor: 'pimlico',
})

// Get full paymasterAndData
const fullData = await getPaymasterAndData({ /* ... */ })

// Auto-detect available paymaster providers
const provider = detectProvider(chainId)
```

## React Hook

```tsx
import { useGasSponsorship } from '@cinacoin/gas-sponsorship'

const { isEligible, sponsorTransaction, sponsorshipBalance } = useGasSponsorship({
  paymasterProvider: 'pimlico',
  paymasterUrl: 'https://api.pimlico.io/v2/...',
})

// Check if transaction is eligible
if (isEligible) {
  await sponsorTransaction(tx)
}
```

## React Component

```tsx
import { GasEstimator } from '@cinacoin/gas-sponsorship'

<GasEstimator
  chainId={1}
  to="0x..."
  data="0x..."
  value="0"
/>
```

## Error Handling

```typescript
try {
  const result = await sponsor.sponsor(tx)
} catch (err) {
  if (err.code === 'NOT_ELIGIBLE') { /* transaction not eligible for sponsorship */ }
  if (err.code === 'INSUFFICIENT_BALANCE') { /* paymaster balance too low */ }
}
```

## See Also

- [Gas Estimator](./gas-estimator.md)
- [AA SDK](./aa-sdk.md)
