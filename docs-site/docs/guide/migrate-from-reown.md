# Migration Guide

> Migrate from Reown/WalletConnect to Cinacoin.

## Why Migrate?

| Reown/WalletConnect | Cinacoin |
|---|---|
| $500-5,000/month license | Free, open source (MIT) |
| MAU limits | Unlimited |
| Branding required | Fully white-label |
| Hosted relay | Self-hosted, 99.95% SLA |
| Vendor lock-in | Full control |

## Quick Migration

### 1. Install Cinacoin

```bash
npm install @cinacoin/core-sdk @cinacoin/react
```

### 2. Use Codemod

```bash
npx @cinacoin/codemod reown-to-cinacoin
```

### 3. Update Configuration

Replace your `@reown/appkit` or `@walletconnect` configuration with Cinacoin's `CinacoinProvider`.

### 4. Test

Verify wallet connections, chain switching, and signing work as expected.

## Detailed Migration Guides

- Migrate from ConnectKit (coming soon)
- Migrate from RainbowKit (coming soon)

## Related

- [Codemod API](/api/codemod)
