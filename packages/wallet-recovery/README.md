# @cinacoin/wallet-recovery

Cinacoin Wallet Recovery — Shamir's Secret Sharing with multi-provider wallet recovery.

## Installation

```bash
npm install @cinacoin/wallet-recovery
```

## Usage

```ts
import { WalletRecovery, ShamirShare } from '@cinacoin/wallet-recovery';

const recovery = new WalletRecovery({
  threshold: 2,
  totalShares: 3,
});

// Create recovery shares
const shares: ShamirShare[] = await recovery.createShares({
  secret: 'YOUR_PRIVATE_KEY',
  providers: ['email', 'social', 'device'],
});

// Recover wallet from shares
const recovered = await recovery.recover([shares[0], shares[1]]);
```

## License

MIT
