# Passkey Auth API

> `@cinacoin/passkey-auth` — WebAuthn 基础的 Passkey 认证。

## Installation

```bash
npm install @cinacoin/passkey-auth
```

## PasskeyManager

```typescript
import { PasskeyManager, defaultStorage } from '@cinacoin/passkey-auth'

const passkeyManager = new PasskeyManager({
  rpId: 'mydapp.com',
  rpName: 'My dApp',
  storage: defaultStorage,
})

// Register a new passkey
const result = await passkeyManager.register('user-123')
console.log('Passkey registered:', result.publicKey)

// Authenticate
const auth = await passkeyManager.authenticate()
console.log('Authenticated:', auth.address)
```

## WebAuthnClient

```typescript
import { WebAuthnClient, buildRegistrationOptions, buildAuthenticationOptions } from '@cinacoin/passkey-auth'

const client = new WebAuthnClient()

// Build registration options
const options = await buildRegistrationOptions({
  userId: 'user-123',
  userName: 'alice@example.com',
  rpId: 'mydapp.com',
  rpName: 'My dApp',
})

// Build authentication options
const authOptions = await buildAuthenticationOptions({
  rpId: 'mydapp.com',
})
```

## Crypto Utilities

```typescript
import {
  generateKeypair,
  generateChallenge,
  encodeChallenge,
  decodeChallenge,
  signData,
  verifySignature,
  deriveAddress,
  compressPublicKey,
} from '@cinacoin/passkey-auth'

const keypair = generateKeypair()
const challenge = generateChallenge()
const signature = signData(keypair.privateKey, data)
const valid = verifySignature(keypair.publicKey, data, signature)
const address = deriveAddress(keypair.publicKey)
```

## Password Management

```typescript
import {
  setPassword,
  verifyPassword,
  changePassword,
  calculatePasswordStrength,
  hashPassword,
  generateSalt,
  getPasswordEntry,
  removePassword,
  clearAllPasswords,
} from '@cinacoin/passkey-auth'

// Set a password for a user
await setPassword('user-123', 'secure-password')

// Verify password
const valid = await verifyPassword('user-123', 'secure-password')

// Check password strength
const strength = calculatePasswordStrength('password') // 'weak' | 'medium' | 'strong'
```

## Storage

```typescript
import { MemoryStorage, BrowserStorage, defaultStorage } from '@cinacoin/passkey-auth'

// In-memory (for testing)
const memoryStorage = new MemoryStorage()

// Browser localStorage
const browserStorage = new BrowserStorage()

// Default (BrowserStorage in browser, MemoryStorage otherwise)
const storage = defaultStorage
```

## Error Handling

Passkey operations throw `WebAuthnError` for credential failures:

```typescript
try {
  const result = await passkeyManager.authenticate()
} catch (err) {
  if (err.name === 'NotAllowedError') {
    // User cancelled the operation
  }
  if (err.name === 'SecurityError') {
    // Invalid RP ID or origin
  }
}
```

## See Also

- [SIWE](./siwe.md)
- [SIWX](./siwx.md)
