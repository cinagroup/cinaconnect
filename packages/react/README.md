# @cinaconnect/react

React adapter for CinaConnect white-label UI toolkit.

## Installation

```bash
npm install @cinaconnect/react
```

## Usage

```tsx
import { CinaConnectProvider, ConnectButton, useCinaConnect } from '@cinaconnect/react';

function App() {
  return (
    <CinaConnectProvider projectId="YOUR_PROJECT_ID">
      <ConnectButton />
    </CinaConnectProvider>
  );
}

function WalletInfo() {
  const { address, isConnected } = useCinaConnect();
  return isConnected ? <p>Connected: {address}</p> : <p>Not connected</p>;
}
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinaConnectProvider` | component | Provider wrapper |
| `ConnectButton` | component | Connect wallet button |
| `ConnectModal` | component | Connect wallet modal |
| `ChainSwitcher` | component | Chain switcher component |
| `useCinaConnect` | hook | Main wallet hook |
| `useAccount` | hook | Account data hook |
| `useChainId` | hook | Chain ID hook |
| `useConnect` | hook | Connect hook |
| `useDisconnect` | hook | Disconnect hook |
| `useCinaConnectContext` | hook | Full context hook |
| `CinaConnectConfig` | type | Configuration type |
| `ThemeMode` | type | Theme mode enum |
