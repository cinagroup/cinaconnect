# Performance Optimization Guide

> Keep Cinacoin fast. Users should never wait more than a few hundred milliseconds to connect their wallet.

---

## Table of Contents

1. [Bundle Size Optimization](#1-bundle-size-optimization)
2. [Lazy Loading Strategies](#2-lazy-loading-strategies)
3. [Caching Strategies](#3-caching-strategies)
4. [Reducing Re-renders in React](#4-reducing-re-renders-in-react)
5. [Optimizing EIP-5792 Batch Calls](#5-optimizing-eip-5792-batch-calls)
6. [Network Request Optimization](#6-network-request-optimization)
7. [Memoization Patterns](#7-memoization-patterns)
8. [Benchmarking](#8-benchmarking)

---

## 1. Bundle Size Optimization

### Tree Shaking

Cinacoin packages are published with `"sideEffects": false` in package.json, enabling full tree shaking. Make sure your bundler supports it.

**Webpack:**
```js
// webpack.config.js
module.exports = {
  mode: 'production', // enables tree shaking by default
  optimization: {
    usedExports: true,
    sideEffects: true,
  },
};
```

**Vite / Rollup:** Tree shaking is enabled by default. No config needed.

### Import Only What You Need

```ts
// ❌ Bad — pulls in everything
import { Cinacoin } from '@cinacoin/core-sdk';

// ✅ Good — import only the wallet connector you need
import { ConnectorMetaMask } from '@cinacoin/core-sdk';
import { createCinacoin } from '@cinacoin/core-sdk';
```

### Analyze Your Bundle

Use the built-in bundle analyzer:

```bash
npx tsx scripts/check-bundle-size.ts --verbose
```

Or use `rollup-plugin-visualizer` / `webpack-bundle-analyzer` for visual breakdowns.

### Code Splitting

Split wallet connection logic from the rest of your app:

```ts
// WalletConnector.tsx — lazy-loaded component
import { lazy, Suspense } from 'react';

const WalletModal = lazy(() => import('@cinacoin/react'));

function App() {
  return (
    <Suspense fallback={<div>Loading wallet…</div>}>
      <WalletModal />
    </Suspense>
  );
}
```

### Target Bundle Budgets

| Package | Max (gzipped) | Notes |
|---------|--------------|-------|
| `@cinacoin/core-sdk` | < 15 KB | Core protocol logic |
| `@cinacoin/react` | < 12 KB | React hooks only |
| `@cinacoin/core-ui` | < 25 KB | UI components (optional) |
| Full toolkit | < 50 KB | All-in-one import |

---

## 2. Lazy Loading Strategies

### Connector Lazy Loading

Don't initialize all wallet connectors at once. Load them on demand:

```ts
import { createCinacoin, lazyConnector } from '@cinacoin/core-sdk';

const cina = createCinacoin({
  connectors: [
    lazyConnector(async () => {
      const { ConnectorMetaMask } = await import('@cinacoin/core-sdk');
      return new ConnectorMetaMask();
    }),
    lazyConnector(async () => {
      const { ConnectorWalletConnect } = await import('@cinacoin/core-sdk');
      return new ConnectorWalletConnect();
    }),
  ],
});
```

### Dynamic Chain Loading

Load chain configurations only when the user switches:

```ts
async function loadChainConfig(chainId: number) {
  const config = await fetch(`/api/chains/${chainId}`);
  return config.json();
}
```

### UI Component Lazy Loading

```tsx
// Only load heavy UI when the modal opens
const ConnectModal = lazy(() => import('@cinacoin/core-ui'));

function App() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>Connect</button>
      {showModal && (
        <Suspense fallback={<Spinner />}>
          <ConnectModal onClose={() => setShowModal(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### Strategy Comparison

| Strategy | When to Use | Savings |
|----------|-------------|---------|
| Code splitting | Large components | 30-50% initial load reduction |
| Lazy connectors | > 3 wallet options | 10-20 KB saved per connector |
| Dynamic chains | Multi-chain apps | Per-chain RPC config only |
| Conditional imports | Feature-flagged features | Variable |

---

## 3. Caching Strategies

### Session Caching

Persist wallet sessions to avoid re-connection on page reload:

```ts
import { createCinacoin } from '@cinacoin/core-sdk';

const cina = createCinacoin({
  storage: {
    // Use localStorage for persistence across sessions
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  },
  session: {
    // Session TTL in milliseconds (default: 24h)
    ttl: 24 * 60 * 60 * 1000,
  },
});
```

### Chain Metadata Caching

Cache chain metadata (RPC URLs, chain IDs, native currencies) to avoid redundant fetches:

```ts
class ChainCache {
  private cache = new Map<number, ChainConfig>();
  private ttl: number;
  private timestamps = new Map<number, number>();

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  get(chainId: number): ChainConfig | undefined {
    const ts = this.timestamps.get(chainId);
    if (ts && Date.now() - ts > this.ttl) {
      this.cache.delete(chainId);
      this.timestamps.delete(chainId);
      return undefined;
    }
    return this.cache.get(chainId);
  }

  set(chainId: number, config: ChainConfig) {
    this.cache.set(chainId, config);
    this.timestamps.set(chainId, Date.now());
  }
}
```

### Token List Caching

Cache token lists with stale-while-revalidate:

```ts
async function getTokenList(chainId: number): Promise<Token[]> {
  const cached = localStorage.getItem(`tokens-${chainId}`);
  const cachedData = cached ? JSON.parse(cached) : null;

  // Serve cached data immediately if available
  if (cachedData && Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
    // Revalidate in background
    fetchTokenListFromAPI(chainId).then((fresh) => {
      localStorage.setItem(`tokens-${chainId}`, JSON.stringify({
        data: fresh,
        timestamp: Date.now(),
      }));
    });
    return cachedData.data;
  }

  // Fetch fresh
  const data = await fetchTokenListFromAPI(chainId);
  localStorage.setItem(`tokens-${chainId}`, JSON.stringify({
    data,
    timestamp: Date.now(),
  }));
  return data;
}
```

### RPC Response Caching

Cache idempotent RPC calls (balance, chain info, token metadata):

```ts
class RPCCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  async call(rpcUrl: string, method: string, params: unknown[], ttlMs: number = 30_000): Promise<any> {
    const key = `${rpcUrl}:${method}:${JSON.stringify(params)}`;
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    const value = await executeRPC(rpcUrl, method, params);
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
    return value;
  }
}
```

### Cache Invalidation Rules

| Cache Type | Invalidation Trigger | TTL |
|------------|---------------------|-----|
| Session | User disconnects, TTL expires | 24h |
| Chain metadata | Chain config update | 5 min |
| Token lists | Manual refresh, stale data | 1h (SWR) |
| RPC responses | New block, transaction sent | 10-30s |
| Balance | Transaction confirmed, manual refresh | 15s |

---

## 4. Reducing Re-renders in React

### Use Selectors, Not Full State

```tsx
import { useCinacoin } from '@cinacoin/react';

// ❌ Bad — re-renders on any state change
function WalletButton() {
  const state = useCinacoin();
  return <button>{state.account?.address}</button>;
}

// ✅ Good — only re-renders when address changes
function WalletButton() {
  const address = useCinacoin((s) => s.account?.address);
  return <button>{address}</button>;
}
```

### Memoize Expensive Components

```tsx
import { memo } from 'react';

// Memoize the token list — only re-renders when tokens or chain changes
const TokenList = memo(function TokenList({ tokens, chainId }: { tokens: Token[]; chainId: number }) {
  return (
    <ul>
      {tokens.map((t) => (
        <li key={t.address}>{t.symbol}</li>
      ))}
    </ul>
  );
});
```

### Avoid Inline Objects in Props

```tsx
// ❌ Bad — new object reference every render
<ConnectModal config={{ theme: 'dark', chains: [1, 137] }} />

// ✅ Good — stable reference
const modalConfig = useMemo(() => ({ theme: 'dark', chains: [1, 137] }), []);
<ConnectModal config={modalConfig} />
```

### Batch State Updates

```tsx
import { unstable_batchedUpdates } from 'react-dom';

// When updating multiple state values from a single event
function handleConnect(account: Account, chain: Chain) {
  unstable_batchedUpdates(() => {
    setAccount(account);
    setChain(chain);
    setStatus('connected');
  });
}
```

### Use `useTransition` for Non-Urgent Updates

```tsx
import { useState, useTransition } from 'react';

function TokenSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Token[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(q: string) {
    setQuery(q);
    startTransition(async () => {
      const tokens = await searchTokens(q);
      setResults(tokens);
    });
  }

  return (
    <div>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <TokenList tokens={results} />
    </div>
  );
}
```

---

## 5. Optimizing EIP-5792 Batch Calls

### Batch When Possible

EIP-5792 `wallet_sendCalls` lets you bundle multiple actions into a single user approval:

```ts
import { useSendCalls } from '@cinacoin/react';

// ❌ Bad — separate approvals for each action
async function doActions() {
  await wallet.sendTransaction({ to: A, data: call1 });
  await wallet.sendTransaction({ to: B, data: call2 });
  await wallet.sendTransaction({ to: C, data: call3 });
}

// ✅ Good — single atomic batch
const { sendCalls } = useSendCalls();

async function doActions() {
  await sendCalls({
    calls: [
      { to: A, data: call1, value: 0n },
      { to: B, data: call2, value: 0n },
      { to: C, data: call3, value: 0n },
    ],
    chainId: 1,
  });
}
```

### Parallel Status Polling

Don't poll batch status sequentially:

```ts
// ✅ Parallel polling for multiple batch statuses
async function pollAllStatuses(callIds: string[]) {
  const results = await Promise.all(
    callIds.map(async (id) => {
      while (true) {
        const status = await wallet_getCallsStatus({ callId: id });
        if (status.status === 'CONFIRMED') return { id, status };
        await sleep(1000);
      }
    })
  );
  return results;
}
```

### Capability Discovery

Check wallet capabilities before using features to avoid failed calls:

```ts
import { useWalletCapabilities } from '@cinacoin/react';

function BatchAction() {
  const capabilities = useWalletCapabilities();
  const supportsBatch = capabilities?.atomicBatch?.supported;

  if (!supportsBatch) {
    return <FallbackUI />;
  }

  return <BatchTransferUI />;
}
```

### Batch Size Limits

| Factor | Recommendation |
|--------|----------------|
| Max calls per batch | ≤ 10 (some wallets cap at 5) |
| Total calldata size | < 50 KB |
| Gas estimate | Pre-estimate to avoid out-of-gas |
| Timeout | 30s for confirmation polling |

---

## 6. Network Request Optimization

### Connection Reuse

Reuse WebSocket connections for real-time data:

```ts
class RPCPool {
  private connections = new Map<string, WebSocket>();

  getConnection(rpcUrl: string): WebSocket {
    let ws = this.connections.get(rpcUrl);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      ws = new WebSocket(rpcUrl);
      this.connections.set(rpcUrl, ws);
    }
    return ws;
  }
}
```

### Request Deduplication

Prevent duplicate in-flight requests:

```ts
class RequestDeduplicator {
  private inFlight = new Map<string, Promise<any>>();

  async request(key: string, fn: () => Promise<any>): Promise<any> {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}
```

### Timeout & Retry

```ts
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
  throw new Error('Unreachable');
}
```

### Payload Compression

For large payloads (token lists, transaction history), enable gzip/brotli:

```ts
// Server-side (Cloudflare Worker)
export default {
  async fetch(request: Request) {
    const response = await handleRequest(request);
    // Cloudflare auto-compresses; for self-hosted:
    response.headers.set('Content-Encoding', 'gzip');
    return response;
  },
};
```

---

## 7. Memoization Patterns

### `useMemo` for Computed Values

```tsx
function Portfolio({ tokens, prices }: { tokens: Token[]; prices: PriceMap }) {
  // Only recompute when tokens or prices change
  const totalValue = useMemo(() => {
    return tokens.reduce((sum, t) => sum + t.balance * (prices[t.address]?.usd ?? 0), 0);
  }, [tokens, prices]);

  return <div>Total: ${totalValue.toFixed(2)}</div>;
}
```

### `useCallback` for Event Handlers

```tsx
function TokenRow({ token, onSelect }: { token: Token; onSelect: (t: Token) => void }) {
  // Stable reference prevents child re-renders
  const handleClick = useCallback(() => {
    onSelect(token);
  }, [token, onSelect]);

  return <li onClick={handleClick}>{token.symbol}</li>;
}
```

### Externalize Stable Config

```ts
// config.ts — module-level constant, never changes
export const DEFAULT_CHAINS = [
  { id: 1, name: 'Ethereum', rpc: 'https://eth.rpc.cinacoin.com' },
  { id: 137, name: 'Polygon', rpc: 'https://polygon.rpc.cinacoin.com' },
] as const;

// Component — no need for useMemo
<ChainSelector chains={DEFAULT_CHAINS} />
```

### Custom Hook with Memoized State

```ts
import { useState, useCallback, useMemo } from 'react';

function useTokenList(chainId: number) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTokenList(chainId);
      setTokens(data);
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  const sorted = useMemo(() => {
    return [...tokens].sort((a, b) => b.balanceUSD - a.balanceUSD);
  }, [tokens]);

  return { tokens: sorted, loading, refresh };
}
```

---

## 8. Benchmarking

Run the benchmark script to measure baseline performance:

```bash
node scripts/benchmark.js
```

See [scripts/benchmark.js](../../scripts/benchmark.js) for implementation details.

### Key Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| Wallet connection time | < 2s | benchmark.js |
| Transaction signing time | < 1s | benchmark.js |
| Batch transaction time | < 3s (10 calls) | benchmark.js |
| Bundle size (gzipped) | < 50 KB | check-bundle-size.ts |
| First contentful paint | < 1.5s | Lighthouse |
| Time to interactive | < 3s | Lighthouse |
| Memory usage | < 50 MB | Chrome DevTools |

### Continuous Monitoring

Add performance checks to your CI:

```yaml
# .github/workflows/perf.yml
- name: Bundle size check
  run: npx tsx scripts/check-bundle-size.ts
- name: Run benchmarks
  run: node scripts/benchmark.js --ci
```
