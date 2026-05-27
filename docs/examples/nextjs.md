# Next.js App Router Integration

> Integrate Cinacoin into Next.js App Router with Server Components, client-side wallet connection, and server-side SIWE auth.

## Prerequisites

- Node.js ≥ 18
- Next.js 14+ (App Router)
- npm ≥ 9 / pnpm ≥ 8
- A project ID from your Cinacoin dashboard

## Installation

```bash
npm install @cinacoin/next @cinacoin/core-sdk @cinacoin/react @cinacoin/siwe
```

## Complete Example

### 1. AppKitProvider (Client Component)

```tsx
// app/providers.tsx
'use client'

import { AppKitProvider } from '@cinacoin/next'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function Providers({ children }: Props) {
  return (
    <AppKitProvider
      projectId={process.env.NEXT_PUBLIC_CINACOIN_PROJECT_ID!}
      networks={[
        {
          id: 1,
          name: 'Ethereum',
          rpcUrl: 'https://eth.drpc.org',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
        },
        {
          id: 137,
          name: 'Polygon',
          rpcUrl: 'https://polygon-rpc.com',
          nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
          },
        },
        {
          id: 42161,
          name: 'Arbitrum',
          rpcUrl: 'https://arb1.arbitrum.io/rpc',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
        },
      ]}
      metadata={{
        name: 'My Next.js dApp',
        description: 'A decentralized application built with Next.js',
        url: 'https://mydapp.com',
        icons: ['https://mydapp.com/icon.png'],
      }}
      themeMode="dark"
      recommendedWallets={['metamask', 'walletconnect', 'coinbase']}
    >
      {children}
    </AppKitProvider>
  )
}
```

### 2. Root Layout

```tsx
// app/layout.tsx
import { Providers } from './providers'
import './globals.css'

export const metadata = {
  title: 'My Next.js dApp',
  description: 'Built with Cinacoin',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### 3. Home Page (Client-Side Wallet Connection)

```tsx
// app/page.tsx
'use client'

import {
  useCinacoinAccount,
  useCinacoinNetwork,
  useDisconnect,
  useBalance,
} from '@cinacoin/next'
import { ConnectButton, AccountButton, NetworkButton } from '@cinacoin/next'

export default function HomePage() {
  const account = useCinacoinAccount()
  const network = useCinacoinNetwork()
  const balance = useBalance()
  const { disconnect } = useDisconnect()

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1>My Next.js dApp</h1>

      {/* Built-in Connect Button */}
      <ConnectButton />

      {/* Alternative: Custom UI */}
      {account.isConnected ? (
        <div style={{ marginTop: 24 }}>
          <h2>✅ Connected</h2>
          <div style={{ border: '1px solid #333', borderRadius: 8, padding: 16 }}>
            <p><strong>Address:</strong> <code>{account.address}</code></p>
            <p><strong>Network:</strong> {network.name} (ID: {network.chainId})</p>
            <p><strong>Balance:</strong> {balance.formatted} {balance.symbol}</p>
          </div>

          {/* Built-in buttons */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <AccountButton />
            <NetworkButton />
            <button onClick={() => disconnect()}>Disconnect</button>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 24 }}>Connect your wallet to get started.</p>
      )}
    </main>
  )
}
```

### 4. Server Component with Auth Check

```tsx
// app/dashboard/page.tsx
import { getSession, createServerClient } from '@cinacoin/next/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Get the current session on the server
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Use server client for backend operations
  const serverClient = createServerClient({
    projectId: process.env.CINACOIN_PROJECT_ID!,
  })

  // Fetch server-side data
  const account = await serverClient.getAccount(session.walletId)

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, <code>{session.address}</code></p>
      <p>Wallet: {session.walletId}</p>
      <p>Connected at: {new Date(session.createdAt).toLocaleString()}</p>
    </div>
  )
}
```

### 5. SIWE Auth API Route

```ts
// app/api/auth/siwe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySiweMessage, parseMessage } from '@cinacoin/next/server'
import { generateNonce } from '@cinacoin/siwe'
import { cookies } from 'next/headers'

// GET: Return a nonce for SIWE
export async function GET() {
  const nonce = generateNonce()
  // Store nonce in cookie (server-side only)
  const cookieStore = await cookies()
  cookieStore.set('siwe-nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  return NextResponse.json({ nonce })
}

// POST: Verify SIWE signature
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { message, signature } = body

  if (!message || !signature) {
    return NextResponse.json(
      { error: 'Missing message or signature' },
      { status: 400 }
    )
  }

  try {
    // Verify the SIWE message and signature
    const result = await verifySiweMessage(message, signature)

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid signature', errors: result.errors },
        { status: 401 }
      )
    }

    // Parse the message for details
    const parsed = parseMessage(message)

    // Verify nonce matches cookie
    const cookieStore = await cookies()
    const storedNonce = cookieStore.get('siwe-nonce')?.value
    if (storedNonce !== parsed.nonce) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 401 }
      )
    }

    // Create session
    const session = {
      address: parsed.address,
      chainId: parsed.chainId,
      walletId: 'metamask',
      createdAt: Date.now(),
    }

    // Set session cookie
    cookieStore.set('session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return NextResponse.json({
      valid: true,
      address: parsed.address,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
```

### 6. Auth Middleware

```ts
// app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@cinacoin/next/server'

export async function GET(request: NextRequest) {
  // requireAuth checks for a valid session
  const session = await requireAuth(request)

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    message: 'You are authenticated!',
    address: session.address,
  })
}
```

### 7. Client-Side SIWE Login Component

```tsx
// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useCinacoin, useConnect } from '@cinacoin/next'
import { generateMessage } from '@cinacoin/siwe'
import { Connector } from '@cinacoin/core-sdk'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { account, connect } = useCinacoin()
  const { status } = useConnect()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function signIn() {
    if (!account.address) return
    setLoading(true)

    try {
      // 1. Get nonce from server
      const nonceRes = await fetch('/api/auth/siwe')
      const { nonce } = await nonceRes.json()

      // 2. Generate SIWE message
      const message = generateMessage({
        domain: window.location.host,
        address: account.address,
        uri: window.location.origin,
        chainId: account.chainId ?? 1,
        nonce,
        statement: 'Sign in to My dApp',
      })

      // 3. Sign with wallet
      const connector = new Connector({
        projectId: process.env.NEXT_PUBLIC_CINACOIN_PROJECT_ID!,
      })

      const signature = await connector.request({
        method: 'personal_sign',
        params: [message, account.address],
      })

      // 4. Verify on server
      const verifyRes = await fetch('/api/auth/siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      })

      if (verifyRes.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        const error = await verifyRes.json()
        console.error('Auth failed:', error)
      }
    } catch (err) {
      console.error('Sign-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!account.address) {
    return (
      <div>
        <h1>Sign In</h1>
        <button onClick={() => connect('metamask')}>
          Connect MetaMask
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1>Sign In</h1>
      <p>Connected: <code>{account.address}</code></p>
      <button onClick={signIn} disabled={loading}>
        {loading ? 'Signing...' : 'Sign In'}
      </button>
    </div>
  )
}
```

### 8. Pages Router Support

```tsx
// For Pages Router projects, use AppKitPagesRouter:
import { AppKitPagesRouter } from '@cinacoin/next'

// pages/_app.tsx
function MyApp({ Component, pageProps }) {
  return (
    <AppKitPagesRouter
      projectId={process.env.NEXT_PUBLIC_CINACOIN_PROJECT_ID!}
      networks={[
        { id: 1, name: 'Ethereum', rpcUrl: 'https://eth.drpc.org' },
      ]}
    >
      <Component {...pageProps} />
    </AppKitPagesRouter>
  )
}

export default MyApp
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_CINACOIN_PROJECT_ID=your-project-id
CINACOIN_PROJECT_ID=your-project-id
```

## Project Structure

```
app/
├── layout.tsx              # Root layout with Providers
├── page.tsx                # Home page (client component)
├── providers.tsx           # AppKitProvider wrapper
├── login/
│   └── page.tsx            # SIWE login page
├── dashboard/
│   └── page.tsx            # Server component (auth required)
└── api/
    ├── auth/
    │   └── siwe/
    │       └── route.ts    # SIWE auth endpoint
    └── protected/
        └── route.ts        # Auth-protected API route
```

## Related

- [React Integration](./react-integration.md)
- [SIWE Auth](./siwe-auth.md)
- [Ethereum](./ethereum.md)
- [Quick Start](../guide/quick-start.md)
