# Migration Guide

> Migrate from Reown/WalletConnect to CinaConnect.

## Why Migrate?

| Reown/WalletConnect | CinaConnect |
|---|---|
| $500-5,000/month license | Free, open source (MIT) |
| MAU limits | Unlimited |
| Branding required | Fully white-label |
| Hosted relay | Self-hosted, 99.95% SLA |
| Vendor lock-in | Full control |

## Quick Migration

### 1. Install CinaConnect

```bash
npm install @cinaconnect/core-sdk @cinaconnect/react
```

### 2. Use Codemod

```bash
npx @cinaconnect/codemod reown-to-cinaconnect
```

### 3. Update Configuration

Replace your `@reown/appkit` or `@walletconnect` configuration with CinaConnect's `CinaConnectProvider`.

### 4. Test

Verify wallet connections, chain switching, and signing work as expected.

## Detailed Migration Guides

- Migrate from ConnectKit (coming soon)
- Migrate from RainbowKit (coming soon)

## Related

- [Codemod API](/api/codemod)
