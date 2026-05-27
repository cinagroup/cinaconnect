# React Native

> `@cinacoin/react-native` — React Native adapter for Cinacoin.

## Installation

```bash
npm install @cinacoin/react-native @cinacoin/core-sdk
```

## Usage

```tsx
import { CinacoinProvider, ConnectButton } from '@cinacoin/react-native'

function App() {
  return (
    <CinacoinProvider config={{ projectId: 'your-project-id' }}>
      <ConnectButton />
    </CinacoinProvider>
  )
}
```

## Features

- Native wallet deep linking
- Universal link handling
- Custom modal for wallet selection

## Related

- [React](/api/react) — Web React adapter
- [iOS Swift](/api/ios-swift) — iOS native SDK
- [Android Kotlin](/api/android-kotlin) — Android native SDK
