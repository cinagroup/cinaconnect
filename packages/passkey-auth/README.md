# @cinacoin/passkey-auth

WebAuthn-based passkey authentication for blockchain applications. Supports registration, authentication, listing, and removal of passkey credentials with a fallback for server-side environments.

## Installation

```bash
npm install @cinacoin/passkey-auth
```

## Usage

### Browser Passkey Registration

```ts
import { PasskeyManager } from '@cinacoin/passkey-auth';

const passkey = new PasskeyManager({
  rpName: 'My App',
  rpId: 'myapp.com',
});

// Register
const result = await passkey.register('user-1', 'alice', 'Alice');
console.log(result.credentialId);

// Authenticate
const auth = await passkey.authenticate(result.credentialId);
console.log(auth.success);

// List all passkeys
const keys = await passkey.list();

// Remove a passkey
await passkey.remove(result.credentialId);
```

### Crypto Utilities

```ts
import { generateKeypair, signData, verifySignature, deriveAddress } from '@cinacoin/passkey-auth';

// Generate a P-256 keypair
const keypair = generateKeypair();

// Sign data
const signature = signData(keypair.privateKey, new TextEncoder().encode('Hello'));

// Verify
const valid = verifySignature(keypair.publicKey, data, signatureHex);

// Derive an address from the public key
const address = deriveAddress(keypair.publicKey);
```

## API

### PasskeyManager

| Method | Description |
|--------|-------------|
| `register(userId, userName, displayName)` | Register a new passkey |
| `authenticate(credentialId?)` | Authenticate with a passkey |
| `list()` | List all stored passkeys |
| `remove(id)` | Remove a passkey |
| `clear()` | Clear all passkeys |

## License

MIT
