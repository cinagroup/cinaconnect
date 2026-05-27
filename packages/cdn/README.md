# @cinacoin/cdn

CDN bundle for Cinacoin — use ConnectButton and ConnectModal via `<script>` tag. No build tools required.

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <title>My dApp</title>
</head>
<body>
  <div id="connect-button"></div>
  <div id="connect-modal"></div>

  <!-- Configure before loading -->
  <script>
    window.Cinacoin = {
      projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
      theme: 'dark',
      primaryColor: '#6366F1',
      chains: [1, 10, 137],
    };
  </script>

  <!-- Load CDN bundle -->
  <script src="https://cdn.cinacoin.dev/connect.js"></script>

  <!-- Render components -->
  <script>
    // Render a ConnectButton
    Cinacoin.renderConnectButton('#connect-button', {
      size: 'lg',
      label: 'Connect',
      onConnect: (address) => console.log('Connected:', address),
      onDisconnect: () => console.log('Disconnected'),
    });

    // Render a ConnectModal
    Cinacoin.renderConnectModal('#connect-modal', {
      wallets: [
        { id: 'metamask', name: 'MetaMask', installed: true },
        { id: 'walletconnect', name: 'WalletConnect' },
      ],
      onConnect: (address) => console.log('Connected:', address),
    });

    // Control modal programmatically
    Cinacoin.showModal();
    Cinacoin.hideModal();
    Cinacoin.toggleModal();
  </script>
</body>
</html>
```

## Configuration

Set `window.Cinacoin` before loading the script:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectId` | `string` | — | WalletConnect Project ID (required) |
| `theme` | `'light' \| 'dark'` | `'light'` | Theme mode |
| `primaryColor` | `string` | `'#6366F1'` | Custom primary color |
| `chains` | `number[]` | `[1]` | Supported chain IDs |
| `metadata` | `object` | — | dApp metadata (name, description, url, icons) |

## API Reference

### ConnectButton

```ts
Cinacoin.renderConnectButton(selector: string, options?: ConnectButtonOptions): void
```

Options:
- `projectId` — WalletConnect Project ID
- `theme` — `'light' | 'dark'`
- `primaryColor` — Custom color
- `size` — `'sm' | 'md' | 'lg'`
- `variant` — `'primary' | 'outline'`
- `label` — Custom button text
- `onConnect(address)` — Callback on connect
- `onDisconnect()` — Callback on disconnect

### ConnectModal

```ts
Cinacoin.renderConnectModal(selector: string, options?: ConnectModalOptions): void
```

Options:
- `projectId` — WalletConnect Project ID
- `theme` — `'light' | 'dark'`
- `primaryColor` — Custom color
- `defaultView` — `'connect' | 'connecting' | 'connected' | 'networks'`
- `wallets` — Array of wallet definitions
- `chains` — Supported chain IDs
- `onConnect(address)` — Callback on connect
- `onClose()` — Callback on close

### Modal Controls

```ts
Cinacoin.showModal(): void
Cinacoin.hideModal(): void
Cinacoin.toggleModal(): void
Cinacoin.getModalView(): string
```

### State

```ts
Cinacoin.getButtonState(): string        // 'disconnected' | 'connecting' | 'connected'
Cinacoin.getButtonAddress(): string|null // Connected wallet address
Cinacoin.disconnect(): void              // Disconnect wallet
```

### Module Loader (Advanced)

For lazy-loading additional Cinacoin modules:

```ts
Cinacoin.loadModule('pay-ui', () => import('/pay-ui.js'))
Cinacoin.isLoaded('pay-ui')
Cinacoin.getModule('pay-ui')
Cinacoin.clearCache()
```

## CDN URLs

| File | Format | Description |
|------|--------|-------------|
| `connect.js` | IIFE | Browser-ready bundle |
| `connect.mjs` | ESM | ES module bundle |

## License

MIT
