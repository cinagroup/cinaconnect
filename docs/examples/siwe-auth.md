# Sign-In With Ethereum (SIWE)

> Implement EIP-4361 Sign-In With Ethereum authentication — generate messages, sign with wallet, and verify on backend.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 / pnpm ≥ 8
- A project ID from your Cinacoin dashboard

## Installation

```bash
npm install @cinacoin/core-sdk @cinacoin/react @cinacoin/siwe
```

## Quick Start

```tsx
import { generateMessage, verifyMessage, generateNonce } from '@cinacoin/siwe'

// Generate SIWE message
const message = generateMessage({
  domain: 'mydapp.com',
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  uri: 'https://mydapp.com',
  chainId: 1,
  nonce: generateNonce(),
  statement: 'Sign in to access your account.',
})

// After user signs with wallet, verify:
const result = await verifyMessage(message, signature)
console.log('Valid:', result.valid)
```

## Complete Example

### 1. React SIWE Flow

```tsx
// src/components/SIWELogin.tsx
import { useState } from 'react'
import { useAccount, useCinacoin } from '@cinacoin/react'
import { generateMessage, generateNonce } from '@cinacoin/siwe'
import { Connector } from '@cinacoin/core-sdk'

function SIWELogin() {
  const account = useAccount()
  const { connect, disconnect } = useCinacoin()
  const [siweMessage, setSiweMessage] = useState('')
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)

  // Step 1: Generate SIWE message
  function generateSignInMessage() {
    if (!account.address) return

    const message = generateMessage({
      domain: window.location.host,
      address: account.address,
      uri: window.location.origin,
      chainId: account.chainId ?? 1,
      nonce: generateNonce(),
      statement: 'Sign in to My dApp to access your account.',
      expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    setSiweMessage(message)
  }

  // Step 2: Sign the SIWE message with wallet
  async function signIn() {
    if (!siweMessage || !account.address) return
    setLoading(true)

    try {
      const connector = new Connector({
        projectId: 'your-project-id',
      })

      // Request wallet to sign the message
      const signature = await connector.request({
        method: 'personal_sign',
        params: [siweMessage, account.address],
      })

      // Step 3: Verify signature on backend
      const response = await fetch('/api/auth/verify-siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: siweMessage,
          signature,
          address: account.address,
        }),
      })

      const result = await response.json()

      if (result.valid) {
        setVerified(true)
        console.log('✅ Authenticated!')
        // Store session token
        localStorage.setItem('authToken', result.token)
      } else {
        console.error('❌ Verification failed')
      }
    } catch (err) {
      console.error('Sign-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (verified) {
    return (
      <div>
        <h2>✅ Authenticated</h2>
        <p>Welcome, <code>{account.address}</code></p>
        <button onClick={() => { setVerified(false); disconnect() }}>
          Sign Out
        </button>
      </div>
    )
  }

  if (!account.address) {
    return (
      <div>
        <h2>Sign In With Ethereum</h2>
        <button onClick={() => connect('metamask')}>
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2>Sign In With Ethereum</h2>
      <p>Connected: <code>{account.address}</code></p>

      {!siweMessage ? (
        <button onClick={generateSignInMessage}>
          Generate Sign-In Message
        </button>
      ) : (
        <>
          <pre style={{ background: '#f5f5f5', padding: 12, fontSize: 12 }}>
            {siweMessage}
          </pre>
          <button onClick={signIn} disabled={loading}>
            {loading ? 'Signing...' : 'Sign & Verify'}
          </button>
        </>
      )}
    </div>
  )
}

export default SIWELogin
```

### 2. Backend Verification (Express)

```ts
// server/verify-siwe.ts
import express from 'express'
import { verifyMessage, parseMessage } from '@cinacoin/siwe'

const router = express.Router()

// In-memory nonce store (use Redis in production)
const usedNonces = new Set<string>()

router.post('/api/auth/verify-siwe', async (req, res) => {
  const { message, signature, address } = req.body

  if (!message || !signature || !address) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Parse the SIWE message to extract the nonce
    const parsed = parseMessage(message)

    // Check nonce hasn't been used (replay attack prevention)
    if (usedNonces.has(parsed.nonce)) {
      return res.status(400).json({ error: 'Nonce already used' })
    }

    // Verify the signature
    const result = await verifyMessage(message, signature)

    if (!result.valid) {
      return res.status(401).json({
        valid: false,
        errors: result.errors,
      })
    }

    // Verify the address matches
    if (result.address.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        error: 'Address mismatch',
        valid: false,
      })
    }

    // Verify domain matches (prevent phishing)
    if (result.domain !== req.headers.host?.split(':')[0]) {
      return res.status(401).json({
        error: 'Domain mismatch',
        valid: false,
      })
    }

    // Mark nonce as used
    usedNonces.add(parsed.nonce)

    // Generate session token
    const token = generateSessionToken(address, parsed)

    res.json({
      valid: true,
      token,
      address: result.address,
    })
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' })
  }
})

function generateSessionToken(address: string, parsed: any): string {
  // In production: use JWT with expiration
  return `session_${address}_${Date.now()}`
}

export default router
```

### 3. Standalone SIWE Utilities

```ts
import {
  generateMessage,
  parseMessage,
  verifyMessage,
  generateNonce,
  generateTimestamp,
  fullValidation,
  validateSIWEParams,
} from '@cinacoin/siwe'

// --- Generate a SIWE message ---
const message = generateMessage({
  domain: 'login.xyz',
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  statement: 'I accept the Terms of Service.',
  uri: 'https://login.xyz',
  version: '1',
  chainId: 1,
  nonce: generateNonce(),          // Random 16+ char string
  issuedAt: generateTimestamp(),    // ISO 8601 timestamp
  expirationTime: '2025-12-31T23:59:59Z',
  notBefore: '2025-01-01T00:00:00Z',
  requestId: 'request-001',
  resources: [
    'https://login.xyz/terms',
    'ipfs://Qm...',
  ],
})

console.log(message)
// Output:
// login.xyz wants you to sign in with your Ethereum account:
// 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38
//
// I accept the Terms of Service.
//
// URI: https://login.xyz
// Version: 1
// Chain ID: 1
// Nonce: a1b2c3d4e5f6...
// Issued At: 2025-01-01T00:00:00.000Z
// Expiration Time: 2025-12-31T23:59:59Z
// Not Before: 2025-01-01T00:00:00Z
// Request ID: request-001
// Resources:
// - https://login.xyz/terms
// - ipfs://Qm...

// --- Parse a SIWE message ---
const parsed = parseMessage(message)
console.log(parsed.domain)        // 'login.xyz'
console.log(parsed.address)       // '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38'
console.log(parsed.chainId)       // 1
console.log(parsed.nonce)         // 'a1b2c3d4e5f6...'

// --- Validate parameters before generating ---
const errors = validateSIWEParams({
  domain: 'login.xyz',
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  uri: 'https://login.xyz',
  chainId: 1,
  nonce: 'abc123',
})
console.log('Validation errors:', errors) // []

// --- Full validation (including temporal) ---
const fullResult = fullValidation({
  domain: 'login.xyz',
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  uri: 'https://login.xyz',
  chainId: 1,
  nonce: 'abc123',
  issuedAt: generateTimestamp(),
  expirationTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour
})
```

### 4. SIWE with Express Middleware

```ts
// server/siwe-middleware.ts
import { parseMessage, verifyMessage } from '@cinacoin/siwe'

// Middleware to verify SIWE auth on protected routes
export function siweAuthMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.slice(7)
  const session = verifySessionToken(token)

  if (!session || session.expired) {
    return res.status(401).json({ error: 'Session expired' })
  }

  req.user = { address: session.address }
  next()
}

// Usage:
// app.get('/api/profile', siweAuthMiddleware, (req, res) => {
//   res.json({ address: req.user.address })
// })
```

## Expected Output

```
✅ Authenticated!
Welcome, 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38
Token: session_0x742d...@1704067200000
```

## SIWE Message Structure

```
${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${uri}
Version: ${version}
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}
Not Before: ${notBefore}
Request ID: ${requestId}
Resources:
- ${resource1}
- ${resource2}
```

## Security Best Practices

1. **Always verify on the server** — never trust client-side verification
2. **Use nonces** — prevent replay attacks with one-time nonces
3. **Check expiration** — set reasonable expiration times (15 min – 24 h)
4. **Verify domain** — ensure the message domain matches your server
5. **Validate address** — confirm the signing address matches the claimed identity

## Related

- [Ethereum](./ethereum.md)
- [React Integration](./react-integration.md)
- [Next.js](./nextjs.md)
- [Security Guide](../guide/security.md)
