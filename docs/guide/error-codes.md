# Error Code Reference

> Complete error code reference for Cinacoin. Every error includes code, message, cause, and solution.

---

## Connection Errors (WC_1001 – WC_1010)

Errors related to wallet pairing, session establishment, and relay connectivity.

---

### WC_1001 — `pairing_failed`

| Field | Value |
|-------|-------|
| **Code** | `WC_1001` |
| **Message** | `Pairing failed: unable to establish secure channel` |
| **Cause** | The dApp could not establish an encrypted channel with the wallet during the pairing phase. This can happen when the relay is unreachable, the wallet's public key is invalid, or the X25519 key exchange failed. |
| **Solution** | Verify that the relay URL is correct and reachable. Check WebSocket connectivity with `wscat -c wss://relay.yourdomain.com/v1`. Ensure the wallet supports the Iridium relay protocol. Enable debug mode to inspect the key exchange: |

```typescript
const cinacoin = new Cinacoin({
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  debug: true, // enables detailed pairing logs
})

cinacoin.on('pairing_failed', (error) => {
  console.error('Pairing error:', error)
})
```

---

### WC_1002 — `session_rejected`

| Field | Value |
|-------|-------|
| **Code** | `WC_1002` |
| **Message** | `Session rejected by wallet` |
| **Cause** | The wallet declined the session proposal. This may occur because the dApp requested unsupported chains, unsupported methods, or the user denied the connection in the wallet UI. |
| **Solution** | Ensure that the `requiredNamespaces` in your session proposal only include chains and methods that the target wallet supports. Review the wallet's supported capabilities documentation. |

```typescript
// Correct: only request what the wallet supports
const session = await cinacoin.connect({
  requiredNamespaces: {
    eip155: {
      chains: ['eip155:1', 'eip155:8453'],
      methods: ['eth_sendTransaction', 'personal_sign'],
      events: ['chainChanged', 'accountsChanged'],
    },
  },
})
```

---

### WC_1003 — `user_rejected`

| Field | Value |
|-------|-------|
| **Code** | `WC_1003` |
| **Message** | `User rejected the connection request` |
| **Cause** | The user explicitly cancelled the connection prompt inside their wallet app. This is intentional behavior and not a system error. |
| **Solution** | Handle gracefully in your UI. Do not retry immediately — let the user re-initiate the connection. |

```typescript
try {
  await cinacoin.connect({ chains: ['eip155:1'] })
} catch (error) {
  if (error.code === 'WC_1003') {
    showToast('Connection cancelled. Try again when ready.')
  }
}
```

---

### WC_1004 — `expired_uri`

| Field | Value |
|-------|-------|
| **Code** | `WC_1004` |
| **Message** | `Connection URI has expired` |
| **Cause** | The pairing URI (used in QR codes or deep links) has exceeded its time-to-live. Default TTL is 300 seconds. |
| **Solution** | Generate a fresh pairing URI. For QR codes, implement an auto-refresh timer that regenerates the URI before expiry. |

```typescript
// Regenerate pairing URI
const uri = await cinacoin.core.pairing.create()

// Auto-refresh QR code every 250 seconds
const refreshInterval = setInterval(async () => {
  const newUri = await cinacoin.core.pairing.create()
  updateQRCode(newUri)
}, 250_000)

// Clean up on unmount
return () => clearInterval(refreshInterval)
```

---

### WC_1005 – WC_1010 — Reserved Connection Errors

| Code | Message | Description |
|------|---------|-------------|
| `WC_1005` | `relay_unreachable` | WebSocket connection to relay server failed. Check network and relay status. |
| `WC_1006` | `invalid_topic` | Pairing topic is malformed or not recognized by the relay. Verify topic format. |
| `WC_1007` | `duplicate_session` | Attempted to create a session that already exists. Reuse existing session instead. |
| `WC_1008` | `unsupported_version` | Protocol version mismatch between dApp and wallet. Update to compatible versions. |
| `WC_1009` | `rate_limited` | Too many connection attempts. Implement exponential backoff. |
| `WC_1010` | `network_timeout` | Connection attempt exceeded timeout threshold. Increase timeout or check network. |

---

## RPC Errors (WC_2001 – WC_2010)

Errors related to JSON-RPC method execution, chain operations, and request validation.

---

### WC_2001 — `method_not_supported`

| Field | Value |
|-------|-------|
| **Code** | `WC_2001` |
| **Message** | `Method not supported by the connected wallet` |
| **Cause** | The dApp requested a JSON-RPC method that the connected wallet does not implement. For example, requesting `wallet_addEthereumChain` on a wallet that only supports read-only methods. |
| **Solution** | Check the session's `approvedNamespaces` to see which methods the wallet granted. Use only those methods, or prompt the user to connect a wallet that supports the required methods. |

```typescript
const session = cinacoin.getActiveSession()
const methods = session.namespaces.eip155.methods

if (!methods.includes('eth_sendTransaction')) {
  throw new Error('Connected wallet does not support transaction sending')
}
```

---

### WC_2002 — `chain_not_supported`

| Field | Value |
|-------|-------|
| **Code** | `WC_2002` |
| **Message** | `Chain not supported in current session` |
| **Cause** | The requested chain (e.g., `eip155:137` for Polygon) was not included in the session proposal or was not approved by the wallet. |
| **Solution** | Include the chain in `requiredNamespaces` or `optionalNamespaces` during session proposal, then call `switchChain` after connection. |

```typescript
import { polygon, mainnet } from '@cinacoin/chains'

// Include optional chains in config
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet, polygon],
  // ...
}

// Switch after connection
await cinacoin.switchChain('eip155:137')
```

---

### WC_2003 — `unauthorized`

| Field | Value |
|-------|-------|
| **Code** | `WC_2003` |
| **Message** | `Unauthorized: session does not have permission for this action` |
| **Cause** | The current session does not have the required permissions to execute the requested action. This can happen if the session was created with restricted permissions or the wallet revoked access. |
| **Solution** | Verify session permissions before making the request. Re-connect with the required permissions if needed. |

```typescript
const session = cinacoin.getActiveSession()

if (!session.namespaces.eip155.methods.includes('eth_signTypedData_v4')) {
  console.warn('Session lacks typed data signing permission')
  // Reconnect with required methods
}
```

---

### WC_2004 — `invalid_request`

| Field | Value |
|-------|-------|
| **Code** | `WC_2004` |
| **Message** | `Invalid request: malformed parameters` |
| **Cause** | The JSON-RPC request contains invalid or malformed parameters. Common causes include incorrect address format, missing required fields, or invalid data types. |
| **Solution** | Validate request parameters before sending. Use schema validation or type-checking. |

```typescript
import { isAddress, parseEther } from 'viem'

function validateTransaction(tx: any) {
  if (!isAddress(tx.to)) throw new Error('Invalid "to" address')
  if (typeof tx.value !== 'bigint') tx.value = parseEther(tx.value.toString())
  return tx
}

const validTx = validateTransaction(rawTransaction)
await cinacoin.sendTransaction(validTx)
```

---

### WC_2005 – WC_2010 — Reserved RPC Errors

| Code | Message | Description |
|------|---------|-------------|
| `WC_2005` | `response_timeout` | RPC response exceeded timeout. Retry with increased timeout or check relay latency. |
| `WC_2006` | `invalid_response` | Wallet returned an invalid or malformed RPC response. Check wallet compatibility. |
| `WC_2007` | `chain_disconnected` | The connected chain's RPC endpoint is unreachable. Switch to a backup RPC provider. |
| `WC_2008` | `nonce_too_low` | Transaction nonce is stale. Fetch the latest nonce and retry. |
| `WC_2009` | `gas_estimate_failed` | Gas estimation failed. Set gas limit manually or check contract state. |
| `WC_2010` | `batch_limit_exceeded` | Too many RPC requests in a single batch. Split into smaller batches. |

---

## Payment Errors (WC_3001 – WC_3010)

Errors related to swaps, on-ramp, and payment operations.

---

### WC_3001 — `insufficient_funds`

| Field | Value |
|-------|-------|
| **Code** | `WC_3001` |
| **Message** | `Insufficient funds for transaction + gas` |
| **Cause** | The connected wallet does not have enough native token balance to cover both the transaction value and the gas fees. |
| **Solution** | Check the wallet balance before attempting the transaction. Show a clear error to the user with the required amount. |

```typescript
import { getBalance, formatEther } from 'viem'

async function checkBalance(address: `0x${string}`, chainId: number) {
  const balance = await getBalance({ address, chainId })
  return {
    formatted: formatEther(balance),
    wei: balance,
  }
}

const balance = await checkBalance(userAddress, 1)
if (balance.wei < requiredAmount + estimatedGas) {
  throw new Error(`Need ${formatEther(requiredAmount + estimatedGas)} ETH. You have ${balance.formatted} ETH.`)
}
```

---

### WC_3002 — `swap_failed`

| Field | Value |
|-------|-------|
| **Code** | `WC_3002` |
| **Message** | `Swap execution failed` |
| **Cause** | The swap transaction failed on-chain. Common causes include slippage exceeded, liquidity insufficient, or the quote expired before execution. |
| **Solution** | Check the swap quote validity period and slippage tolerance. Request a fresh quote if expired. Increase slippage tolerance for volatile pairs. |

```typescript
import { SwapSDK } from '@cinacoin/swap-sdk'

const swap = new SwapSDK({ chainId: 1 })

try {
  // Get a fresh quote
  const quote = await swap.getBestQuote({
    fromToken: 'USDC',
    toToken: 'ETH',
    amount: 1000n * 10n ** 6n, // 1000 USDC
    slippage: 0.5, // 0.5% slippage tolerance
  })

  // Execute before quote expires
  const txHash = await swap.execute(quote)
} catch (error) {
  if (error.code === 'WC_3002') {
    console.error('Swap failed — quote may have expired or slippage too tight')
  }
}
```

---

### WC_3003 — `onramp_failed`

| Field | Value |
|-------|-------|
| **Code** | `WC_3003` |
| **Message** | `On-ramp purchase failed or timed out` |
| **Cause** | The fiat-to-crypto purchase failed. This can happen due to payment provider errors, KYC requirements, regional restrictions, or transaction limits. |
| **Solution** | Check the on-ramp provider's status. Verify that the user's region is supported. Ensure the purchase amount is within provider limits. |

```typescript
import { OnRampSDK } from '@cinacoin/onramp-sdk'

const onramp = new OnRampSDK({
  provider: 'meld', // or 'coinbase'
  apiKey: process.env.ONRAMP_API_KEY,
})

// Check availability before opening widget
const available = await onramp.checkAvailability({
  country: 'US',
  currency: 'USD',
  amount: 500,
})

if (!available) {
  console.warn('On-ramp not available for this region/amount')
}
```

---

### WC_3004 – WC_3010 — Reserved Payment Errors

| Code | Message | Description |
|------|---------|-------------|
| `WC_3004` | `quote_expired` | Swap quote TTL expired. Request a new quote before executing. |
| `WC_3005` | `slippage_exceeded` | Price moved beyond slippage tolerance. Increase tolerance or retry. |
| `WC_3006` | `token_not_supported` | Token is not in the supported token list for the target chain. |
| `WC_3007` | `onramp_limit` | Purchase amount is below minimum or above maximum for the provider. |
| `WC_3008` | `payment_declined` | Payment method (card/bank) was declined by the provider. |
| `WC_3009` | `kyc_required` | User must complete KYC verification before proceeding. |
| `WC_3010` | `bridge_unavailable` | Cross-chain bridge is temporarily unavailable. Retry later. |

---

## Authentication Errors (WC_4001 – WC_4010)

Errors related to SIWE, SIWX, and social login authentication flows.

---

### WC_4001 — `siwe_failed`

| Field | Value |
|-------|-------|
| **Code** | `WC_4001` |
| **Message** | `Sign-In with Ethereum failed` |
| **Cause** | The SIWE message generation, signing, or verification failed. Common causes include domain mismatch, invalid nonce, expired message, or signature verification failure. |
| **Solution** | Verify the domain matches the request origin, ensure the nonce is unique and not reused, check the message expiration time, and validate the signature against the expected address. |

```typescript
import { generateSIWEMessage, verifySIWE } from '@cinacoin/siwe'

// Generate a SIWE message
const message = generateSIWEMessage({
  domain: 'mydapp.com',
  address: userAddress,
  statement: 'Sign in to MyDapp',
  uri: 'https://mydapp.com',
  nonce: generateNonce(), // unique per request
  expirationTime: new Date(Date.now() + 3600000).toISOString(),
})

// Verify the signature
const result = await verifySIWE(message, signature)
if (!result.success) {
  console.error('SIWE verification failed:', result.error)
}
```

---

### WC_4002 — `siwx_failed`

| Field | Value |
|-------|-------|
| **Code** | `WC_4002` |
| **Message** | `Sign-In with X (multi-chain) failed` |
| **Cause** | The chain-agnostic SIWX (CAIP-122) authentication failed. This can happen when signing across multiple chains, or when a chain-specific signer is unavailable. |
| **Solution** | Ensure the wallet supports CAIP-122 multi-chain signing. Verify that each chain's namespace is properly configured. Check that the wallet can sign messages for all requested chains. |

```typescript
import { generateSIWXMessage } from '@cinacoin/siwx'

const message = generateSIWXMessage({
  domain: 'mydapp.com',
  chains: ['eip155:1', 'eip155:137', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  address: multiChainAddress,
  nonce: generateNonce(),
})

// Request signature for each chain
const signatures = await Promise.all(
  message.chains.map(chain =>
    cinacoin.signMessage(chain, message.getMessageForChain(chain))
  )
)
```

---

### WC_4003 — `social_login_failed`

| Field | Value |
|-------|-------|
| **Code** | `WC_4003` |
| **Message** | `Social login authentication failed` |
| **Cause** | The social login (Google, X, GitHub, Discord, Apple, Facebook, Farcaster) or email login via Magic.link failed. Common causes include invalid API key, popup blocked, OAuth provider error, or network timeout. |
| **Solution** | Verify the Magic.link API key is correctly configured. Ensure popup blockers are disabled. Check OAuth provider credentials. Implement fallback error handling. |

```typescript
import { SocialLogin } from '@cinacoin/social-login'

const socialLogin = new SocialLogin({
  apiKey: process.env.MAGIC_API_KEY,
  network: 'mainnet',
})

try {
  const user = await socialLogin.login('google')
  console.log('Logged in as:', user.email)
  console.log('Wallet address:', user.walletAddress)
} catch (error) {
  if (error.code === 'WC_4003') {
    console.error('Social login failed:', error.message)
    // Show fallback: suggest email login or wallet connection
  }
}
```

---

### WC_4004 – WC_4010 — Reserved Auth Errors

| Code | Message | Description |
|------|---------|-------------|
| `WC_4004` | `nonce_reused` | SIWE nonce has already been used. Generate a fresh nonce to prevent replay attacks. |
| `WC_4005` | `message_expired` | SIWE/SIWX message expired before signing. Regenerate with a new expiration time. |
| `WC_4006` | `domain_mismatch` | SIWE message domain does not match the request origin. Fix domain configuration. |
| `WC_4007` | `signature_invalid` | Cryptographic signature verification failed. Check message integrity and address. |
| `WC_4008` | `popup_blocked` | Social login popup was blocked by browser. Inform user to allow popups. |
| `WC_4009` | `session_expired` | Authentication session expired. Re-authenticate to continue. |
| `WC_4010` | `passkey_error` | Passkey/biometric authentication failed. Device may not support WebAuthn. |

---

## Error Handling Patterns

### Global Error Handler

```typescript
cinacoin.on('error', (error) => {
  switch (error.code) {
    case 'WC_1003': // user_rejected
      // Expected — no action needed
      break

    case 'WC_1001': // pairing_failed
    case 'WC_1005': // relay_unreachable
      // Retry with backoff
      retryWithBackoff(() => cinacoin.connect())
      break

    case 'WC_3001': // insufficient_funds
    case 'WC_3002': // swap_failed
      // Show user-friendly payment error
      showPaymentError(error)
      break

    case 'WC_4001': // siwe_failed
    case 'WC_4002': // siwx_failed
      // Re-generate auth message
      retryAuth()
      break

    default:
      console.error('Unhandled error:', error)
  }
})
```

### Exponential Backoff Retry

```typescript
async function retryWithBackoff(
  fn: () => Promise<any>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      const delay = baseDelay * 2 ** i
      console.log(`Retry ${i + 1}/${maxRetries} in ${delay}ms...`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}
```

---

*Error Code Reference — Cinacoin Documentation*
