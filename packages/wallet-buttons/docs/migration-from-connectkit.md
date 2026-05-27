# Migration Guide: ConnectKit → @cinacoin/wallet-buttons

## Overview

ConnectKit (by Family) provides a pre-built connect modal and a `<ConnectKitButton />` component. `@cinacoin/wallet-buttons` takes a different approach: individual wallet buttons you compose directly in your UI, giving you full layout control without a modal wrapper.

## Key Differences

| Feature | ConnectKit | @cinacoin/wallet-buttons |
|---|---|---|
| UI pattern | Modal via `<ConnectKitButton />` | Inline buttons (`<WalletButton />`) |
| Theme system | `ConnectKitProvider theme="..."` | CSS custom properties |
| Wallet list | Configured in provider | Pass `walletIds` to `<WalletButtonGroup />` |
| Connection logic | Built-in modal flow | `useWalletButtons().connect(id)` |

## Step-by-Step Migration

### 1. Install

```bash
npm install @cinacoin/wallet-buttons @cinacoin/core-sdk @cinacoin/explorer
```

### 2. Replace `<ConnectKitButton />`

**Before:**

```tsx
import { ConnectKitButton } from 'connectkit';

function Header() {
  return <ConnectKitButton.Custom>
    {({ isConnected, isConnecting, show, address }) => (
      <button onClick={show}>
        {isConnected ? address : 'Connect Wallet'}
      </button>
    )}
  </ConnectKitButton.Custom>;
}
```

**After:**

```tsx
import { WalletButton, useWalletButtons } from '@cinacoin/wallet-buttons';
import '@cinacoin/wallet-buttons/dist/styles.css';

function Header() {
  const { connect, isConnected } = useWalletButtons();
  const connected = isConnected('metamask');

  if (connected) {
    return <WalletButton walletId="metamask" variant="brand" />;
  }

  return (
    <WalletButton
      walletId="metamask"
      variant="brand"
      onClick={() => connect('metamask')}
    />
  );
}
```

### 3. Replace `<ConnectKitProvider />`

**Before:**

```tsx
import { ConnectKitProvider } from 'connectkit';
import { WagmiProvider } from 'wagmi';

function App({ children }) {
  return (
    <WagmiProvider config={config}>
      <ConnectKitProvider theme="auto">{children}</ConnectKitProvider>
    </WagmiProvider>
  );
}
```

**After:**

```tsx
import { WagmiProvider } from 'wagmi';
// No provider needed for wallet-buttons

function App({ children }) {
  return (
    <WagmiProvider config={config}>
      {children}
    </WagmiProvider>
  );
}
```

### 4. Replace `useConnectKit` hook

**Before:**

```tsx
import { useConnectKit } from 'connectkit';

const { setOpen, setChain, chain } = useConnectKit();
```

**After:**

```tsx
import { useWalletButtons } from '@cinacoin/wallet-buttons';

const { connect, isConnected } = useWalletButtons();

// Show wallet list — render your own UI
const handleClick = (id: string) => connect(id);
```

### 5. Custom wallet list

**Before (ConnectKit — limited to supported wallets):**

```tsx
// ConnectKit uses its built-in wallet list
```

**After — fully configurable:**

```tsx
import { WalletButtonGroup } from '@cinacoin/wallet-buttons';

<WalletButtonGroup
  walletIds={['metamask', 'coinbase', 'phantom', 'rainbow']}
  layout="grid"
  columns={2}
  variant="default"
  size="md"
/>
```

### 6. Styling

ConnectKit themes → CSS custom properties:

```css
/* Light */
:root {
  --ck-border-radius: 12px;       →  --cc-wb-border: #e2e8f0;
  --ck-body-background: #ffffff;  →  --cc-wb-bg: #ffffff;
  --ck-body-color: #000000;       →  --cc-wb-text: #1e293b;
}

/* Dark */
.dark {
  --cc-wb-bg: #1e293b;
  --cc-wb-text: #f1f5f9;
}
```

### 7. Remove ConnectKit

```bash
npm uninstall connectkit
```

Remove `ConnectKitProvider`, `ConnectKitButton`, and any `useConnectKit` calls.

## Quick Reference

| ConnectKit | @cinacoin/wallet-buttons |
|---|---|
| `<ConnectKitButton />` | `<WalletButton walletId="metamask" />` |
| `<ConnectKitProvider>` | None needed |
| `useConnectKit()` | `useWalletButtons()` |
| `setOpen(true)` | Render your own button list |
| `theme="dark"` | CSS custom properties |
| `customWallets` | Any `walletId` in `walletIds` array |
