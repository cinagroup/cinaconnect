# @cinaconnect/paymaster

Paymaster client for CinaConnect — gas sponsorship and paymaster data.

## Installation

```bash
npm install @cinaconnect/paymaster
```

## Usage

```ts
import { PaymasterClient } from '@cinaconnect/paymaster';

const client = new PaymasterClient({ url: 'https://api.example.com' });
const paymasterData = await client.getPaymasterData({ userOp });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `PaymasterClient` | class | Main paymaster client |
| `PaymasterConfig` | type | Client configuration |
| `PaymasterData` | type | Paymaster response data |
| `SponsorshipResult` | type | Sponsorship result type |
