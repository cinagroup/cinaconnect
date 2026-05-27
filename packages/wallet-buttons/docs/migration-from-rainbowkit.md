# Migration Guide: RainbowKit → @cinacoin/wallet-buttons

## Overview

RainbowKit wraps wallet connection in a modal. `@cinacoin/wallet-buttons` removes the modal entirely — you render individual wallet buttons directly in your UI. This gives you full control over layout, styling, and user flow.

## Key Differences

| Feature | RainbowKit | @cinacoin/wallet-buttons |
|---|---|---|
| UI pattern | Modal (`ConnectButton`) | Inline buttons (`WalletButton`) |
| Wallet selection | Inside modal | Your own layout |
| Branding | RainbowKit theme | Wallet's own brand colors |
| Custom wallets | Limited | Add any wallet ID |

## Step-by-Step Migration

### 1. Install the new package

```bash
npm install @cinacoin/wallet-buttons @cinacoin/core-sdk @cinacoin/explorer
# or
yarn add @cinacoin/wallet-buttons @cinacoin/core-sdk @cinacoin/explorer
```

You can keep `@rainbow-me/rainbowkit` installed during migration and remove it later.

### 2. Replace `ConnectButton` with inline buttons

**Before (RainbowKit):**

```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';

function Header() {
  return <ConnectButton label="Connect Wallet" />;
}
```

**After:**

```tsx
import { WalletButtonGroup } from '@cinacoin/wallet-buttons';
import '@cinacoin/wallet-buttons/dist/styles.css';

function Header() {
  return <WalletButtonGroup variant="brand" size="sm" />;
}
```

### 3. Replace `connectModal` with direct `onClick`

**Before:**

```tsx
// RainbowKit opens a modal internally
<ConnectButton />
```

**After:**

```tsx
import { useWalletButtons } from '@cinacoin/wallet-buttons';

function MyComponent() {
  const { connect } = useWalletButtons();

  return (
    <WalletButton
      walletId="metamask"
      onClick={(id) => connect(id)}
    />
  );
}
```

### 4. Replace `useConnectModal` hook

**Before:**

```tsx
import { useConnectModal } from '@rainbow-me/rainbowkit';

const { openConnectModal } = useConnectModal();
```

**After:**

```tsx
import { useWalletButtons } from '@cinacoin/wallet-buttons';

const { connect, buttons } = useWalletButtons();

// Show your own button list
buttons.map((b) => (
  <button key={b.walletId} onClick={() => connect(b.walletId)}>
    {b.name}
  </button>
));
```

### 5. Remove RainbowKit provider

**Before:**

```tsx
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';

function App({ children }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>{children}</RainbowKitProvider>
    </WagmiProvider>
  );
}
```

**After:**

```tsx
import { WagmiProvider } from 'wagmi';
import { Connector } from '@cinacoin/core-sdk';

// Create your own connector instance (optional — useWalletButtons works without it)
const connector = new Connector({ projectId: 'your-project-id' });

function App({ children }) {
  return (
    <WagmiProvider config={config}>
      {children}
    </WagmiProvider>
  );
}
```

### 6. Styling

RainbowKit themes → CSS custom properties:

```css
/* Override default styles */
:root {
  --cc-wb-border: #e2e8f0;
  --cc-wb-bg: #ffffff;
  --cc-wb-text: #1e293b;
}

/* Dark mode */
.dark {
  --cc-wb-border: #334155;
  --cc-wb-bg: #1e293b;
  --cc-wb-text: #f1f5f9;
}
```

### 7. Clean up

Remove RainbowKit dependencies:

```bash
npm uninstall @rainbow-me/rainbowkit
```

Remove imports and providers. You're done.

## Quick Reference

| RainbowKit | @cinacoin/wallet-buttons |
|---|---|
| `<ConnectButton />` | `<WalletButton walletId="metamask" />` |
| `openConnectModal()` | `connect(walletId)` |
| `useConnectModal()` | `useWalletButtons()` |
| `RainbowKitProvider` | None needed |
| `theme: 'dark'` | CSS custom properties |
