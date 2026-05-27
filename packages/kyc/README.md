# @cinacoin/kyc

KYC/AML compliance screening for transactions and payments.

## Installation

```bash
npm install @cinacoin/kyc
```

## Usage

```ts
import { screenAddress, KycBadge } from '@cinacoin/kyc';

const result = await screenAddress('0x...');
if (result.riskLevel === 'high') { /* block */ }
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `screenAddress` | function | Screen an address for risk |
| `screenTransaction` | function | Screen a transaction |
| `screenPayment` | function | Screen a payment |
| `getRiskScore` | function | Get risk score for address |
| `getComplianceReport` | function | Generate compliance report |
| `isSanctioned` | function | Check if address is sanctioned |
| `isMixer` | function | Check if address is a mixer |
| `KycBadge` | component | KYC badge UI |
| `KycModal` | component | KYC modal UI |
| `useKycScreening` | hook | React hook for screening |
| `KycStatus` | type | KYC status type |
| `RiskLevel` | type | Risk level enum |
