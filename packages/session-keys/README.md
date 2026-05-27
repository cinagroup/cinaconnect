# @cinacoin/session-keys

Cinacoin Session Keys — temporary signing keys with policies and social recovery for ERC-4337 smart accounts.

## Installation

```bash
npm install @cinacoin/session-keys
```

## Usage

```ts
import { SessionKeyManager } from '@cinacoin/session-keys';

const manager = new SessionKeyManager({ smartAccount: '0x...' });
await manager.createSessionKey({ policy: { spendLimit: '1000000000000000000' } });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `SessionKeyManager` | class | Manages session keys |
| `SessionKeyPolicy` | type | Key policy type |
| `SessionKeyConfig` | type | Configuration type |
| `SpendLimitPolicy` | type | Spend limit policy |
| `TimeBoundPolicy` | type | Time-bound policy |
| `SocialRecoveryConfig` | type | Social recovery config |
