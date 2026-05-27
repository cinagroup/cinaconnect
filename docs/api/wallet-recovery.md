# Wallet Recovery API

> `@cinacoin/wallet-recovery` — Shamir 秘密共享钱包恢复。

## Installation

```bash
npm install @cinacoin/wallet-recovery
```

## Usage

```typescript
import { WalletRecovery, splitSecret, combineShares } from '@cinacoin/wallet-recovery'

const recovery = new WalletRecovery({
  threshold: 3,
  totalShares: 5,
})

// Setup recovery
const result = await recovery.setup({
  secret: '0x1234...',
  providers: [
    { type: 'email', identifier: 'alice@example.com' },
    { type: 'phone', identifier: '+1234567890' },
    { type: 'social', identifier: 'google:alice@gmail.com' },
  ],
})

// Recover with providers
const recovered = await recovery.recoverWithProviders({
  providers: ['email', 'phone', 'social'],
})

// Recover with password
const recovered = await recovery.recoverWithPassword({
  password: 'my-secure-password',
})
```

## Secret Sharing

```typescript
import { splitSecret, combineShares, encryptShare, decryptShare } from '@cinacoin/wallet-recovery'

// Split a secret into shares (3-of-5)
const shares = splitSecret(secret, 3, 5)

// Combine shares to recover
const recovered = combineShares(shares.slice(0, 3))

// Encrypt shares for storage
const encrypted = await encryptShare(share, encryptionKey)
const decrypted = await decryptShare(encrypted, encryptionKey)
```

## React Hook

```tsx
import { useWalletRecovery } from '@cinacoin/wallet-recovery'

const { setup, recover, isSetup, recoveryProviders } = useWalletRecovery()
```

## Password-based Recovery

```typescript
import { deriveKeyFromPassword, setPassword, verifyPassword, calculatePasswordStrength } from '@cinacoin/wallet-recovery'

const strength = calculatePasswordStrength('password') // 'weak' | 'medium' | 'strong'
await setPassword('user-123', 'secure-password')
const valid = await verifyPassword('user-123', 'secure-password')
```

## Error Handling

```typescript
try {
  const recovered = await recovery.recoverWithProviders({ providers: ['email', 'phone'] })
} catch (err) {
  if (err.code === 'INSUFFICIENT_SHARES') { /* need more providers */ }
  if (err.code === 'INVALID_SHARE') { /* corrupted share */ }
}
```

## See Also

- [Embedded Wallet](./embedded-wallet.md)
- [Passkey Auth](./passkey-auth.md)
