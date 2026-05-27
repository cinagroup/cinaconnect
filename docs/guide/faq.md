# Frequently Asked Questions (FAQ)

> Everything you need to know about Cinacoin — from getting started to production deployment.

---

## Getting Started

### What is Cinacoin?

Cinacoin is a **full-stack, white-label Web3 SDK** by CinaGroup that enables wallet connections, multi-chain authentication, payments, smart accounts, and developer tools across web, mobile, and game engines. It is fully open-source (MIT License) and does **not** depend on any Reown/WalletConnect infrastructure.

Key capabilities:

- 🔗 **600+ wallets** via WalletConnect-compatible network (EVM, Solana, Bitcoin, TON, TRON)
- 💳 **Payments** — in-app swaps, fiat-to-crypto on-ramp, self-custodial payments
- 🔐 **Authentication** — SIWE, SIWX (multi-chain), social login, passkey/biometric
- 🏦 **Smart Accounts** — ERC-4337 gasless transactions, session keys, batch calls
- 📱 **Cross-platform** — React, Next.js, Vue, Svelte, React Native, Flutter, Android, iOS, Unity, Telegram, Farcaster

### How does Cinacoin compare to Reown/WalletConnect?

| Feature | Reown/WalletConnect | Cinacoin |
|---------|---------------------|-------------|
| **Infrastructure** | Third-party hosted (Reown Relay) | Self-hosted (your own Relay + RPC Proxy) |
| **Branding** | Reown branding in UI | Fully white-label, zero third-party traces |
| **Pricing** | $500–$5,000/month (beyond free tier) | Only your infrastructure cost |
| **MAU limits** | 500 on free tier | Unlimited |
| **Control** | Dependent on Reown's infrastructure | Fully autonomous |
| **License** | Community License (restrictive) | MIT License (permissive) |
| **Chains** | EVM + Solana | EVM + Solana + Bitcoin + TON + TRON |
| **Smart Accounts** | Limited | Full ERC-4337 (Bundler + Paymaster) |

### Do I need Rust experience to use Cinacoin?

**No.** For dApp developers, you only need TypeScript. The Rust components (Relay Server, RPC Proxy) are only required if you choose to self-host infrastructure. You can start with the public test relay:

```typescript
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1', // public test relay
}
```

### What chains are supported?

Cinacoin uses a **chain adapter architecture** that supports any blockchain. Currently implemented:

- ✅ **EVM chains**: Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Avalanche, and 300+ more
- 🔜 **Solana** (SVM adapter)
- 🔜 **Bitcoin** (BIP-122 adapter)
- 🔜 **TON** (adapter)
- 🔜 **TRON** (adapter)

See `@cinacoin/chains` for the full registry.

---

## Wallet Connection

### Why can't I connect my wallet?

Common causes:

1. **Invalid `projectId`** — Ensure you're using a valid project ID from your Cinacoin dashboard
2. **Incorrect relay URL** — Verify the WebSocket URL is reachable:
   ```bash
   wscat -c wss://relay.yourdomain.com/v1
   ```
3. **Missing chain configuration** — The chain must be in your `chains` array
4. **Wallet not installed** — Check if the user has a compatible wallet (extension, mobile app, or hardware wallet)
5. **Network issues** — Verify DNS resolution and firewall rules for the relay domain

### How do I handle QR code issues?

**QR code not displaying:**

```tsx
import { useOnux } from '@cinacoin/react'

function ConnectButton() {
  const { open } = useOnux()

  return (
    <button onClick={() => open()}>
      Connect Wallet
    </button>
  )
}
```

**QR code not scanning:**

- Verify the URI follows WalletConnect v2 format: `wc:<topic>@<version>?relay-protocol=irn&...`
- Check that the relay server is running and accessible
- Ensure the QR code has not expired (default TTL: 300 seconds)
- For mobile wallets, confirm deep links are properly configured

**QR code auto-refresh:**

```tsx
import { useState, useEffect } from 'react'
import { QRCode } from 'react-qr-code'
import { useOnux } from '@cinacoin/react'

function QRConnect() {
  const [uri, setUri] = useState('')
  const { getPairingUri } = useOnux()

  useEffect(() => {
    setUri(getPairingUri())

    // Refresh before expiry
    const timer = setInterval(() => {
      setUri(getPairingUri())
    }, 250_000) // 250 seconds

    return () => clearInterval(timer)
  }, [])

  return <QRCode value={uri} />
}
```

### How does EIP-6963 multi-wallet discovery work?

EIP-6963 allows automatic discovery of all installed wallet extensions without relying on a hardcoded list:

```typescript
import { useConnectors } from '@cinacoin/react'

function WalletList() {
  const { connectors } = useConnectors()

  return (
    <ul>
      {connectors.map((connector) => (
        <li key={connector.id}>
          <img src={connector.icon} alt={connector.name} />
          <span>{connector.name}</span>
        </li>
      ))}
    </ul>
  )
}
```

---

## Multi-Chain

### How do I switch chains?

```tsx
import { useOnuxNetwork } from '@cinacoin/react'
import { polygon, arbitrum } from '@cinacoin/chains'

function ChainSwitcher() {
  const { chain, switchNetwork } = useOnuxNetwork()

  return (
    <div>
      <p>Current: {chain?.name}</p>
      <button onClick={() => switchNetwork(polygon)}>Polygon</button>
      <button onClick={() => switchNetwork(arbitrum)}>Arbitrum</button>
    </div>
  )
}
```

### How do I add custom networks?

```typescript
import { defineChain } from '@cinacoin/chains'

const customChain = defineChain({
  id: 12345,
  name: 'My Custom Chain',
  network: 'custom',
  nativeCurrency: { name: 'MyToken', symbol: 'MTK', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mycustomchain.io'] },
    public: { http: ['https://public.mycustomchain.io'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.mycustomchain.io' },
  },
})

// Add to provider config
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet, polygon, customChain],
}
```

### How does cross-chain auth work?

Cinacoin implements **SIWX (Sign-In With X, CAIP-122)** for chain-agnostic multi-chain authentication:

```typescript
import { SIWX } from '@cinacoin/siwx'

const siwx = new SIWX({
  domain: 'mydapp.com',
  chains: ['eip155:1', 'eip155:137', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
})

// Generate multi-chain message
const message = siwx.generateMessage({
  address: userAddress,
  nonce: generateNonce(),
})

// Sign on each chain
const signatures = await siwx.sign(message)

// Verify
const isValid = await siwx.verify(signatures)
```

---

## Payments

### How do I enable swaps?

```typescript
import { SwapSDK } from '@cinacoin/swap-sdk'
import { mainnet } from '@cinacoin/chains'

const swapSDK = new SwapSDK({
  chainId: mainnet.id,
  apiKey: process.env.SWAP_API_KEY,
})

// Get the best quote across all DEX aggregators
const quote = await swapSDK.getBestQuote({
  fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',   // WETH
  amount: 1000n * 10n ** 6n, // 1000 USDC
  slippage: 0.5, // 0.5% tolerance
})

console.log(`Best route: ${quote.provider} — Rate: ${quote.rate}`)

// Execute the swap
const txHash = await swapSDK.execute(quote)
```

### How do I set up on-ramp?

```typescript
import { OnRampSDK } from '@cinacoin/onramp-sdk'

const onramp = new OnRampSDK({
  providers: ['meld', 'coinbase'],
  apiKey: process.env.ONRAMP_API_KEY,
})

// Check availability
const available = await onramp.checkAvailability({
  country: 'US',
  currency: 'USD',
  cryptoCurrency: 'USDC',
})

if (available) {
  // Open the on-ramp widget
  onramp.open({
    destinationWallet: userAddress,
    requestedAmount: 500,
    fiatCurrency: 'USD',
    cryptoCurrency: 'USDC',
  })
}
```

### How do I configure self-custodial payments?

```tsx
import { PayButton } from '@cinacoin/pay-ui'

function Checkout() {
  return (
    <PayButton
      amount={49.99}
      currency="USDC"
      chain="base"
      recipient="0x1234...5678"
      onSuccess={(txHash) => console.log('Paid:', txHash)}
      onError={(error) => console.error('Payment failed:', error)}
    />
  )
}
```

---

## Authentication

### How does SIWE work?

SIWE (Sign-In With Ethereum, EIP-4361) allows users to authenticate with their Ethereum wallet:

**Frontend:**

```tsx
import { useSIWE } from '@cinacoin/siwe'

function SignIn() {
  const { signIn, signOut, user, isAuthenticated } = useSIWE()

  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome, {user?.address}</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    )
  }

  return <button onClick={() => signIn('mydapp.com')}>Sign In with Ethereum</button>
}
```

**Backend verification:**

```typescript
import { verifySIWE } from '@cinacoin/siwe'
import { Redis } from 'ioredis'

const redis = new Redis()

app.post('/api/auth/siwe', async (req, res) => {
  const { message, signature } = req.body

  // Check nonce hasn't been used
  const nonceUsed = await redis.get(`siwe:nonce:${message.nonce}`)
  if (nonceUsed) {
    return res.status(400).json({ error: 'Nonce already used' })
  }

  // Verify the signature
  const result = await verifySIWE(message, signature)
  if (!result.success) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Mark nonce as used
  await redis.setex(`siwe:nonce:${message.nonce}`, 3600, 'used')

  // Create session
  req.session.address = result.address
  res.json({ success: true, address: result.address })
})
```

### How do I set up social login?

```typescript
import { SocialLogin } from '@cinacoin/social-login'

const socialLogin = new SocialLogin({
  apiKey: process.env.MAGIC_API_KEY,
  network: 'mainnet',
})

// Google login
const googleUser = await socialLogin.login('google')

// Email login (passwordless)
const emailUser = await socialLogin.loginWithEmail('user@example.com')

// Farcaster login
const fcUser = await socialLogin.login('farcaster')

// Access the generated wallet
console.log('Wallet:', googleUser.walletAddress)
console.log('Email:', googleUser.email)
```

### How do I set up passkey authentication?

```typescript
import { PasskeyAuth } from '@cinacoin/passkey-auth'

const passkey = new PasskeyAuth({
  rpName: 'MyDapp',
  rpId: 'mydapp.com',
})

// Register a new passkey
const credential = await passkey.register({
  userName: 'alice',
  displayName: 'Alice',
})

// Authenticate with existing passkey
const user = await passkey.authenticate()
console.log('Authenticated:', user.userName)
```

---

## Smart Accounts

### What are smart accounts?

Smart accounts (ERC-4337 Account Abstraction) replace traditional EOAs with programmable smart contract wallets. Benefits:

- **Gasless transactions** — Paymaster sponsors gas for users
- **Session keys** — Approve once, transact freely within limits
- **Batch calls** — Multiple operations in a single transaction
- **Social recovery** — Recover account without seed phrase
- **Arbitrary verification** — Custom signature schemes (ERC-6492)

### How do I deploy a smart account?

```typescript
import { AASDK } from '@cinacoin/aa-sdk'
import { mainnet } from '@cinacoin/chains'

const aaSDK = new AASDK({
  chainId: mainnet.id,
  bundlerUrl: 'https://bundler.cinacoin.com/v1',
  paymasterUrl: 'https://paymaster.cinacoin.com/v1',
})

// Deploy a new smart account
const account = await aaSDK.createAccount({
  owner: userAddress, // EOA or social login address
  salt: BigInt(Date.now()), // unique deployment salt
})

console.log('Smart account deployed at:', account.address)

// Send a gasless transaction
const userOp = await aaSDK.buildUserOperation({
  account: account.address,
  target: recipientAddress,
  data: '0x',
  value: 1000n,
})

const result = await aaSDK.sendUserOperation(userOp)
console.log('UserOp hash:', result.userOpHash)
```

### How do I set up session keys?

```typescript
import { SessionKeys } from '@cinacoin/session-keys'

const sessionKeys = new SessionKeys({
  accountAddress: smartAccountAddress,
})

// Create a session key with restrictions
const sessionKey = await sessionKeys.create({
  expiresAt: Date.now() + 3600000, // 1 hour
  allowedTargets: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'], // USDC only
  allowedMethods: ['transfer'],
  maxAmountPerTx: 1000n * 10n ** 6n, // 1000 USDC max per tx
  dailyLimit: 10000n * 10n ** 6n, // 10000 USDC max per day
})

// Use the session key for gasless transactions
const tx = await sessionKeys.execute({
  target: usdcAddress,
  method: 'transfer',
  args: [recipient, amount],
})
```

---

## Troubleshooting

### Wallet not connecting

1. Verify `projectId` is set and valid
2. Check relay URL is reachable: `wscat -c wss://relay.yourdomain.com/v1`
3. Ensure chains are properly configured
4. Enable debug mode for verbose logs
5. Check browser console for EIP-6963 errors

### Transaction failing

1. Check gas estimation: `await provider.estimateGas(tx)`
2. Verify the chain is correct and the wallet is on the right network
3. Check token approvals for ERC-20 interactions
4. Ensure sufficient balance (token + gas)
5. Check for contract reverts using `eth_call`

### Memory leaks in React

Always clean up Cinacoin subscriptions in `useEffect`:

```tsx
useEffect(() => {
  const handler = (accounts: string[]) => {
    setConnectedAccounts(accounts)
  }

  cinacoin.on('accountsChanged', handler)

  return () => {
    cinacoin.off('accountsChanged', handler)
  }
}, [])
```

---

## Security

### Is my data safe?

Yes. Cinacoin uses:

- **X25519 + ChaCha20-Poly1305** end-to-end encryption for all relay messages
- **TLS 1.3** for all transport connections
- **Domain verification** (Verify API) to prevent phishing
- **Nonce-based replay protection** for all authentication flows

The relay server **never** sees decrypted message contents — it only routes encrypted payloads between dApp and wallet.

### What encryption is used?

| Component | Encryption |
|-----------|-----------|
| **Relay messages** | X25519 key exchange + ChaCha20-Poly1305 AEAD |
| **Transport** | TLS 1.3 (WebSocket + HTTPS) |
| **Session storage** | AES-256-GCM (when persisted) |
| **SIWE messages** | EIP-191 / EIP-712 structured signatures |
| **Session keys** | Ephemeral key pairs, rotated per session |

### Where should I store API keys and secrets?

**Never** put secrets in frontend code or client-side environment variables (anything prefixed `NEXT_PUBLIC_`). Instead:

- **Cloudflare Workers:** Use `wrangler secret put` — secrets are encrypted and accessible only server-side
- **Vercel/Netlify:** Use platform secret management (dashboard or CLI)
- **Self-hosted:** Use `.env` files on the server, or a secret manager (HashiCorp Vault, AWS Secrets Manager)
- **CI/CD pipelines:** Inject secrets via GitHub Actions secrets, GitLab CI variables, etc.

See the full [Security Best Practices](./security.md) guide for details on API key rotation, secret classification, and automated secret scanning.

### How do I protect against phishing attacks?

1. **Register your dApp** with the Cinacoin Verify API so users see a verified badge
2. **Use HTTPS everywhere** — never serve your dApp over plain HTTP
3. **Configure strict CSP headers** to prevent script injection
4. **Educate users** to bookmark your URL and check the domain in wallet prompts
5. **Monitor for typosquatting** — register common misspellings of your domain

### How do I handle SIWE verification failures?

Common SIWE failure causes and fixes:

| Issue | Fix |
|-------|-----|
| Domain mismatch | Ensure `domain` in SIWE message matches `window.location.host` |
| Nonce reused | Generate a fresh cryptographically random nonce for each login attempt |
| Message expired | Set a reasonable `expirationTime` (5–10 minutes) |
| Invalid signature | Check message integrity; user may have cancelled signing |

See [Troubleshooting: SIWE Verification Failures](./troubleshooting.md#siwe-verification-failures) for detailed implementation.

### What should I do if a private key is compromised?

1. **Immediately rotate** the compromised key
2. **Revoke all active sessions** using the compromised key
3. **Notify affected users** if user-facing keys are involved
4. **Audit logs** to determine the scope of compromise
5. **Document the incident** for post-mortem analysis

Never store private keys in browser storage, transmit them over any network, or include them in error reports.

---

## Troubleshooting

### Why won't MetaMask connect?

Check these common issues:

1. **User gesture required** — `eth_requestAccounts` must be called from a click handler, not on page load
2. **EIP-6963 vs window.ethereum** — try both detection methods for compatibility
3. **Popup blocked** — inform users to allow popups for your domain
4. **Multiple accounts** — MetaMask may show account selection; handle `accountsChanged` events

See [Troubleshooting: MetaMask Compatibility](./troubleshooting.md#metamask-compatibility-issues) for details.

### Why does chain switching fail?

Chain switching fails when:

1. **User rejects** the switch prompt — show a friendly message explaining why the switch is needed
2. **Chain not added** — use `wallet_addEthereumChain` to add it first
3. **Race conditions** — multiple rapid switches conflict; debounce your chain switch calls

See [Troubleshooting: Chain Switching Failures](./troubleshooting.md#chain-switching-failures) for patterns and code.

### How do I handle EIP-5792 batch call errors?

Not all wallets support EIP-5792 (`wallet_sendCalls`). Check capability first with `wallet_getCapabilities` and fall back to sequential `eth_sendTransaction` if unsupported. Also chunk large batches (max ~10 calls per batch) and poll `wallet_getCallsStatus` for confirmation.

See [Troubleshooting: EIP-5792 Batch Call Errors](./troubleshooting.md#eip-5792-batch-call-errors) for full implementation.

### How do I enable debug mode?

```typescript
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet],
  debug: true,
  logger: {
    level: 'trace',
    output: 'console',
  },
}
```

**Never enable debug mode in production** — it may expose internal state. Use conditional logging instead:

```typescript
const logger = {
  debug: (...args: any[]) => process.env.NODE_ENV === 'development' && console.debug(...args),
}
```

See [Troubleshooting: Debug Mode and Logging](./troubleshooting.md#debug-mode-and-logging) for network inspection and error boundary setup.

---

*FAQ — Cinacoin Documentation*
