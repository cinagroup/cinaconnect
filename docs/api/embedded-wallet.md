# Embedded Wallet API

> `@cinacoin/embedded-wallet` — 嵌入式钱包系统，支持确定性密钥派生、社交认证和加密备份。

## Installation

```bash
npm install @cinacoin/embedded-wallet
```

## Usage

```typescript
import { EmbeddedWallet, WalletManager } from '@cinacoin/embedded-wallet'

// Create wallet
const wallet = new EmbeddedWallet({
  authMethod: 'email',
  encryptionKey: 'user-derived-key',
})

// Initialize
await wallet.initialize()

// Sign transaction
const signedTx = await wallet.signTransaction({
  to: '0x...',
  value: '1000000000000000000',
  data: '0x',
})

// Backup
import { backupWallet, recoverWallet } from '@cinacoin/embedded-wallet'
const backup = await backupWallet(wallet)
const recovered = await recoverWallet(backup, 'recovery-key')
```

## React Integration

```tsx
import { EmbeddedWalletProvider, useEmbeddedWallet } from '@cinacoin/embedded-wallet'

function App() {
  return (
    <EmbeddedWalletProvider authMethod="email">
      <WalletView />
    </EmbeddedWalletProvider>
  )
}

function WalletView() {
  const { wallet, address, isReady } = useEmbeddedWallet()

  if (!isReady) return <p>Loading...</p>
  return <p>Wallet: {address}</p>
}
```

## Auth Methods

- `email` — Email-based authentication
- `social` — Social OAuth (Google, Apple, etc.)
- `passkey` — WebAuthn passkey
- `custom` — Custom auth provider

## Error Handling

```typescript
try {
  await wallet.signTransaction(tx)
} catch (err) {
  if (err.code === 'NOT_INITIALIZED') { /* call initialize() first */ }
  if (err.code === 'AUTH_FAILED') { /* re-authenticate */ }
}
```

## See Also

- [Passkey Auth](./passkey-auth.md)
- [Wallet Recovery](./wallet-recovery.md)
