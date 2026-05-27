# @cinacoin/onramp-sdk

Cinacoin On-Ramp Aggregator SDK — multi-provider fiat-to-crypto gateway.

## Installation

```bash
npm install @cinacoin/onramp-sdk
```

## Usage

```ts
import { OnRampAggregator, OnRampWidget } from '@cinacoin/onramp-sdk';

const aggregator = new OnRampAggregator();
const quote = await aggregator.getQuote({ amount: 100, currency: 'USD', asset: 'USDC' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `OnRampAggregator` | class | Main aggregator class |
| `OnRampWidget` | component | On-ramp widget UI |
| `MoonPayProvider` | class | MoonPay provider adapter |
| `RampProvider` | class | Ramp provider adapter |
| `TransakProvider` | class | Transak provider adapter |
| `OnRampQuote` | type | Quote type |
| `OnRampResult` | type | Result type |
| `OnRampWidgetParams` | type | Widget parameters |
| `OnRampProviderId` | type | Provider ID enum |
