# Next.js

> `@cinacoin/next` — Next.js adapter for Cinacoin with App Router support.

## Installation

```bash
npm install @cinacoin/next @cinacoin/core-sdk
```

## Usage

```tsx
// app/providers.tsx
'use client'
import { CinacoinProvider } from '@cinacoin/next'

export function Providers({ children }) {
  return <CinacoinProvider>{children}</CinacoinProvider>
}
```

## Features

- App Router support
- Server component compatible
- SSR-safe initialization

## Related

- [React](/api/react) — React adapter
- [Nuxt](/api/nuxt) — Nuxt adapter
