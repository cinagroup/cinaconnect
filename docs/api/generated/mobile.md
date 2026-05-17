# Mobile SDK — Generated API Overview

> Auto-generated reference for `@cinaconnect/react-native` and `@cinaconnect/core`. For the hand-written guide, see [Mobile SDK API](../../api/mobile.md).

## Entry Points

| Package | Entry |
|---------|-------|
| `@cinaconnect/react-native` | `packages/react-native/src/index.ts` |
| `@cinaconnect/core` | `packages/core-sdk/src/index.ts` |

## Key Exports (React Native)

| Export | Type | Description |
|--------|------|-------------|
| `CinaConnectProvider` | Component | Top-level provider for RN apps |
| `ConnectButton` | Component | Mobile connect button |
| `ConnectModal` | Component | Mobile wallet selection modal |
| `WalletList` | Component | Wallet list component |
| `ChainSwitcher` | Component | Chain switcher component |
| `useCinaConnect` | Hook | React hook for CinaConnect context |

## Key Exports (Core — shared with mobile)

| Export | Type | Description |
|--------|------|-------------|
| `CinaConnect` | Class | Main SDK entry point |
| `SessionManager` | Class | Session persistence (AsyncStorage) |
| `discoverWallets` | Function | EIP-6963 discovery |

## Mobile-Specific Features

- **Deep Link Handling** — Via `Linking` API integration
- **Push Notifications** — APNs/FCM support for wallet callbacks
- **Native QR Scanning** — Using `react-native-camera` or `react-native-vision-camera`
- **AsyncStorage** — Session persistence on mobile

## See Also

- [Mobile SDK Hand-Written Docs](../../api/mobile.md) — Full API reference with examples
- [React Native Example](../../examples/react-native.md) — Complete RN example
- [iOS Example](../../examples/ios.md) — iOS native example
- [Android Example](../../examples/android.md) — Android native example
