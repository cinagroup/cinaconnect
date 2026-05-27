# Cinacoin Flutter SDK

Self-hosted wallet connection toolkit for Flutter apps. A complete replacement for Reown/WalletConnect infrastructure.

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  cinacoin:
    git:
      url: https://github.com/hainai/cinacoin.git
      path: packages/flutter-dart
```

Or from pub.dev (when published):

```yaml
dependencies:
  cinacoin: ^0.1.0
```

## Quick Start

```dart
import 'package:cinacoin/cinacoin.dart';

// 1. Initialize
final walletManager = WalletManager(
  projectId: 'YOUR_PROJECT_ID',
  metadata: AppMetadata(
    name: 'My dApp',
    description: 'A Flutter dApp',
    url: 'https://mydapp.com',
  ),
);
await walletManager.init();

// 2. Connect
final result = await walletManager.connect(walletId: 'metamask');

// 3. Sign
final signature = await walletManager.signMessage('Hello, world!');
```

## API Reference

### WalletManager

Main wallet connection manager. Matches `Connector` + `SessionManager` from the core SDK.

```dart
final manager = WalletManager(
  projectId: 'YOUR_PROJECT_ID',
  metadata: AppMetadata(...),
);
await manager.init();
await manager.connect(walletId: 'metamask');
await manager.signMessage('message');
await manager.disconnect();
```

### CinacoinConnectButton

Material Design connect button widget.

```dart
CinacoinConnectButton(
  status: ConnectionStatus.connected,
  account: '0x1234...abcd',
  showAvatar: true,
  showNetwork: true,
  onClick: () => showModal(),
)
```

### CinacoinConnectModal

Bottom sheet modal with wallet list.

```dart
showModalBottomSheet(
  context: context,
  builder: (_) => CinacoinConnectModal(
    wallets: WalletRegistry.getAll(),
    onWalletSelect: (wallet) => connect(wallet.id),
  ),
)
```

### EvmAdapter

EVM chain interactions using web3dart.

```dart
final evm = EvmAdapter(rpcUrl: 'https://eth.llamarpc.com');
final balance = await evm.getBalance('0x...');
final txHash = await evm.sendTransaction(tx);
```

### SolanaChainAdapter

Solana chain interactions.

```dart
final solana = SolanaChainAdapter();
final balance = await solana.getBalance('7EcD...');
```

### SIWE Authentication

Sign-In with Ethereum (EIP-4361).

```dart
final message = generateSIWEMessage(SIWEParams(
  domain: 'myapp.com',
  address: '0x...',
  uri: 'https://myapp.com',
  chainId: 1,
  nonce: generateNonce(),
  issuedAt: generateISOTimestamp(),
));
```

### DeepLinkHandler

Deep link + Universal Links handler.

```dart
final handler = DeepLinkHandler();
await handler.openDeepLink(DeepLinkParams(
  walletId: 'metamask',
  uri: wcUri,
));
```

## Supported Wallets (16+)

| Wallet | iOS | Android | Chains |
|--------|-----|---------|--------|
| MetaMask | ✅ | ✅ | EVM |
| Rainbow | ✅ | ✅ | EVM |
| Coinbase Wallet | ✅ | ✅ | EVM |
| Trust Wallet | ✅ | ✅ | EVM |
| Phantom | ✅ | ✅ | Solana + EVM |
| Zerion | ✅ | ✅ | EVM |
| Rabby | ✅ | ✅ | EVM |
| Safe{Wallet} | ✅ | ✅ | EVM |
| Ledger Live | ✅ | ✅ | Multi |
| Exodus | ✅ | ✅ | Multi |
| TokenPocket | ✅ | ✅ | EVM |
| imToken | ✅ | ✅ | EVM |
| OKX Wallet | ✅ | ✅ | Multi |
| Bitget Wallet | ✅ | ✅ | Multi |
| Uniswap Wallet | ✅ | ✅ | EVM |
| WalletConnect | ✅ | ✅ | Multi |

## Architecture

This SDK mirrors the TypeScript `core-sdk` API surface:

| Flutter SDK | TypeScript core-sdk |
|-------------|---------------------|
| `WalletManager` | `Connector` + `SessionManager` |
| `EvmAdapter` | `EvmAdapter` |
| `SolanaChainAdapter` | `SolanaChainAdapter` |
| `generateSIWEMessage` | `generateMessage` |
| `DeepLinkHandler` | `links` module |
| `WalletRegistry` | `WALLET_DEEP_LINKS` |

## License

MIT
