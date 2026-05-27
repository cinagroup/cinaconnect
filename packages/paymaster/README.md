# @cinacoin/paymaster

Paymaster client for Cinacoin — gas sponsorship and paymaster data.

## Installation

```bash
npm install @cinacoin/paymaster
```

## Usage

```ts
import { PaymasterClient } from '@cinacoin/paymaster';

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
