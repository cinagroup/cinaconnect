# @cinacoin/next

Next.js SSR-optimized support for Cinacoin — App Router & Pages Router integration.

## Installation

```bash
npm install @cinacoin/next
```

## Usage

```tsx
// app/layout.tsx
import { OnuxProvider } from '@cinacoin/next';

export default function RootLayout({ children }) {
  return (
    <OnuxProvider projectId="YOUR_PROJECT_ID">
      {children}
    </OnuxProvider>
  );
}
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `OnuxProvider` | component | Provider wrapper for Next.js |
| `ConnectButton` | component | Connect wallet button |
| `AccountButton` | component | Account display button |
| `NetworkButton` | component | Network switcher button |
| `AppKitProviderOptions` | type | Provider options type |
