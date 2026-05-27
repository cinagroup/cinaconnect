# @cinacoin/react

React adapter for Cinacoin white-label UI toolkit.

## Installation

```bash
npm install @cinacoin/react
```

## Usage

```tsx
import { CinacoinProvider, ConnectButton, useCinacoin } from '@cinacoin/react';

function App() {
  return (
    <CinacoinProvider projectId="YOUR_PROJECT_ID">
      <ConnectButton />
    </CinacoinProvider>
  );
}

function WalletInfo() {
  const { address, isConnected } = useCinacoin();
  return isConnected ? <p>Connected: {address}</p> : <p>Not connected</p>;
}
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinacoinProvider` | component | Provider wrapper |
| `ConnectButton` | component | Connect wallet button |
| `ConnectModal` | component | Connect wallet modal |
| `ChainSwitcher` | component | Chain switcher component |
| `useCinacoin` | hook | Main wallet hook |
| `useAccount` | hook | Account data hook |
| `useChainId` | hook | Chain ID hook |
| `useConnect` | hook | Connect hook |
| `useDisconnect` | hook | Disconnect hook |
| `useCinacoinContext` | hook | Full context hook |
| `CinacoinConfig` | type | Configuration type |
| `ThemeMode` | type | Theme mode enum |
