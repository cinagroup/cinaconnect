# SIWX API

> `@cinacoin/siwx` — 跨链统一认证（Sign-In with Cross-chain）。

## Installation

```bash
npm install @cinacoin/siwx
```

## Usage

```typescript
import { createSignInMessage, verifySignIn, SIWXRegistry } from '@cinacoin/siwx'

// Create sign-in message for any chain
const message = createSignInMessage({
  chainType: 'evm',
  address: '0x...',
  domain: 'mydapp.com',
  uri: 'https://mydapp.com',
  statement: 'Sign in to My dApp',
})

// Verify signature
const result = await verifySignIn({
  chainType: 'evm',
  message,
  signature: '0x...',
  address: '0x...',
})
```

## Chain-specific Signing

```typescript
import {
  createEvmSignInMessage, verifyEvmSignature,
  createSolanaSignInMessage, verifySolanaSignature,
  createBitcoinSignInMessage, verifyBitcoinSignature,
  createTonSignInMessage, verifyTonSignature,
  createTronSignInMessage, verifyTronSignature,
} from '@cinacoin/siwx'

// EVM (EIP-4361)
const evmMsg = createEvmSignInMessage({ address: '0x...', domain: 'mydapp.com' })
const evmValid = await verifyEvmSignature(evmMsg, signature, address)

// Solana
const solMsg = createSolanaSignInMessage({ address: '...', domain: 'mydapp.com' })
const solValid = await verifySolanaSignature(solMsg, signature, address)

// Bitcoin (BIP-322)
const btcMsg = createBitcoinSignInMessage({ address: 'bc1q...', domain: 'mydapp.com' })
const btcValid = await verifyBitcoinSignature(btcMsg, signature, address)

// TON
const tonMsg = createTonSignInMessage({ address: '...', domain: 'mydapp.com' })
const tonValid = await verifyTonSignature(tonMsg, signature, address)

// TRON
const tronMsg = createTronSignInMessage({ address: 'T...', domain: 'mydapp.com' })
const tronValid = await verifyTronSignature(tronMsg, signature, address)
```

## Verifier Registry

```typescript
import { VerifierRegistry, defaultVerifierRegistry } from '@cinacoin/siwx'

// Register custom verifier
defaultVerifierRegistry.register('custom', async (message, signature, address) => {
  // custom verification logic
  return { valid: true }
})
```

## Cloud Authentication

```typescript
import { CloudAuth, useCloudAuth, useCloudSession, useCloudAuthEvents } from '@cinacoin/siwx'

const cloudAuth = new CloudAuth({
  projectId: 'your-project-id',
})

// Cloud session
const session = await cloudAuth.getSession()
const verified = await cloudAuth.verify(session)

// React
const { session, isLoading } = useCloudSession()
const { events } = useCloudAuthEvents()
```

## Error Handling

```typescript
try {
  const result = await verifySignIn({ chainType: 'evm', message, signature, address })
} catch (err) {
  if (err.code === 'INVALID_SIGNATURE') { /* signature mismatch */ }
  if (err.code === 'MESSAGE_EXPIRED') { /* message expired */ }
}
```

## See Also

- [SIWE](./siwe.md)
- [Passkey Auth](./passkey-auth.md)
