/// Registry of supported wallets with deep link configurations.
///
/// Mirrors the WALLET_DEEP_LINKS registry from the core SDK.
import 'types.dart';

/// Built-in wallet deep link configurations.
class WalletRegistry {
  static const Map<String, WalletInfo> wallets = {
    'metamask': WalletInfo(
      id: 'metamask',
      name: 'MetaMask',
      iconUrl: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
      deepLinkScheme: 'metamask://',
      universalLinkDomain: 'metamask.app.link',
      appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10'],
    ),
    'walletconnect': WalletInfo(
      id: 'walletconnect',
      name: 'WalletConnect',
      iconUrl: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg',
      deepLinkScheme: 'wc://',
      universalLinkDomain: 'walletconnect.com',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    ),
    'rainbow': WalletInfo(
      id: 'rainbow',
      name: 'Rainbow',
      iconUrl: 'https://raw.githubusercontent.com/rainbow-me/assets/master/images/rainbow-logo.png',
      deepLinkScheme: 'rainbow://',
      universalLinkDomain: 'rnbwapp.com',
      appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10'],
    ),
    'coinbase': WalletInfo(
      id: 'coinbase',
      name: 'Coinbase Wallet',
      iconUrl: 'https://www.coinbase.com/img/favicon/favicon-32x32.png',
      deepLinkScheme: 'cbwallet://',
      universalLinkDomain: 'go.cb-w.com',
      appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10'],
    ),
    'trust': WalletInfo(
      id: 'trust',
      name: 'Trust Wallet',
      iconUrl: 'https://trustwallet.com/assets/images/favicon.ico',
      deepLinkScheme: 'trust://',
      universalLinkDomain: 'link.trustwallet.com',
      appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:56', 'eip155:42161'],
    ),
    'phantom': WalletInfo(
      id: 'phantom',
      name: 'Phantom',
      iconUrl: 'https://phantom.app/favicon.ico',
      deepLinkScheme: 'phantom://',
      universalLinkDomain: 'phantom.app',
      appStoreUrl: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=app.phantom',
      supportedChains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'eip155:1', 'eip155:137'],
    ),
    'zerion': WalletInfo(
      id: 'zerion',
      name: 'Zerion',
      iconUrl: 'https://zerion.io/favicon.ico',
      deepLinkScheme: 'zerion://',
      universalLinkDomain: 'links.zerion.io',
      appStoreUrl: 'https://apps.apple.com/app/zerion-crypto-web3-wallet/id1456732032',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=io.zerion.android',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:42161'],
    ),
    'rabby': WalletInfo(
      id: 'rabby',
      name: 'Rabby',
      iconUrl: 'https://rabby.io/favicon.ico',
      deepLinkScheme: 'rabby://',
      universalLinkDomain: 'rabby.io',
      appStoreUrl: 'https://apps.apple.com/app/rabby-wallet/id1631750692',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=io.rabby.wallet',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10'],
    ),
    'safe': WalletInfo(
      id: 'safe',
      name: 'Safe{Wallet}',
      iconUrl: 'https://safe.global/favicon.ico',
      deepLinkScheme: 'safe://',
      universalLinkDomain: 'safe.global',
      appStoreUrl: 'https://apps.apple.com/app/safe-wallet/id1572832312',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=io.gnosis.safe',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10'],
    ),
    'ledger': WalletInfo(
      id: 'ledger',
      name: 'Ledger Live',
      iconUrl: 'https://www.ledger.com/favicon.ico',
      deepLinkScheme: 'ledgerlive://',
      universalLinkDomain: 'ledgerlive.com',
      appStoreUrl: 'https://apps.apple.com/app/ledger-live/id1361671700',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ledger.live',
      supportedChains: ['eip155:1', 'eip155:137', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    ),
    'exodus': WalletInfo(
      id: 'exodus',
      name: 'Exodus',
      iconUrl: 'https://www.exodus.com/favicon.ico',
      deepLinkScheme: 'exodus://',
      universalLinkDomain: 'exodus.com',
      appStoreUrl: 'https://apps.apple.com/app/exodus-crypto-wallet/id1424287736',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=exodusmovement.exodus',
      supportedChains: ['eip155:1', 'eip155:137', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    ),
    'tokenpocket': WalletInfo(
      id: 'tokenpocket',
      name: 'TokenPocket',
      iconUrl: 'https://www.tokenpocket.pro/favicon.ico',
      deepLinkScheme: 'tpoutside://',
      universalLinkDomain: 'tokenpocket.pro',
      appStoreUrl: 'https://apps.apple.com/app/tokenpocket/id1376157709',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:56'],
    ),
    'imtoken': WalletInfo(
      id: 'imtoken',
      name: 'imToken',
      iconUrl: 'https://token.im/favicon.ico',
      deepLinkScheme: 'imtokenv2://',
      universalLinkDomain: 'token.im',
      appStoreUrl: 'https://apps.apple.com/app/imtoken/id1376157709',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=im.token.app',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:56'],
    ),
    'okx': WalletInfo(
      id: 'okx',
      name: 'OKX Wallet',
      iconUrl: 'https://www.okx.com/favicon.ico',
      deepLinkScheme: 'okx://',
      universalLinkDomain: 'okx.com',
      appStoreUrl: 'https://apps.apple.com/app/okx/id1234567890',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.okinc.okex',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:56', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    ),
    'bitget': WalletInfo(
      id: 'bitget',
      name: 'Bitget Wallet',
      iconUrl: 'https://www.bitget.com/favicon.ico',
      deepLinkScheme: 'bitkeep://',
      universalLinkDomain: 'bitget.com',
      appStoreUrl: 'https://apps.apple.com/app/bitget-wallet/id1390626923',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.bitkeep.wallet',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:56', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    ),
    'uniswap': WalletInfo(
      id: 'uniswap',
      name: 'Uniswap Wallet',
      iconUrl: 'https://uniswap.org/favicon.ico',
      deepLinkScheme: 'uniswap://',
      universalLinkDomain: 'uniswap.org',
      appStoreUrl: 'https://apps.apple.com/app/uniswap-wallet/id6443870843',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.uniswap.wallet',
      supportedChains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10'],
    ),
  };

  /// Get a wallet by ID.
  static WalletInfo? get(String walletId) => wallets[walletId];

  /// Get all registered wallets.
  static List<WalletInfo> getAll() => wallets.values.toList();

  /// Get wallets that support a specific chain.
  static List<WalletInfo> getForChain(String chainId) {
    return wallets.values
        .where((w) => w.supportedChains.contains(chainId))
        .toList();
  }

  /// Register a custom wallet at runtime.
  static void register(WalletInfo wallet) {
    wallets[wallet.id] = wallet;
  }

  /// Check if a wallet is registered.
  static bool has(String walletId) => wallets.containsKey(walletId);
}
