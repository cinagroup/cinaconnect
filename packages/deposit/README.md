# @cinaconnect/deposit

Deposit with Exchange feature for CinaConnect.

## Installation

```bash
npm install @cinaconnect/deposit
```

## Usage

```ts
import { DepositService, DepositModal } from '@cinaconnect/deposit';

const depositUrl = await depositService.getDepositUrl({ exchange: 'binance', asset: 'USDT' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `DepositService` | class | Main deposit service |
| `depositService` | singleton | Global deposit service instance |
| `DepositModal` | component | Deposit modal UI |
| `DepositButton` | component | Deposit button UI |
| `useDeposit` | hook | React hook for deposits |
| `useAvailableExchanges` | hook | Hook for available exchanges |
| `EXCHANGES` | const | Available exchanges list |
| `DepositRequest` | type | Deposit request type |
| `DepositResult` | type | Deposit result type |
| `ExchangeInfo` | type | Exchange metadata type |
