# Next.js

> `@cinaconnect/next` — Next.js adapter for CinaConnect with App Router support.

## Installation

```bash
npm install @cinaconnect/next @cinaconnect/core-sdk
```

## Usage

```tsx
// app/providers.tsx
'use client'
import { CinaConnectProvider } from '@cinaconnect/next'

export function Providers({ children }) {
  return <CinaConnectProvider>{children}</CinaConnectProvider>
}
```

## Features

- App Router support
- Server component compatible
- SSR-safe initialization

## Related

- [React](/api/react) — React adapter
- [Nuxt](/api/nuxt) — Nuxt adapter
