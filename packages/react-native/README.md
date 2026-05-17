# @cinaconnect/react-native

React Native adapter for CinaConnect white-label UI toolkit.

## Installation

```bash
npm install @cinaconnect/react-native
```

## Usage

```tsx
import { CinaConnectProvider, ConnectButton, useCinaConnect } from '@cinaconnect/react-native';

function App() {
  return (
    <CinaConnectProvider projectId="YOUR_PROJECT_ID">
      <ConnectButton />
    </CinaConnectProvider>
  );
}
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinaConnectProvider` | component | Provider wrapper |
| `ConnectButton` | component | Connect wallet button |
| `ConnectModal` | component | Connect wallet modal |
| `QRScanner` | component | QR code scanner |
| `DeepLinkManager` | class | Deep link handler |
| `deepLinkManager` | singleton | Global deep link instance |
| `useCinaConnect` | hook | Main wallet hook |
| `useAccount` | hook | Account data hook |
| `CinaConnectConfig` | type | Configuration type |
| `WalletSchemeConfig` | type | Wallet scheme config |
