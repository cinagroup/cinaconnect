# Migration Guide: Privy → @cinacoin/wallet-buttons

## Overview

Privy is a full-stack authentication + wallet infrastructure that provides a pre-built login modal with email, social, and wallet options. `@cinacoin/wallet-buttons` focuses specifically on direct wallet connection UI — individual wallet buttons you control completely.

> **Note:** If you rely on Privy's email/social login, embedded wallets, or backend user management, those features are outside the scope of `@cinacoin/wallet-buttons`. This guide covers the **wallet connection UI** portion only.

## Key Differences

| Feature | Privy | @cinacoin/wallet-buttons |
|---|---|---|
| Scope | Full auth (email, social, wallet) | Wallet buttons only |
| UI pattern | `<LoginButton />` modal | Inline `<WalletButton />` |
| Embedded wallets | Built-in | Not included |
| Backend | User management API | None — UI only |
| Customization | Theme config | Full CSS control |

## Step-by-Step Migration

### 1. Install

```bash
npm install @cinacoin/wallet-buttons @cinacoin/core-sdk @cinacoin/explorer
```

Keep `@privy-io/react-auth` installed during migration.

### 2. Replace `<LoginButton />`

**Before:**

```tsx
import { LoginButton } from '@privy-io/react-auth';

function Header() {
  return <LoginButton text="Connect Wallet" />;
}
```

**After:**

```tsx
import { WalletButtonGroup } from '@cinacoin/wallet-buttons';
import '@cinacoin/wallet-buttons/dist/styles.css';

function Header() {
  return (
    <WalletButtonGroup
      walletIds={['metamask', 'walletconnect', 'coinbase', 'rainbow']}
      variant="brand"
      size="sm"
    />
  );
}
```

### 3. Replace `usePrivy()` connection logic

**Before:**

```tsx
import { usePrivy } from '@privy-io/react-auth';

const { login, ready, authenticated } = usePrivy();

if (!authenticated) {
  return <button onClick={login}>Login</button>;
}
```

**After:**

```tsx
import { useWalletButtons } from '@cinacoin/wallet-buttons';

const { connect, isConnected } = useWalletButtons();

return (
  <WalletButton
    walletId="metamask"
    onClick={(id) => connect(id)}
    isLoading={/* your loading state */}
  />
);
```

### 4. Custom wallet selection UI

**Before (Privy — modal-driven):**

```tsx
// Privy opens a modal with wallet options
<LoginButton />
```

**After — full control:**

```tsx
import { useWalletButtons, WalletButton } from '@cinacoin/wallet-buttons';

const { buttons, connect } = useWalletButtons();

return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {buttons.map((wallet) => (
      <WalletButton
        key={wallet.walletId}
        walletId={wallet.walletId}
        variant="default"
        size="md"
        onClick={() => connect(wallet.walletId)}
      />
    ))}
  </div>
);
```

### 5. Embedded wallet migration

Privy's embedded (smart contract / MPC) wallets are **not** a feature of `@cinacoin/wallet-buttons`. If you use embedded wallets:

- Continue using `@privy-io/react-auth` for embedded wallet functionality
- Use `@cinacoin/wallet-buttons` for the **external wallet button UI**
- Both packages can coexist in the same app

```tsx
import { LoginButton, usePrivy } from '@privy-io/react-auth';
import { WalletButton, WalletButtonGroup } from '@cinacoin/wallet-buttons';

function HybridAuth() {
  const { login: privyLogin } = usePrivy();

  return (
    <div>
      {/* Privy handles email, social, embedded */}
      <LoginButton text="Email / Social Login" />

      {/* Cinacoin handles external wallet buttons */}
      <h3>Or connect a wallet</h3>
      <WalletButtonGroup variant="minimal" />
    </div>
  );
}
```

### 6. Remove Privy (wallet UI only)

If you're replacing Privy entirely (and don't need email/social/embedded):

```bash
npm uninstall @privy-io/react-auth
```

Remove `<PrivyProvider>`, `<LoginButton>`, and `usePrivy()` calls.

### 7. Styling

Privy theme config → CSS custom properties:

```css
:root {
  --cc-wb-border: #e2e8f0;
  --cc-wb-bg: #ffffff;
  --cc-wb-text: #1e293b;
}
```

## Quick Reference

| Privy | @cinacoin/wallet-buttons |
|---|---|
| `<LoginButton />` | `<WalletButton walletId="metamask" />` |
| `<PrivyProvider>` | None needed |
| `usePrivy().login()` | `connect(walletId)` |
| `authenticated` | `isConnected(walletId)` |
| `appearance.logoUrl` | CSS custom properties |
| Embedded wallets | Keep `@privy-io/react-auth` or use alternative |
