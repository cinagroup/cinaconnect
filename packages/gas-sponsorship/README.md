# @cinaconnect/gas-sponsorship

Enterprise gas sponsorship for smart accounts via paymaster integration.

## Installation

```bash
npm install @cinaconnect/gas-sponsorship
```

## Usage

```ts
import { GasSponsor } from '@cinaconnect/gas-sponsorship';

const sponsor = new GasSponsor({ provider: 'pimlico' });
const result = await sponsor.sponsorTransaction(tx);
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `GasSponsor` | class | Main gas sponsorship handler |
| `getPaymasterData` | function | Get paymaster data for tx |
| `getPaymasterAndData` | function | Get paymaster and data |
| `detectProvider` | function | Auto-detect paymaster provider |
| `useGasSponsorship` | hook | React hook for sponsorship |
| `GasEstimator` | component | Gas estimation UI |
| `SponsorshipConfig` | type | Configuration type |
| `SponsorshipResult` | type | Result type |
