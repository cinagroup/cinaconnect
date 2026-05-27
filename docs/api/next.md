# Next.js SDK API

> `@cinacoin/next` — Next.js App Router & Pages Router 集成。

## Installation

```bash
npm install @cinacoin/next
```

## App Router (Recommended)

### Provider

```tsx
// app/providers.tsx
'use client'
import { AppKitProvider } from '@cinacoin/next'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppKitProvider
      projectId="your-project-id"
      relayUrl="wss://relay.yourdomain.com/v1"
      chains={[
        { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrl: 'https://eth.llamarpc.com' },
      ]}
    >
      {children}
    </AppKitProvider>
  )
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## Pages Router

```tsx
// pages/_app.tsx
import { AppKitPagesRouter } from '@cinacoin/next'

function MyApp({ Component, pageProps }) {
  return (
    <AppKitPagesRouter
      projectId="your-project-id"
      chains={[/* ... */]}
    >
      <Component {...pageProps} />
    </AppKitPagesRouter>
  )
}
```

## Server Utilities

```typescript
import { getCinacoinServer, getSession, verifySiweMessage, createServerClient } from '@cinacoin/next/server'
import { withCinacoinAuth, requireAuth } from '@cinacoin/next/server/middleware'

// Middleware protection
export const middleware = withCinacoinAuth({
  redirectUrl: '/login',
})

// Server-side session
const session = await getSession(request)
const isValid = await verifySiweMessage(message, signature)
```

### Edge Runtime

```typescript
import { getEdgeSession, withCinacoinAuthEdge, requireAuthEdge } from '@cinacoin/next/server/edge'

// Edge middleware
export const config = { runtime: 'edge' }
export const middleware = withCinacoinAuthEdge()
```

### Server Actions

```typescript
'use server'
import { createSiweSession, authenticateWithWallet } from '@cinacoin/next/server/actions'

export async function login(wallet: string, signature: string) {
  return await authenticateWithWallet({ wallet, signature, message: 'Sign in' })
}
```

## Client Hooks

```tsx
'use client'
import { useCinacoin, useCinacoinAccount, useDisconnect, useBalance, useAppKit } from '@cinacoin/next'

function WalletStatus() {
  const { address, isConnected } = useCinacoinAccount()
  const { balance } = useBalance()
  const { disconnect } = useDisconnect()

  if (!isConnected) return <button onClick={() => open()}>Connect</button>
  return <div>
    <p>{address}</p>
    <p>{balance}</p>
    <button onClick={() => disconnect()}>Disconnect</button>
  </div>
}
```

### SSR-safe Hooks

```tsx
import { useAppKitState, useHydratedAppKit, useOnChainReady } from '@cinacoin/next'

// Safe for SSR
const { isConnected } = useAppKitState()
const { isReady } = useOnChainReady()
```

## Components

```tsx
import { ConnectButton, AccountButton, NetworkButton } from '@cinacoin/next'

<ConnectButton />
<AccountButton />
<NetworkButton />
```

## Error Handling

Server utilities throw `CinacoinAuthError` on auth failure. Client hooks expose `error` state.

```tsx
try {
  await requireAuth(request)
} catch (err) {
  return Response.redirect('/login')
}
```

## See Also

- [Core SDK](./core-sdk.md)
- [React SDK](./react.md)
- [SIWE](./siwe.md)
