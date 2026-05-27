# Troubleshooting Guide

> Common issues and solutions for Cinacoin development, deployment, and production.

---

## 🔗 Wallet Not Connecting

### Checklist

| Step | Check | How to Verify |
|------|-------|---------------|
| 1 | `projectId` is configured | `console.log(config.projectId)` — must be non-empty string |
| 2 | Relay URL is reachable | `wscat -c wss://relay.yourdomain.com/v1` |
| 3 | Chains are configured | `config.chains.length > 0` |
| 4 | Metadata is set | `config.metadata.name` and `config.metadata.url` |
| 5 | No CORS issues | Check browser DevTools Network tab |

### Debug Mode

```typescript
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet],
  debug: true, // verbose console logging
  logger: {
    level: 'debug',
  },
}
```

### Connection Timeout

If the connection takes more than 10 seconds:

```typescript
// Test relay latency
const start = performance.now()
try {
  await cinacoin.connect({ timeout: 10000 })
} catch (error) {
  const latency = performance.now() - start
  console.log(`Connection took ${latency}ms`)
}
```

**Fixes:**
- Deploy relay closer to users (multi-region)
- Use DNS preconnect: `<link rel="preconnect" href="https://relay.yourdomain.com">`
- Check for network firewall blocking WebSocket connections

---

## 📷 QR Code Not Showing

### Browser Compatibility

QR code rendering requires canvas or SVG support. Test in:

- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+

### Common Issues

**1. QR code component not rendering:**

```tsx
// Ensure the QR code container has dimensions
<div style={{ width: 256, height: 256 }}>
  <QRCode value={pairingUri} />
</div>
```

**2. URI is empty or undefined:**

```typescript
const uri = await cinacoin.core.pairing.create()
if (!uri) {
  console.error('Failed to generate pairing URI')
  // Check relay connection
}
```

**3. QR code expired:**

```tsx
import { useState, useEffect } from 'react'

function QRDisplay() {
  const [uri, setUri] = useState('')

  useEffect(() => {
    const refresh = async () => {
      const newUri = await cinacoin.core.pairing.create()
      setUri(newUri)
    }

    refresh()

    // Refresh every 4 minutes (before 5-min TTL)
    const interval = setInterval(refresh, 240_000)
    return () => clearInterval(interval)
  }, [])

  if (!uri) return <p>Loading...</p>
  return <QRCode value={uri} />
}
```

---

## ❌ Transaction Failing

### Debug Steps

**1. Check gas estimation:**

```typescript
import { estimateGas, parseEther } from 'viem'

try {
  const gas = await estimateGas(publicClient, {
    account: userAddress,
    to: contractAddress,
    value: parseEther('0.1'),
    data: encodedFunctionData,
  })
  console.log('Estimated gas:', gas)
} catch (error) {
  // Gas estimation failed — likely a revert
  console.error('Gas estimation failed:', error)
}
```

**2. Check chain alignment:**

```typescript
const walletChain = await provider.request({ method: 'eth_chainId' })
const dappChain = config.chains[0].id

if (parseInt(walletChain, 16) !== dappChain) {
  console.warn(`Wallet on ${walletChain}, dApp expects ${dappChain}`)
  await switchNetwork(config.chains[0])
}
```

**3. Check token approvals:**

```typescript
import { readContract } from 'viem'

const allowance = await readContract(publicClient, {
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [userAddress, spenderAddress],
})

if (allowance < requiredAmount) {
  console.log('Approval needed. Requesting approve transaction...')
}
```

**4. Simulate transaction before sending:**

```typescript
// Use eth_call to simulate
try {
  await publicClient.call({
    account: userAddress,
    to: contractAddress,
    data: encodedFunctionData,
  })
  console.log('Transaction would succeed')
} catch (error) {
  console.error('Transaction would revert:', error.message)
}
```

---

## 🔐 Social Login Not Working

### Magic.link API Key Issues

**1. Verify API key is set:**

```typescript
const socialLogin = new SocialLogin({
  apiKey: process.env.NEXT_PUBLIC_MAGIC_API_KEY,
  network: 'mainnet',
})

// Test initialization
if (!socialLogin.isInitialized) {
  console.error('Magic SDK failed to initialize')
}
```

**2. Check environment variables:**

```bash
# .env.local
NEXT_PUBLIC_MAGIC_API_KEY=pk_live_XXXXXXXXXXXX
```

**3. Popup blocked:**

```typescript
try {
  const user = await socialLogin.login('google')
} catch (error) {
  if (error.message.includes('popup')) {
    showNotification('Please allow popups for this site to use social login.')
  }
}
```

### OAuth Configuration

Ensure OAuth credentials are correctly configured in the Magic.link dashboard:

| Provider | Required Config |
|----------|----------------|
| Google | OAuth 2.0 Client ID + Client Secret |
| X (Twitter) | API Key + API Secret + Bearer Token |
| GitHub | OAuth App Client ID + Client Secret |
| Discord | Client ID + Client Secret |
| Apple | Services ID + Key ID + Team ID |

---

## 💧 Memory Leaks in React

### Proper Cleanup in useEffect

**❌ Wrong — no cleanup:**

```typescript
useEffect(() => {
  cinacoin.on('accountsChanged', (accounts) => {
    setAccounts(accounts)
  })
  // Missing cleanup! Listener persists after unmount
}, [])
```

**✅ Correct — with cleanup:**

```typescript
useEffect(() => {
  const handleAccountsChanged = (accounts: string[]) => {
    setAccounts(accounts)
  }

  cinacoin.on('accountsChanged', handleAccountsChanged)

  return () => {
    cinacoin.off('accountsChanged', handleAccountsChanged)
  }
}, [])
```

### Multiple Listeners

```typescript
useEffect(() => {
  const handlers = {
    accountsChanged: (accounts: string[]) => setAccounts(accounts),
    chainChanged: (chainId: string) => setChain(parseInt(chainId, 16)),
    disconnect: (error: Error) => setConnected(false),
  }

  // Register all listeners
  Object.entries(handlers).forEach(([event, handler]) => {
    cinacoin.on(event, handler)
  })

  // Cleanup all listeners
  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      cinacoin.off(event, handler)
    })
  }
}, [])
```

### React StrictMode Double-Render

In development, React 18+ StrictMode renders components twice. Ensure your provider initialization is idempotent:

```typescript
// Use useRef to prevent double initialization
const providerRef = useRef<Cinacoin | null>(null)

if (!providerRef.current) {
  providerRef.current = new Cinacoin(config)
}
```

---

## ⚡ Performance Issues

### Lazy Loading

Only load Cinacoin when needed:

```tsx
import dynamic from 'next/dynamic'

// Lazy load the connect button — not rendered on first paint
const ConnectButton = dynamic(
  () => import('./ConnectButton'),
  { ssr: false, loading: () => <Skeleton /> }
)

function Header() {
  return (
    <header>
      <Logo />
      <nav>...</nav>
      <ConnectButton />
    </header>
  )
}
```

### Code Splitting

Split Cinacoin into its own chunk:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          cinacoin: ['@cinacoin/react', '@cinacoin/core'],
        },
      },
    },
  },
})
```

### Reduce Bundle Size

```bash
# Analyze bundle
npx vite-bundle-visualizer

# Check which Cinacoin packages are pulling in dependencies
npm ls @cinacoin/core
```

**Tips:**
- Only import what you need: `import { useOnux } from '@cinacoin/react'` not `import * as Cinacoin from '@cinacoin/react'`
- Use tree-shaking friendly imports
- Consider using the lightweight `@cinacoin/core` without UI components if building custom UI

---

## 🚀 Deployment Issues

### Helm Installation Failing

```bash
# Lint the chart before installing
helm lint ./deploy/helm/cinacoin

# Dry-run to see what would be deployed
helm install cinacoin ./deploy/helm/cinacoin \
  --namespace cinacoin \
  --create-namespace \
  --dry-run

# Check required values
helm show values ./deploy/helm/cinacoin
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n cinacoin

# Describe for events
kubectl describe pod <pod-name> -n cinacoin

# View logs
kubectl logs <pod-name> -n cinacoin --tail=100

# View previous container logs (CrashLoopBackOff)
kubectl logs <pod-name> -n cinacoin --previous
```

| Status | Cause | Fix |
|--------|-------|-----|
| `Pending` | Insufficient resources | Scale cluster or reduce resource requests |
| `Pending` | PVC not bound | Check StorageClass exists |
| `CrashLoopBackOff` | Config error | Check logs, fix config |
| `ImagePullBackOff` | Invalid image | Verify image name and tag |
| `OOMKilled` | Memory limit too low | Increase memory limit in values.yaml |

### Relay Server Won't Start

```bash
# Check relay pods
kubectl logs -l app=relay -n cinacoin --tail=100

# Verify NATS connectivity
kubectl exec -it <nats-pod> -n cinacoin -- nats-server --version

# Check relay config
kubectl get configmap relay-config -n cinacoin -o yaml
```

---

## 📊 Monitoring & Observability

### Enable Analytics

```typescript
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet],
  analytics: {
    enabled: true,
    endpoint: 'https://analytics.cinacoin.com/v1',
  },
}
```

### Error Tracking Integration

**Sentry:**

```typescript
import * as Sentry from '@sentry/react'
import { Cinacoin } from '@cinacoin/core'

cinacoin.on('error', (error) => {
  Sentry.captureException(error, {
    tags: {
      error_code: error.code,
      component: 'cinacoin',
    },
  })
})
```

**Custom Event Tracking:**

```typescript
cinacoin.on('connect', (session) => {
  analytics.track('wallet_connected', {
    wallet: session.wallet.name,
    chain: session.chain.id,
    method: session.connectionType,
  })
})
```

---

## 🔦 MetaMask Compatibility Issues

### MetaMask Not Detected

**Problem:** `window.ethereum` is undefined even with MetaMask installed.

**Causes & solutions:**

```typescript
// 1. Check EIP-6963 announcement (modern approach)
window.addEventListener('eip6963:announceProvider', (event: CustomEvent) => {
  console.log('Wallet found:', event.detail.info.name)
})

// Dispatch the request
window.dispatchEvent(new Event('eip6963:requestProvider'))

// 2. Fallback to window.ethereum
if (typeof window.ethereum !== 'undefined') {
  console.log('MetaMask (or compatible) detected via window.ethereum')
} else {
  console.warn('No Ethereum provider detected')
}
```

### MetaMask Popup Not Appearing

**Problem:** `eth_requestAccounts` call hangs without showing a popup.

**Solutions:**

```typescript
// Must be triggered by user gesture (click event)
async function connectWallet() {
  if (!window.ethereum) {
    window.open('https://metamask.io/download/', '_blank')
    return
  }

  try {
    // This MUST be called synchronously from a user click handler
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    })
    console.log('Connected:', accounts[0])
  } catch (error: any) {
    if (error.code === 4001) {
      // User rejected the request
      showToast('Connection rejected. Please try again.')
    } else {
      console.error('MetaMask connection error:', error)
    }
  }
}

// ✅ Correct: called from click handler
<button onClick={connectWallet}>Connect Wallet</button>

// ❌ Wrong: called on page load (blocked by browser)
useEffect(() => { connectWallet() }, [])
```

### MetaMask Chain Not Auto-Adding

**Problem:** User gets error when trying to switch to an unknown chain.

```typescript
async function addAndSwitchChain() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], // Polygon
    })
  } catch (switchError: any) {
    // This error code indicates the chain has not been added
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x89',
              chainName: 'Polygon',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: ['https://polygon-rpc.com'],
              blockExplorerUrls: ['https://polygonscan.com'],
            },
          ],
        })
      } catch (addError) {
        console.error('Failed to add chain:', addError)
      }
    }
  }
}
```

### MetaMask Multiple Account Selection

**Problem:** MetaMask shows account selection modal unexpectedly.

This is normal MetaMask behavior when `eth_requestAccounts` is called and the user has multiple accounts. Handle gracefully:

```typescript
// MetaMask may return different accounts than previously connected
cinacoin.on('accountsChanged', (accounts: string[]) => {
  if (accounts.length === 0) {
    // User disconnected all accounts
    setConnected(false)
  } else {
    // Active account changed
    setActiveAccount(accounts[0])
  }
})
```

---

## 🔀 Chain Switching Failures

### User Rejects Chain Switch

**Problem:** `wallet_switchEthereumChain` throws user rejection error.

```typescript
async function switchChain(chainId: number) {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    })
  } catch (error: any) {
    if (error.code === 4001) {
      // User rejected — show friendly message
      showChainSwitchPrompt(chainId)
    } else if (error.code === 4902) {
      // Chain not added — try adding it
      await addChain(chainId)
    } else {
      console.error('Chain switch failed:', error)
    }
  }
}

function showChainSwitchPrompt(chainId: number) {
  const chainName = getChainName(chainId)
  showModal({
    title: 'Chain Switch Required',
    message: `This feature requires ${chainName}. Please switch chains in your wallet.`,
    actions: [{ label: 'Got it', onClick: closeModal }],
  })
}
```

### Pending Chain Switch (User Action Required)

Wallets show a pending state while waiting for user approval. Track this:

```typescript
const [switchingChain, setSwitchingChain] = useState<number | null>(null)

async function handleSwitch(chainId: number) {
  setSwitchingChain(chainId)
  try {
    await switchChain(chainId)
  } finally {
    setSwitchingChain(null)
  }
}

// Show loading indicator in UI
{switchingChain && (
  <Spinner label={`Switching to ${getChainName(switchingChain)}...`} />
)}
```

### Chain Switch Race Conditions

Multiple rapid chain switches can cause conflicts. Debounce:

```typescript
import { useRef, useCallback } from 'react'

function useChainSwitch() {
  const pendingRef = useRef<Promise<void> | null>(null)

  const switchChain = useCallback(async (chainId: number) => {
    // Wait for any pending switch to complete
    if (pendingRef.current) {
      await pendingRef.current
    }

    const chainSwitch = (async () => {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
    })()

    pendingRef.current = chainSwitch
    try {
      await chainSwitch
    } finally {
      pendingRef.current = null
    }
  }, [])

  return switchChain
}
```

---

## 📦 EIP-5792 Batch Call Errors

### Wallet Doesn't Support EIP-5792

**Problem:** `wallet_sendCalls` returns method not supported.

```typescript
async function checkBatchCallSupport(): Promise<boolean> {
  try {
    const capabilities = await window.ethereum.request({
      method: 'wallet_getCapabilities',
    })

    // Check if sendCalls is supported
    return typeof capabilities?.sendCalls !== 'undefined'
  } catch {
    return false
  }
}

// Fallback for wallets without EIP-5792
async function executeCalls(transactions: any[]) {
  const supportsBatch = await checkBatchCallSupport()

  if (supportsBatch) {
    // Use atomic batch
    return await window.ethereum.request({
      method: 'wallet_sendCalls',
      params: [
        {
          version: '1.0',
          chainId: '0x1',
          from: userAddress,
          calls: transactions.map((tx) => ({
            to: tx.to,
            data: tx.data,
            value: tx.value || '0x0',
          })),
        },
      ],
    })
  } else {
    // Fallback: execute sequentially
    for (const tx of transactions) {
      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [tx],
      })
    }
  }
}
```

### Batch Call Capacity Exceeded

**Problem:** Too many calls in a single batch.

```typescript
const MAX_BATCH_SIZE = 10 // Wallet-specific limit

function chunkCalls(calls: any[], chunkSize = MAX_BATCH_SIZE): any[][] {
  const chunks: any[][] = []
  for (let i = 0; i < calls.length; i += chunkSize) {
    chunks.push(calls.slice(i, i + chunkSize))
  }
  return chunks
}

// Execute in chunks
const batches = chunkCalls(allCalls)
for (const batch of batches) {
  await window.ethereum.request({
    method: 'wallet_sendCalls',
    params: [{ version: '1.0', chainId: '0x1', from: userAddress, calls: batch }],
  })
}
```

### Batch Call Status Polling

**Problem:** Need to track batch call execution status.

```typescript
async function pollBatchCallStatus(batchId: string, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const status = await window.ethereum.request({
        method: 'wallet_getCallsStatus',
        params: [batchId],
      })

      if (status.status === 'CONFIRMED') {
        return { status: 'confirmed', receipts: status.receipts }
      }
      if (status.status === 'PENDING') {
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      return { status: 'failed', reason: status.reason }
    } catch {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  return { status: 'timeout' }
}

// Usage
const batchId = await executeCalls(transactions)
const result = await pollBatchCallStatus(batchId)

if (result.status === 'confirmed') {
  showSuccess('All transactions confirmed!')
} else if (result.status === 'failed') {
  showError(`Batch failed: ${result.reason}`)
}
```

### EIP-5792 Capability Detection

```typescript
interface WalletCapabilities {
  atomicBatch?: { supported: boolean }
  paymasterService?: { supported: boolean; url?: string }
  sessionKeys?: { supported: boolean }
}

async function getWalletCapabilities(): Promise<WalletCapabilities> {
  try {
    const capabilities = await window.ethereum.request({
      method: 'wallet_getCapabilities',
    })
    return capabilities
  } catch {
    return {}
  }
}
```

---

## 🔐 SIWE Verification Failures

### Domain Mismatch

**Problem:** SIWE verification fails because the domain in the message doesn't match the request origin.

```typescript
// Backend SIWE verification with strict domain check
import { SiweMessage } from 'siwe'

app.post('/api/auth/siwe/verify', async (req, res) => {
  const { message, signature } = req.body

  try {
    const siweMessage = new SiweMessage(message)

    // 1. Verify the domain matches the request origin
    const origin = req.headers.origin || req.headers.referer
    const originDomain = origin ? new URL(origin).hostname : null

    if (originDomain && siweMessage.domain !== originDomain) {
      return res.status(400).json({
        error: `Domain mismatch: message says ${siweMessage.domain}, request from ${originDomain}`,
      })
    }

    // 2. Verify the nonce hasn't been reused
    const nonceUsed = await redis.get(`siwe:nonce:${siweMessage.nonce}`)
    if (nonceUsed) {
      return res.status(400).json({ error: 'Nonce already used — possible replay attack' })
    }

    // 3. Check expiration
    if (siweMessage.expirationTime && new Date(siweMessage.expirationTime) < new Date()) {
      return res.status(400).json({ error: 'SIWE message has expired' })
    }

    // 4. Verify the signature
    const fields = await siweMessage.verify({ signature })
    if (!fields.success) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // 5. Mark nonce as used
    await redis.setex(`siwe:nonce:${siweMessage.nonce}`, 3600, 'used')

    // 6. Create session
    res.json({
      success: true,
      address: siweMessage.address,
      expirationTime: siweMessage.expirationTime,
    })
  } catch (error) {
    console.error('SIWE verification error:', error)
    res.status(500).json({ error: 'Verification failed' })
  }
})
```

### Nonce Generation & Replay Protection

```typescript
// Generate cryptographically secure nonce
import { randomBytes } from 'crypto'

function generateSecureNonce(length = 32): string {
  return randomBytes(length).toString('hex')
}

// Serve nonce to frontend
app.get('/api/auth/siwe/nonce', async (_req, res) => {
  const nonce = generateSecureNonce()

  // Store nonce with TTL
  await redis.setex(`siwe:nonce:${nonce}`, 300, 'pending') // 5 min TTL

  res.json({ nonce })
})

// Frontend: fetch nonce before SIWE
async function getNonce(): Promise<string> {
  const res = await fetch('/api/auth/siwe/nonce')
  const { nonce } = await res.json()
  return nonce
}
```

### Message Expiration

**Problem:** User takes too long to sign, message expires.

```typescript
// Frontend: generate SIWE message with reasonable expiration
import { SiweMessage } from 'siwe'

async function createSiweMessage(address: string) {
  const nonce = await getNonce()

  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: 'Sign in to Cinacoin',
    uri: window.location.origin,
    version: '1',
    chainId: 1,
    nonce,
    // Expire in 5 minutes — balance between usability and security
    expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    // Optional: not valid before now
    notBefore: new Date().toISOString(),
  })

  return message.prepareMessage()
}
```

### Common SIWE Error Codes

| Code | Error | Cause | Fix |
|------|-------|-------|-----|
| `WC_4001` | `siwe_failed` | Signing or verification failed | Check message format, domain, nonce |
| `WC_4004` | `nonce_reused` | Nonce was already used | Generate new nonce, implement nonce store |
| `WC_4005` | `message_expired` | Message TTL exceeded | Increase expirationTime or prompt re-sign |
| `WC_4006` | `domain_mismatch` | Domain in message ≠ request origin | Ensure `domain` matches `window.location.host` |
| `WC_4007` | `signature_invalid` | Cryptographic verification failed | Check message integrity, wallet compatibility |

---

## 🐛 Debug Mode and Logging

### Enable Maximum Debug Output

```typescript
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet],
  debug: true,
  logger: {
    level: 'trace', // Most verbose: trace > debug > info > warn > error
    output: 'console', // or 'file', 'remote'
  },
}
```

### Conditional Debug Logging (Production-Safe)

```typescript
// Never log sensitive data in production
const isDev = process.env.NODE_ENV === 'development'

const logger = {
  debug: (...args: any[]) => isDev && console.debug('[Cinacoin]', ...args),
  info: (...args: any[]) => console.info('[Cinacoin]', ...args),
  warn: (...args: any[]) => console.warn('[Cinacoin]', ...args),
  error: (...args: any[]) => console.error('[Cinacoin]', ...args),
  // NEVER log these even in debug mode:
  // private keys, seed phrases, API keys, session tokens
}
```

### Network Traffic Inspection

```typescript
// Intercept and log relay messages (development only)
if (isDev) {
  const originalSend = WebSocket.prototype.send
  WebSocket.prototype.send = function (data: any) {
    console.log('[WS OUT]', data)
    return originalSend.call(this, data)
  }

  const originalOnMessage = Object.getOwnPropertyDescriptor(
    WebSocket.prototype,
    'onmessage'
  )
  Object.defineProperty(WebSocket.prototype, 'onmessage', {
    set(fn: any) {
      const wrapped = function (this: WebSocket, event: MessageEvent) {
        console.log('[WS IN]', event.data)
        return fn.call(this, event)
      }
      return originalOnMessage?.set.call(this, wrapped)
    },
  })
}
```

### Error Boundary for React

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class CinacoinErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to error tracking service
    console.error('[Cinacoin Error Boundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Try Again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}

// Usage
<CinacoinErrorBoundary>
  <CinacoinProvider config={config}>
    <App />
  </CinacoinProvider>
</CinacoinErrorBoundary>
```

---

## 📊 Error Codes Quick Reference

For the complete error code reference, see [Error Code Reference](./error-codes.md).

| Range | Category |
|-------|----------|
| `WC_1001` – `WC_1010` | Connection & Pairing Errors |
| `WC_2001` – `WC_2010` | RPC & Method Errors |
| `WC_3001` – `WC_3010` | Payment & Swap Errors |
| `WC_4001` – `WC_4010` | Authentication (SIWE/SIWX) Errors |

---

## 📞 Getting Help

If you're still stuck:

1. **Check logs** — Enable `debug: true` for verbose output
2. **Search GitHub Issues** — [cinacoin/cinacoin/issues](https://github.com/cinacoin/cinacoin/issues)
3. **Error codes** — See [Error Code Reference](./error-codes.md)
4. **Community** — Join Cinacoin community channels

```typescript
// Maximum debug configuration
const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet],
  debug: true,
  logger: {
    level: 'trace', // most verbose
    output: 'console',
  },
}
```

---

*Troubleshooting Guide — Cinacoin Documentation*
