# Security Best Practices

> Protect your users' assets and data when building with Cinacoin.

---

## Table of Contents

1. [API Key Management](#api-key-management)
2. [Secret Handling](#secret-handling)
3. [Input Validation](#input-validation-best-practices)
4. [XSS/CSRF Protection](#xsscsrf-protection)
5. [Phishing Prevention](#phishing-prevention)
6. [Private Key & Seed Phrase Handling](#private-key--seed-phrase-handling)
7. [Content Security Policy](#content-security-policy-csp)
8. [WebSocket Security](#websocket-security)
9. [Session Encryption](#session-encryption-chacha20-poly1305)
10. [Key Management](#key-management-best-practices)
11. [Additional Security Measures](#additional-security-measures)
12. [Audit Checklist](#audit-checklist)

---

---

## API Key Management

### RPC Endpoints

RPC endpoints are critical infrastructure. Compromised RPC keys allow attackers to intercept or manipulate blockchain reads.

**Best practices:**

```bash
# .env — never commit to version control
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/$INFURA_API_KEY

# Use separate keys per environment
ETH_RPC_URL_DEV=https://eth-sepolia.g.alchemy.com/v2/$ALCHEMY_API_KEY
```

```typescript
// Validate RPC endpoints at startup
function validateRpcUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Ensure it's HTTPS
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'wss:') {
      throw new Error('RPC URL must use HTTPS or WSS')
    }
    // Check for API key in path (common pattern)
    if (url.includes('$') || url.includes('YOUR_KEY')) {
      throw new Error('Unresolved environment variable in RPC URL')
    }
    return true
  } catch {
    return false
  }
}

const rpcUrls = Object.values(config.rpcUrls)
for (const url of rpcUrls) {
  if (!validateRpcUrl(url)) {
    throw new Error(`Invalid RPC URL: ${url}`)
  }
}
```

### DEX Aggregator API Keys

SwapSDK and other DEX aggregators require API keys that should never be exposed client-side for production use.

```typescript
// ❌ BAD — API key visible in browser bundle
const swap = new SwapSDK({
  apiKey: process.env.NEXT_PUBLIC_SWAP_API_KEY, // leaked!
})

// ✅ GOOD — proxy through your backend
// Frontend
const quote = await fetch('/api/swap/quote', {
  method: 'POST',
  body: JSON.stringify({ fromToken, toToken, amount }),
})

// Backend (serverless function)
export async function POST(req: Request) {
  const swap = new SwapSDK({
    apiKey: process.env.SWAP_API_KEY, // server-side only
  })
  const quote = await swap.getBestQuote(await req.json())
  return Response.json(quote)
}
```

### Key Rotation Schedule

| Key Type | Rotation Frequency | Method |
|----------|-------------------|--------|
| RPC provider keys | Quarterly | Provider dashboard |
| DEX aggregator keys | Quarterly | Provider dashboard |
| Magic.link API keys | Semi-annually | Magic dashboard |
| Project IDs | Annually | Cinacoin dashboard |
| Signing keys (SIWE nonces) | Per session | Auto-generated |

---

## Secret Handling

### Cloudflare Workers

When deploying Cinacoin relay or API proxies to Cloudflare Workers:

```typescript
// wrangler.toml — define secrets at deploy time
[vars]
PROJECT_ID = "your-project-id"
RELAY_URL = "wss://relay.cinacoin.com/v1"

# Set secrets via wrangler CLI (NOT in wrangler.toml)
# wrangler secret put SWAP_API_KEY
# wrangler secret put MAGIC_API_KEY

export default {
  async fetch(request: Request, env: Env) {
    // Access secrets via env object — never exposed to client
    const apiKey = env.SWAP_API_KEY
    if (!apiKey) {
      return new Response('Server misconfigured', { status: 500 })
    }
    // ...
  },
}
```

**Secrets checklist for Cloudflare:**

```bash
# Set all required secrets before deploying
wrangler secret put CINA_PROJECT_ID
wrangler secret put CINA_RELAY_URL
wrangler secret put SWAP_API_KEY
wrangler secret put MAGIC_API_KEY
wrangler secret put SENTRY_DSN

# Verify secrets are set
wrangler secret list

# Deploy
wrangler deploy --env production
```

### npm Tokens & CI/CD

```bash
# .npmrc for private packages — use CI secrets, not files
# In GitHub Actions:
# Settings → Secrets → Add NPM_TOKEN
# Then in workflow:
# - name: Install dependencies
#   run: npm ci
#   env:
#     NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

# Locally, use keychain:
npm config set //registry.npmjs.org/:_authToken "$(security find-generic-password -ws npmjs.com)"
```

### Environment Variable Classification

| Classification | Example | Where |
|---------------|---------|-------|
| **Public** (safe for browser) | `NEXT_PUBLIC_PROJECT_ID` | Frontend bundle |
| **Private** (server only) | `DATABASE_URL` | Backend only |
| **Secret** (never log) | `API_KEY`, `PRIVATE_KEY` | Secret manager |
| **Build-time** | `NODE_ENV`, `VERSION` | Build pipeline |

```typescript
// Runtime check: ensure no secrets leak to client bundle
if (typeof window !== 'undefined') {
  const dangerousKeys = ['DATABASE_URL', 'API_KEY', 'PRIVATE_KEY', 'SECRET']
  for (const key of dangerousKeys) {
    if (process.env[key]) {
      console.error(`CRITICAL: ${key} is exposed to the browser!`)
    }
  }
}
```

---

## Input Validation Best Practices

### Address Validation

```typescript
import { isAddress, isBytes, checksumAddress } from 'viem'

function validateAddress(input: string): `0x${string}` {
  // Check format
  if (!isAddress(input)) {
    throw new Error(`Invalid Ethereum address: ${input}`)
  }
  // Normalize to checksum
  return checksumAddress(input as `0x${string}`)
}

// Solana address validation
import { PublicKey } from '@solana/web3.js'

function validateSolanaAddress(input: string): string {
  try {
    return new PublicKey(input).toBase58()
  } catch {
    throw new Error(`Invalid Solana address: ${input}`)
  }
}
```

### Amount Validation

```typescript
import { parseUnits, parseEther } from 'viem'

interface TransferInput {
  to: string
  amount: string
  decimals: number
}

function validateTransfer(input: TransferInput) {
  // Address validation
  const to = validateAddress(input.to)

  // Amount must be a valid number string
  const amountNum = Number(input.amount)
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error('Amount must be a positive number')
  }
  if (!Number.isFinite(amountNum)) {
    throw new Error('Amount must be finite')
  }

  // Convert with proper decimals
  const amount = parseUnits(input.amount, input.decimals)

  // Safety cap (e.g., 10M USDC)
  const maxAmount = parseUnits('10000000', input.decimals)
  if (amount > maxAmount) {
    throw new Error('Amount exceeds safety cap')
  }

  return { to, amount }
}
```

### Contract Call Validation

```typescript
import { encodeFunctionData, parseAbi } from 'viem'

// Validate function calls before encoding
function validateContractCall(abi: any, functionName: string, args: unknown[]) {
  const parsedAbi = parseAbi(abi)
  const fn = parsedAbi.find(
    (item) => item.type === 'function' && item.name === functionName
  )
  if (!fn) {
    throw new Error(`Function ${functionName} not found in ABI`)
  }
  if (fn.inputs.length !== args.length) {
    throw new Error(`Expected ${fn.inputs.length} args, got ${args.length}`)
  }
}
```

### URL & Deep Link Validation

```typescript
function validateDeepLink(url: string): { protocol: string; params: URLSearchParams } {
  const parsed = new URL(url)

  // Only allow expected protocols
  const allowedProtocols = ['https:', 'wc:', 'ethereum:', 'solana:']
  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`)
  }

  // Validate WC URI format
  if (parsed.protocol === 'wc:') {
    const match = url.match(/^wc:([a-f0-9]{64})@([0-9]+)/)
    if (!match) {
      throw new Error('Invalid WalletConnect URI format')
    }
  }

  return { protocol: parsed.protocol, params: parsed.searchParams }
}
```

### Sanitizing User-Generated Content

```typescript
import DOMPurify from 'dompurify'

function sanitizeMessage(raw: string): string {
  // Remove all HTML/JS — plain text only
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

// For rich text (if needed)
function sanitizeRichMessage(raw: string): string {
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOWED_URI_REGEXP: /^https?:\/\//,
  })
}
```

---

## XSS/CSRF Protection

### Cross-Site Scripting (XSS) Prevention

**React (auto-escapes by default):**

```tsx
// ✅ React escapes content automatically
function DisplayUsername({ username }: { username: string }) {
  return <span>Welcome, {username}</span> // XSS-safe
}

// ❌ DANGER — bypasses escaping
function UnsafeHtml({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// ✅ Safe — sanitize before rendering
function SafeHtml({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
}
```

**Next.js Middleware CSP:**

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data: https: blob:;
    connect-src 'self' wss://relay.cinacoin.com https://*.cinacoin.com;
    frame-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `

  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s+/g, ' ').trim())
  return response
}

export const config = { matcher: '/:path*' }
```

### Cross-Site Request Forgery (CSRF) Protection

**API endpoints with CSRF tokens:**

```typescript
import { generateToken, verifyToken } from 'csrf'

// Generate CSRF token for forms
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req.session.secret)
  res.json({ csrfToken: token })
})

// Verify CSRF token on mutations
app.post('/api/auth/siwe', (req, res) => {
  const csrfToken = req.headers['x-csrf-token']
  if (!verifyToken(csrfToken, req.session.secret)) {
    return res.status(403).json({ error: 'Invalid CSRF token' })
  }
  // ... proceed with SIWE verification
})
```

**SameSite cookie attribute:**

```typescript
// Express session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: {
      secure: true,       // HTTPS only
      httpOnly: true,     // Not accessible via JS
      sameSite: 'strict', // CSRF protection
      maxAge: 3600000,    // 1 hour
    },
  })
)
```

**Double Submit Cookie Pattern:**

```typescript
// Set CSRF token as both cookie and request header
function setCsrfCookie(req: Request, res: Response) {
  const token = crypto.randomBytes(32).toString('hex')
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,    // Readable by JS to set header
    secure: true,
    sameSite: 'strict',
    path: '/',
  })
  return token
}

// Frontend: read cookie and set as header
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1]

fetch('/api/transaction', {
  method: 'POST',
  headers: {
    'X-XSRF-TOKEN': csrfToken,
    'Content-Type': 'application/json',
  },
})
```

---

## Content Security Policy (CSP)

### Recommended CSP Headers

Configure strict CSP headers to prevent XSS attacks and unauthorized script execution:

**Nginx:**

```nginx
server {
  # ...
  add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.cinacoin.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    connect-src 'self' wss://relay.cinacoin.com https://*.cinacoin.com https://*.magic.link;
    frame-src 'self' https://*.magic.link https://pay.cinacoin.com;
    worker-src 'self' blob:;
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  " always;
}
```

**Express.js:**

```typescript
import helmet from 'helmet'

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", 'https://*.cinacoin.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        'wss://relay.cinacoin.com',
        'https://*.cinacoin.com',
        'https://*.magic.link',
      ],
      frameSrc: ["'self'", 'https://*.magic.link', 'https://pay.cinacoin.com'],
      workerSrc: ["'self'", 'blob:'],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  })
)
```

**Next.js (next.config.ts):**

```typescript
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.cinacoin.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' wss://relay.cinacoin.com https://*.cinacoin.com https://*.magic.link",
  "frame-src 'self' https://*.magic.link https://pay.cinacoin.com",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

## WebSocket Security

### wss:// Only — Never ws://

All WebSocket connections **must** use TLS (`wss://`). Plain WebSocket (`ws://`) exposes relay traffic to interception.

```typescript
// ✅ Correct
const relayUrl = 'wss://relay.cinacoin.com/v1'

// ❌ Never do this
const relayUrl = 'ws://relay.cinacoin.com/v1'
```

### Verify WebSocket Connection

```typescript
function validateRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'wss:') {
      console.error('Relay URL must use wss:// protocol')
      return false
    }
    return true
  } catch {
    return false
  }
}
```

### TLS Configuration (Nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name relay.cinacoin.com;

  ssl_certificate /etc/letsencrypt/live/relay.cinacoin.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/relay.cinacoin.com/privkey.pem;

  # TLS 1.3 only
  ssl_protocols TLSv1.3;
  ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
  ssl_prefer_server_ciphers off;

  # WebSocket proxy
  location /v1 {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
  }
}
```

---

## Session Encryption (ChaCha20-Poly1305)

### How It Works

All messages between dApp and wallet are encrypted end-to-end:

```
┌──────┐              ┌────────┐              ┌───────┐
│ dApp │──encrypted──►│ Relay  │──encrypted──►│ Wallet│
│      │◄─encrypted───│        │◄─encrypted───│       │
└──────┘              └────────┘              └───────┘

Key: X25519 ECDH (never touches relay)
Cipher: ChaCha20-Poly1305 AEAD
```

**Critical facts:**
- Relay server **cannot** decrypt messages — it only routes by topic
- Keys are negotiated via X25519 Diffie-Hellman between dApp and wallet
- Each pairing generates a fresh key pair
- Session keys are ephemeral and destroyed on disconnect

### Implementation Reference

```typescript
import { generateKeyPair, deriveSharedSecret, encrypt, decrypt } from '@cinacoin/core/crypto'

// 1. Generate ephemeral key pair
const keyPair = generateKeyPair()
// { publicKey: Uint8Array, privateKey: Uint8Array }

// 2. Exchange public keys with peer (via relay)
//    Send your publicKey, receive their publicKey

// 3. Derive shared secret (ECDH)
const sharedSecret = deriveSharedSecret(keyPair.privateKey, peerPublicKey)

// 4. Encrypt messages
const ciphertext = encrypt(sharedSecret, JSON.stringify({ method: 'eth_sendTransaction', params: [...] }))

// 5. Decrypt received messages
const plaintext = decrypt(sharedSecret, receivedCiphertext)
```

---

## Key Management Best Practices

### What Never to Do

| ❌ Anti-Pattern | Risk |
|-----------------|------|
| Hardcode private keys in frontend code | Keys visible in bundle, git history, browser DevTools |
| Store private keys in localStorage | Accessible to XSS attacks |
| Transmit private keys over WebSocket/HTTP | Intercepted in transit |
| Log private keys or seed phrases | Exposed in log aggregators |
| Use the same key for multiple users | Single point of failure |

### What to Do

| ✅ Practice | Description |
|------------|-------------|
| Hardware wallets | Use Ledger/Trezor for high-value operations |
| Multi-sig | Require 2-of-3 or 3-of-5 for project treasury |
| Session keys | Use restricted, expiring keys for dApp interactions |
| Key rotation | Rotate operational keys on a schedule |
| Social recovery | Implement ERC-4337 social recovery for smart accounts |

### Environment Variable Security

```bash
# .env.production (never commit this file)
CINA_PROJECT_ID=your-production-id
CINA_RELAY_URL=wss://relay.cinacoin.com/v1
CINA_ANALYTICS_KEY=your-analytics-key
MAGIC_API_KEY=pk_live_xxxx
SENTRY_DSN=https://xxxx@yyyy.ingest.sentry.io/zzzz
```

```typescript
// Verify required env vars at startup
const required = ['CINA_PROJECT_ID', 'CINA_RELAY_URL']
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
}
```

---

## Phishing Prevention

### Domain Verification (Verify API)

Cinacoin's Verify API helps users identify legitimate dApps:

```typescript
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet],
  metadata: {
    name: 'MyDeFi App',
    description: 'A trusted DeFi platform',
    url: 'https://mydefi.app',
    icons: ['https://mydefi.app/logo.png'],
    verifyUrl: 'https://verify.cinacoin.com/v1',
  },
}
```

**How Verify works:**
1. Cinacoin scans registered domains and verifies metadata
2. Verified dApps show a green badge in the connect modal
3. Unverified or suspicious dApps show warnings to users

### Register Your dApp

```bash
# Register with Verify API
curl -X POST https://verify.cinacoin.com/v1/register \
  -H "Authorization: Bearer $VERIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "mydefi.app",
    "name": "MyDeFi App",
    "description": "A trusted DeFi platform",
    "iconUrl": "https://mydefi.app/logo.png",
    "ownerAddress": "0x1234...5678"
  }'
```

### User Education

Educate users to:
- ✅ Always check the domain in the wallet connection prompt
- ✅ Look for the verified badge (green checkmark)
- ✅ Never sign messages from unknown domains
- ✅ Bookmark your dApp URL to avoid typosquatting

---

## Additional Security Measures

### HTTP Security Headers

```nginx
# Add to your nginx server block
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "0" always;  # CSP handles XSS protection
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### Subresource Integrity (SRI)

When loading external scripts, use SRI hashes:

```html
<script
  src="https://cdn.cinacoin.com/sdk/v1.0.0/cinacoin.min.js"
  integrity="sha384-xxxxxxx"
  crossorigin="anonymous"
></script>
```

Generate SRI hashes:

```bash
curl -s https://cdn.cinacoin.com/sdk/v1.0.0/cinacoin.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

### Input Validation

Validate all user inputs and external data:

```typescript
import { isAddress, parseUnits } from 'viem'

function validateTransferInput(input: any) {
  // Validate address format
  if (!isAddress(input.to)) {
    throw new Error('Invalid recipient address')
  }

  // Validate amount is positive and within limits
  const amount = parseUnits(input.amount, 6)
  if (amount <= 0n) {
    throw new Error('Amount must be positive')
  }
  if (amount > 1_000_000n * 10n ** 6n) {
    throw new Error('Amount exceeds maximum (1M USDC)')
  }

  return { to: input.to as `0x${string}`, amount }
}
```

### Rate Limiting

Protect your API endpoints:

```typescript
import rateLimit from 'express-rate-limit'

const siweLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  message: 'Too many authentication attempts, please try again later',
})

app.use('/api/auth/siwe', siweLimiter)
```

### Audit Trail

Log security-relevant events:

```typescript
cinacoin.on('connect', (session) => {
  logger.info('wallet_connected', {
    timestamp: new Date().toISOString(),
    wallet: session.wallet.name,
    chain: session.chain.id,
    sessionId: session.topic,
  })
})

cinacoin.on('disconnect', (session) => {
  logger.info('wallet_disconnected', {
    timestamp: new Date().toISOString(),
    sessionId: session.topic,
  })
})
```

---

---

## Private Key & Seed Phrase Handling

### Absolute Rules

1. **NEVER** request or handle seed phrases in your dApp frontend code
2. **NEVER** store private keys or seed phrases in browser storage (localStorage, sessionStorage, IndexedDB)
3. **NEVER** transmit private keys or seed phrases over any network connection
4. **NEVER** log private keys, seed phrases, or mnemonic words
5. **NEVER** include private keys in error reports or crash dumps

### What Your dApp Should Do

Your dApp should **only** interact with wallet addresses — never with private keys:

```typescript
// ✅ CORRECT — read-only access to connected address
const { address } = useAccount()
console.log('Connected:', address)

// ✅ CORRECT — request signature through wallet
const signature = await signMessage({ message: 'Hello' })

// ✅ CORRECT — request transaction through wallet
const txHash = await sendTransaction({ to, value, data })

// ❌ NEVER DO THIS
const privateKey = localStorage.getItem('privateKey') // NEVER
const wallet = new Wallet(privateKey) // NEVER in frontend
```

### Mnemonic / Seed Phrase UI Guidelines

If your application includes wallet creation features (e.g., a wallet app built on Cinacoin SDK):

```tsx
// Seed phrase display — critical UX considerations
function SeedPhraseDisplay({ mnemonic }: { mnemonic: string }) {
  const words = mnemonic.split(' ')
  const [revealed, setRevealed] = useState(false)

  return (
    <div>
      <div className="warning-banner">
        ⚠️ Never share these words. Anyone with this phrase can access your funds.
        Cinacoin support will NEVER ask for this.
      </div>

      {!revealed ? (
        <button onClick={() => setRevealed(true)}>Show Seed Phrase</button>
      ) : (
        <>
          <ol className="seed-phrase-grid">
            {words.map((word, i) => (
              <li key={i} data-testid="seed-word">
                {i + 1}. {word}
              </li>
            ))}
          </ol>

          {/* Screenshot prevention overlay */}
          <div className="anti-screenshot" />

          {/* Confirmation that user saved it */}
          <p>I have securely saved my seed phrase:</p>
          <input type="checkbox" id="confirmed" />
        </>
      )}
    </div>
  )
}
```

### Secure Key Storage Patterns

For backend services that must hold keys (e.g., paymaster signer):

```typescript
// ✅ Use a secret manager — never hardcoded
import { SecretsManager } from '@aws-sdk/client-secrets-manager'

async function getPaymasterSigner() {
  const client = new SecretsManager()
  const { SecretString } = await client.getSecretValue({
    SecretId: 'cinacoin/paymaster-signer-key',
  })

  if (!SecretString) {
    throw new Error('Paymaster signer key not found')
  }

  return new Wallet(SecretString)
}

// ✅ Or use Cloudflare Workers Secrets
// wrangler secret put PAYMASTER_SIGNER_KEY
export default {
  async fetch(request: Request, env: Env) {
    const signer = new Wallet(env.PAYMASTER_SIGNER_KEY)
    // ...
  },
}

// ✅ Or use HashiCorp Vault
import { Vault } from 'node-vault'

const vault = Vault({ endpoint: process.env.VAULT_ADDR })
await vault.unseal(process.env.VAULT_UNSEAL_KEYS)
const { data } = await vault.read('secret/cinacoin/paymaster-key')
```

### Browser Storage Security

If you must persist non-sensitive session data:

```typescript
// ❌ Insecure — readable by any script on the page
localStorage.setItem('wallet_address', address)

// ✅ More secure — httpOnly cookies (server-set, JS-inaccessible)
// Set via Set-Cookie header from your backend:
// Set-Cookie: session_addr=0x1234; HttpOnly; Secure; SameSite=Strict

// ✅ Alternative — sessionStorage (cleared on tab close)
sessionStorage.setItem('session_id', sessionId)

// ✅ Best — memory only (cleared on page refresh)
let sessionData: SessionState | null = null
```

### Key Compromise Response

If a key is suspected to be compromised:

1. **Immediately** rotate the affected key
2. **Revoke** all active sessions using the compromised key
3. **Notify** affected users if user keys are involved
4. **Audit** logs to determine scope of compromise
5. **Update** the incident response documentation

---

## Audit Checklist

### Pre-Production Audit

Use this checklist before deploying to production:

#### Infrastructure

| # | Check | Priority | Status |
|---|-------|----------|--------|
| 1 | All relay connections use wss:// (not ws://) | Critical | ☐ |
| 2 | TLS 1.3 enforced on all endpoints | Critical | ☐ |
| 3 | HSTS headers set with long max-age | High | ☐ |
| 4 | CSP headers configured and tested | Critical | ☐ |
| 5 | CORS restricted to known origins | High | ☐ |
| 6 | Rate limiting on all public endpoints | High | ☐ |
| 7 | WAF/CDD protection enabled | High | ☐ |
| 8 | DNSSEC enabled for all domains | Medium | ☐ |

#### Secrets & Keys

| # | Check | Priority | Status |
|---|-------|----------|--------|
| 9 | No secrets in source code or git history | Critical | ☐ |
| 10 | Environment variables classified (public/private/secret) | High | ☐ |
| 11 | API keys rotated per schedule | High | ☐ |
| 12 | CI/CD secrets use secure injection | High | ☐ |
| 13 | No private keys in browser storage | Critical | ☐ |
| 14 | Paymaster signer keys in secret manager | Critical | ☐ |

#### Application Security

| # | Check | Priority | Status |
|---|-------|----------|--------|
| 15 | Input validation on all user inputs | Critical | ☐ |
| 16 | XSS protection (auto-escaping, CSP) | Critical | ☐ |
| 17 | CSRF tokens on all state-changing endpoints | High | ☐ |
| 18 | SIWE nonce replay protection | Critical | ☐ |
| 19 | Session timeout configured | High | ☐ |
| 20 | Error messages don't leak sensitive data | High | ☐ |
| 21 | SRI hashes for external scripts | Medium | ☐ |
| 22 | Subresource integrity for CDN assets | Medium | ☐ |

#### Wallet & Transaction Security

| # | Check | Priority | Status |
|---|-------|----------|--------|
| 23 | Transaction simulation before sending | Critical | ☐ |
| 24 | Chain ID validation on all transactions | Critical | ☐ |
| 25 | Slippage limits enforced on swaps | High | ☐ |
| 26 | Address checksum validation | High | ☐ |
| 27 | Amount sanity checks (caps, positive values) | Critical | ☐ |
| 28 | EIP-5792 batch call limits enforced | High | ☐ |

#### Monitoring & Response

| # | Check | Priority | Status |
|---|-------|----------|--------|
| 29 | Error tracking (Sentry/Datadog) configured | High | ☐ |
| 30 | Uptime monitoring for relay and dApp | High | ☐ |
| 31 | Alerting on critical errors | High | ☐ |
| 32 | Incident response plan documented | High | ☐ |
| 33 | Security contact email published | Medium | ☐ |
| 34 | Dependency audit (pnpm audit) clean | High | ☐ |
| 35 | Domain verified with Cinacoin Verify API | High | ☐ |

### Post-Launch Audit

Run these checks regularly after launch:

```bash
# Weekly: dependency audit
pnpm audit --audit-level=high

# Monthly: secret scan
gitleaks detect --source . --report-path gitleaks-report.json

# Monthly: outdated dependencies
pnpm outdated

# Quarterly: full security review
# - Penetration test
# - CSP report review
# - Error log analysis
# - Incident response drill
```

### Automated Checks (CI/CD)

```yaml
# .github/workflows/security.yml
name: Security Checks
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Check for secrets in code
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Dependency audit
      - run: pnpm audit --audit-level=high

      # SAST scan
      - uses: github/codeql-action/analyze@v3

      # Build and check for exposed env vars
      - run: pnpm build
      - run: |
          # Check built JS for hardcoded secrets
          grep -r 'pk_live_\|sk_live_\|password.*=.*"' dist/ && exit 1 || true
```

---

*Security Best Practices — Cinacoin Documentation*
