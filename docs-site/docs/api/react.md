# React

> `@cinacoin/react` — React hooks, provider, and UI components for Cinacoin.

## Installation

```bash
npm install @cinacoin/react @cinacoin/core-sdk
```

## CinacoinProvider

Wrap your app with `CinacoinProvider` to give all child components access to the Cinacoin context.

```tsx
import { CinacoinProvider } from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'

function App() {
  return (
    <CinacoinProvider
      adapter={new EvmAdapter({
        projectId: 'your-project-id',
        relayUrl: 'wss://relay.yourdomain.com/v1',
      })}
    >
      {children}
    </CinacoinProvider>
  )
}
```

## Hooks

- `useCinacoin()` — Access the core SDK instance
- `useAccount()` — Current account state
- `useConnect()` — Connect to a wallet
- `useDisconnect()` — Disconnect from current wallet
- `useSwitchChain()` — Switch blockchain network
- `useSignMessage()` — Sign a message
- `useBalance()` — Query account balance

## ConnectButton

```tsx
import { ConnectButton } from '@cinacoin/react'

function Header() {
  return <ConnectButton />
}
```

## Related

- [Core SDK](/api/core-sdk) — Core SDK reference
- [Vue](/api/vue) — Vue adapter
- [Svelte](/api/svelte) — Svelte adapter
- [Next.js](/api/next) — Next.js adapter
