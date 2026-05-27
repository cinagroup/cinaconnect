# KYC API

> `@cinacoin/kyc` — KYC/AML 合规筛选。

## Installation

```bash
npm install @cinacoin/kyc
```

## Usage

```typescript
import { screenAddress, screenTransaction, getRiskScore, getComplianceReport } from '@cinacoin/kyc'

// Screen an address
const result = await screenAddress('0x...')
console.log('Risk:', result.riskLevel)

// Screen a transaction
const txRisk = await screenTransaction({
  from: '0x...',
  to: '0x...',
  value: '1000000000000000000',
  chainId: 1,
})

// Get risk score
const score = getRiskScore(result)
console.log('Score:', score)
```

## Sanctions Lists

```typescript
import { seedLists, isSanctioned, isMixer, isScamAddress, updateLists } from '@cinacoin/kyc'

// Seed compliance lists
seedLists()

// Check if address is sanctioned
if (isSanctioned('0x...')) { /* blocked */ }

// Check if address is a mixer
if (isMixer('0x...')) { /* high risk */ }

// Check if address is known scam
if (isScamAddress('0x...')) { /* warn user */ }
```

## React Integration

```tsx
import { useKycScreening, KycBadge, KycModal } from '@cinacoin/kyc'

const { screeningResult, isLoading } = useKycScreening(address)

<KycBadge status={screeningResult?.status} />
<KycModal onSubmit={(payload) => submitKyc(payload)} />
```

## Error Handling

```typescript
try {
  const result = await screenAddress('0x...')
} catch (err) {
  if (err.code === 'LIST_NOT_AVAILABLE') { /* compliance list not loaded */ }
}
```

## See Also

- [Travel Rule](./travel-rule.md)
