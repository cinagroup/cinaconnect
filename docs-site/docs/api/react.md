# React

> `@cinaconnect/react` — React hooks, provider, and UI components for CinaConnect.

## Installation

```bash
npm install @cinaconnect/react @cinaconnect/core-sdk
```

## CinaConnectProvider

Wrap your app with `CinaConnectProvider` to give all child components access to the CinaConnect context.

```tsx
import { CinaConnectProvider } from '@cinaconnect/react'
import { EvmAdapter } from '@cinaconnect/core-sdk'

function App() {
  return (
    <CinaConnectProvider
      adapter={new EvmAdapter({
        projectId: 'your-project-id',
        relayUrl: 'wss://relay.yourdomain.com/v1',
      })}
    >
      {children}
    </CinaConnectProvider>
  )
}
```

## Hooks

- `useCinaConnect()` — Access the core SDK instance
- `useAccount()` — Current account state
- `useConnect()` — Connect to a wallet
- `useDisconnect()` — Disconnect from current wallet
- `useSwitchChain()` — Switch blockchain network
- `useSignMessage()` — Sign a message
- `useBalance()` — Query account balance

## ConnectButton

```tsx
import { ConnectButton } from '@cinaconnect/react'

function Header() {
  return <ConnectButton />
}
```

## Related

- [Core SDK](/api/core-sdk) — Core SDK reference
- [Vue](/api/vue) — Vue adapter
- [Svelte](/api/svelte) — Svelte adapter
- [Next.js](/api/next) — Next.js adapter
