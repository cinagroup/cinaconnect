# @cinacoin/react-native

React Native adapter for Cinacoin white-label UI toolkit.

## Installation

```bash
npm install @cinacoin/react-native
```

## Usage

```tsx
import { CinacoinProvider, ConnectButton, useCinacoin } from '@cinacoin/react-native';

function App() {
  return (
    <CinacoinProvider projectId="YOUR_PROJECT_ID">
      <ConnectButton />
    </CinacoinProvider>
  );
}
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinacoinProvider` | component | Provider wrapper |
| `ConnectButton` | component | Connect wallet button |
| `ConnectModal` | component | Connect wallet modal |
| `QRScanner` | component | QR code scanner |
| `DeepLinkManager` | class | Deep link handler |
| `deepLinkManager` | singleton | Global deep link instance |
| `useCinacoin` | hook | Main wallet hook |
| `useAccount` | hook | Account data hook |
| `CinacoinConfig` | type | Configuration type |
| `WalletSchemeConfig` | type | Wallet scheme config |
