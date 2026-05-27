# React API

> `@cinacoin/react` — React hooks, provider, and UI components for Cinacoin.

## Installation

```bash
npm install @cinacoin/react @cinacoin/core-sdk
```

## Provider

### CinacoinProvider

Wrap your app (or a subtree) with `CinacoinProvider` to give all child components access to the Cinacoin context.

```tsx
import { CinacoinProvider } from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'

function App() {
  return (
    <CinacoinProvider
      projectId="your-project-id"
      chains={[
        { id: 'eip155:1', name: 'Ethereum', rpcUrl: 'https://eth.llamarpc.com' },
        { id: 'eip155:137', name: 'Polygon', rpcUrl: 'https://polygon-rpc.com' },
      ]}
      adapters={[new EvmAdapter()]}
      themeMode="dark"
    >
      <YourApp />
    </CinacoinProvider>
  )
}
```

#### CinacoinConfig

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `projectId` | `string` | ✅ | — | Project ID for relay connection |
| `chains` | `ChainConfig[]` | ✅ | — | Supported chains |
| `adapters` | `ChainAdapter[]` | ❌ | `[]` | Chain adapters to register |
| `themeMode` | `ThemeMode` | ❌ | `'auto'` | Theme: `'light'`, `'dark'`, or `'auto'` |
| `metadata` | `AppMetadata` | ❌ | — | dApp metadata for pairing |
| `debug` | `boolean` | ❌ | `false` | Enable debug logging |
| `onConnect` | `(result: ConnectionResult) => void` | ❌ | — | Connection callback |
| `onDisconnect` | `() => void` | ❌ | — | Disconnection callback |

#### CinacoinContextValue

The object returned by `useCinacoinContext()`:

| Property | Type | Description |
|----------|------|-------------|
| `connect` | `(walletId: string, params?: ConnectParams) => Promise<ConnectionResult>` | Connect to a wallet |
| `disconnect` | `() => Promise<void>` | Disconnect current wallet |
| `account` | `AccountState \| null` | Current account info |
| `status` | `'disconnected' \| 'connecting' \| 'connected' \| 'error'` | Connection status |
| `isSwitchingChain` | `boolean` | Whether a chain switch is in progress |
| `chains` | `ChainConfig[]` | Configured chains |
| `themeMode` | `ThemeMode` | Current theme mode |

#### ChainConfig

```typescript
interface ChainConfig {
  id: string         // CAIP-2 chain ID, e.g. 'eip155:1'
  name: string       // Human-readable name
  rpcUrl: string     // JSON-RPC endpoint
  nativeCurrency?: { name: string; symbol: string; decimals: number }
  explorerUrl?: string
  iconUrl?: string
}
```

#### ThemeMode

```typescript
type ThemeMode = 'light' | 'dark' | 'auto'
```

## Core Hooks

### useCinacoin

Access the full Cinacoin context.

```tsx
import { useCinacoin } from '@cinacoin/react'

function MyComponent() {
  const { connect, disconnect, account, status } = useCinacoin()

  return (
    <div>
      {status === 'connected' ? (
        <>
          <p>Connected: {account?.address}</p>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      ) : (
        <button onClick={() => connect('metamask')}>Connect MetaMask</button>
      )}
    </div>
  )
}
```

**Returns:** `CinacoinContextValue` (see table above)

### useAccount

Get the current account state.

```tsx
import { useAccount } from '@cinacoin/react'

function AccountInfo() {
  const account = useAccount()

  if (!account) return <p>Not connected</p>

  return (
    <div>
      <p>Address: {account.address}</p>
      <p>Balance: {account.balance}</p>
      <p>Chain: {account.chainSymbol} (ID: {account.chainId})</p>
    </div>
  )
}
```

**Returns:** `AccountState | null`

```typescript
interface AccountState {
  address: string
  balance?: string
  chainId: number
  chainSymbol?: string
}
```

### useChainId

Get the current chain ID.

```tsx
import { useChainId } from '@cinacoin/react'

function ChainBadge() {
  const chainId = useChainId()

  if (!chainId) return null

  return <span>Chain ID: {chainId}</span>
}
```

**Returns:** `number | null`

### useConnect

Connect to a wallet, with status tracking.

```tsx
import { useConnect } from '@cinacoin/react'

function ConnectWallet() {
  const { connect, status, isSwitchingChain } = useConnect()

  const handleConnect = async (walletId: string) => {
    try {
      const result = await connect(walletId)
      console.log('Connected:', result.accounts)
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  return (
    <div>
      {status === 'connecting' && <p>Connecting...</p>}
      {isSwitchingChain && <p>Switching chain...</p>}
      <button onClick={() => handleConnect('metamask')}>MetaMask</button>
      <button onClick={() => handleConnect('walletconnect')}>WalletConnect</button>
      <button onClick={() => handleConnect('coinbase')}>Coinbase Wallet</button>
    </div>
  )
}
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `connect` | `(walletId: string, params?: ConnectParams) => Promise<ConnectionResult>` | Connect function |
| `status` | `ConnectionStatus` | Current connection status |
| `isSwitchingChain` | `boolean` | Chain switch in progress |

### useDisconnect

Disconnect from the current wallet.

```tsx
import { useDisconnect } from '@cinacoin/react'

function DisconnectButton() {
  const { disconnect } = useDisconnect()

  return <button onClick={disconnect}>Disconnect</button>
}
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `disconnect` | `() => Promise<void>` | Disconnect function |

## EIP-5792 Hooks (Wallet Call API)

These hooks provide React-friendly access to [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) Wallet Call API capabilities, including atomic batch transactions.

### useWalletCapabilities

Discover what a connected wallet can do per chain.

```tsx
import { useWalletCapabilities } from '@cinacoin/react'

function CapabilityCheck() {
  const { capabilities, has, supportedChains, isLoading } = useWalletCapabilities()

  if (isLoading) return <p>Loading capabilities...</p>

  return (
    <div>
      <p>Supported chains: {supportedChains.join(', ')}</p>
      {has('0x1', 'atomicBatch') && (
        <p>✅ Atomic batch available on Ethereum mainnet</p>
      )}
      {has('0x1', 'paymasterService') && (
        <p>✅ Gas sponsorship available on Ethereum mainnet</p>
      )}
    </div>
  )
}
```

**Returns:** `UseWalletCapabilitiesReturn`

| Property | Type | Description |
|----------|------|-------------|
| `capabilities` | `WalletCapabilities \| null` | Per-chain capability object |
| `isLoading` | `boolean` | Fetch in progress |
| `error` | `Error \| null` | Fetch error |
| `refetch` | `() => Promise<void>` | Re-fetch capabilities |
| `has` | `(chainId: string, capability: string) => boolean` | Check a specific capability |
| `getChainCaps` | `(chainId: string) => ChainCapabilities` | Get chain's capabilities |
| `supportedChains` | `string[]` | List of supported chain IDs |
| `filterBy` | `(capability: string) => WalletCapabilities` | Filter chains by capability |

### useSendCalls

Send multiple calls as a batch.

```tsx
import { useSendCalls } from '@cinacoin/react'

function BatchTransfer() {
  const { sendCalls, isExecuting, error } = useSendCalls()

  const handleBatchSend = async () => {
    const result = await sendCalls({
      calls: [
        { to: '0xRecipient1', value: '0x0', data: '0x...' },
        { to: '0xRecipient2', value: '0x0', data: '0x...' },
      ],
      capabilities: {
        paymasterService: { url: 'https://paymaster.example.com' },
      },
    })

    console.log('Batch ID:', result.id)
  }

  return (
    <button onClick={handleBatchSend} disabled={isExecuting}>
      {isExecuting ? 'Sending...' : 'Send Batch'}
    </button>
  )
}
```

**Returns:** `UseSendCallsReturn`

| Property | Type | Description |
|----------|------|-------------|
| `sendCalls` | `(params: SendCallsParams) => Promise<SendCallsResult>` | Send batched calls |
| `isExecuting` | `boolean` | Execution in progress |
| `error` | `Error \| null` | Execution error |

### useAtomicBatch

Build and execute atomic batch transactions.

```tsx
import { useAtomicBatch } from '@cinacoin/react'

function AtomicSwap() {
  const {
    executeBatch,
    buildBatch,
    isExecuting,
    isAtomicSupported,
    error,
    lastCallId,
  } = useAtomicBatch()

  if (!isAtomicSupported) {
    return <p>Atomic batch not supported by this wallet</p>
  }

  const handleSwap = async () => {
    const batchId = await executeBatch({
      calls: [
        {
          to: usdcAddress,
          data: encodeApprove(spender, amount),
        },
        {
          to: swapRouter,
          data: encodeSwap(fromToken, toToken, amount),
        },
      ],
      simulate: true,
    })

    console.log('Atomic batch submitted:', batchId)
  }

  return (
    <button onClick={handleSwap} disabled={isExecuting}>
      {isExecuting ? 'Swapping...' : 'Atomic Swap'}
    </button>
  )
}
```

**Returns:** `UseAtomicBatchReturn`

| Property | Type | Description |
|----------|------|-------------|
| `executeBatch` | `(options: AtomicBatchOptions) => Promise<string>` | Execute atomic batch |
| `buildBatch` | `(calls: Call[]) => AtomicBatchConfig` | Build batch config (dry-run) |
| `isExecuting` | `boolean` | Execution in progress |
| `isAtomicSupported` | `boolean` | Whether wallet supports atomic batch |
| `error` | `Error \| null` | Execution error |
| `lastCallId` | `string \| null` | Last submitted batch ID |

### useCallsStatus

Poll the status of an async call batch.

```tsx
import { useCallsStatus } from '@cinacoin/react'

function BatchStatus({ batchId }: { batchId: string }) {
  const {
    status,
    result,
    isPolling,
    allSucceeded,
    failedReceipts,
    startPolling,
    stopPolling,
  } = useCallsStatus({ intervalMs: 2000 })

  // Start polling when batchId changes
  useEffect(() => {
    if (batchId) startPolling(batchId)
    return () => stopPolling()
  }, [batchId])

  if (status === 'CONFIRMED') {
    return (
      <div>
        <p>✅ All calls confirmed</p>
        {result?.receipts?.map((r, i) => (
          <p key={i}>Call {i}: {r.receipt.status === '0x1' ? '✅' : '❌'}</p>
        ))}
      </div>
    )
  }

  return (
    <div>
      <p>Status: {status ?? 'pending'}</p>
      {isPolling && <p>⏳ Polling...</p>}
    </div>
  )
}
```

**Returns:** `UseCallsStatusReturn`

| Property | Type | Description |
|----------|------|-------------|
| `status` | `CallsStatus \| null` | Current batch status |
| `result` | `GetCallsStatusResult \| null` | Full result with receipts |
| `isPolling` | `boolean` | Polling active |
| `error` | `Error \| null` | Polling error |
| `startPolling` | `(batchId: string) => void` | Start polling |
| `stopPolling` | `() => void` | Stop polling |
| `allSucceeded` | `boolean` | All calls succeeded |
| `failedReceipts` | `CallReceipt[]` | Failed call receipts |

## UI Components

### ConnectButton

A ready-to-use connect/disconnect button.

```tsx
import { ConnectButton } from '@cinacoin/react'

function Header() {
  return <ConnectButton label="Connect Wallet" />
}
```

#### ConnectButtonProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `'Connect Wallet'` | Button text when disconnected |
| `className` | `string` | — | CSS class |
| `style` | `React.CSSProperties` | — | Inline styles |
| `showBalance` | `boolean` | `true` | Show balance when connected |
| `showChain` | `boolean` | `true` | Show current chain when connected |

### ConnectModal

A modal dialog for selecting and connecting wallets.

```tsx
import { ConnectModal } from '@cinacoin/react'
import { useState } from 'react'

function App() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Open Connect Modal</button>
      <ConnectModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Connect your wallet"
      />
    </>
  )
}
```

#### ConnectModalProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | — | Modal visibility |
| `onClose` | `() => void` | — | Close callback |
| `title` | `string` | `'Connect Wallet'` | Modal title |
| `className` | `string` | — | CSS class |

### ChainSwitcher

Dropdown for switching between configured chains.

```tsx
import { ChainSwitcher } from '@cinacoin/react'

function Navbar() {
  return <ChainSwitcher />
}
```

#### ChainSwitcherProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | — | CSS class |
| `showIcon` | `boolean` | `true` | Show chain icons |
