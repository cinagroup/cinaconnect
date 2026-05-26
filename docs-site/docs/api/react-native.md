# React Native

> `@cinaconnect/react-native` — React Native adapter for CinaConnect.

## Installation

```bash
npm install @cinaconnect/react-native @cinaconnect/core-sdk
```

## Usage

```tsx
import { CinaConnectProvider, ConnectButton } from '@cinaconnect/react-native'

function App() {
  return (
    <CinaConnectProvider config={{ projectId: 'your-project-id' }}>
      <ConnectButton />
    </CinaConnectProvider>
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
