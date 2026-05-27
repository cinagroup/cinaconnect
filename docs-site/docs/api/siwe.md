# SIWE

> `@cinacoin/siwe` — Sign-In with Ethereum integration for Cinacoin.

## Installation

```bash
npm install @cinacoin/siwe @cinacoin/core-sdk
```

## Usage

```typescript
import { SIWE } from '@cinacoin/siwe'

const siwe = new SIWE({
  domain: 'yourdomain.com',
  uri: 'https://yourdomain.com',
  statement: 'Sign in to Cinacoin',
})
```

## Methods

- `createMessage()` — Generate the SIWE message
- `verify(message, signature)` — Verify a signed SIWE message
- `getSession()` — Get current session
- `signOut()` — End the session

## Related

- [SIWX](/api/siwx) — Sign-In with X (extended)
- [Passkey Auth](/api/passkey-auth) — Passkey authentication
- [Social Login](/api/social-login) — Social login integration
