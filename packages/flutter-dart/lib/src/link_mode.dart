import 'package:url_launcher/url_launcher.dart';
import 'package:app_links/app_links.dart';
import 'package:onux/onux.dart';

/// Link mode integration for Flutter apps.
/// Enables connecting to native wallets via deep links and universal links
/// with real WC URI embedding, fallback chains, and return-flow handling.
///
/// ## Link Mode Flow
/// 1. Build a WC v2 pairing URI
/// 2. Embed the URI in a wallet-specific deep link
/// 3. Try deep link first → timeout → fallback to universal link → app store
/// 4. Listen for return link when user comes back from the wallet
///
/// ## Deep Link vs Universal Link
/// - **Deep Link**: Custom URI scheme (e.g., `metamask://wc?uri=...`)
///   - Works when the wallet app is installed
///   - Fastest, most direct path
/// - **Universal Link / App Link**: HTTPS URL (e.g., `https://metamask.app.link/wc?uri=...`)
///   - Fallback when deep link fails
///   - Shows a web interstitial before opening the app
///   - Works on both iOS (Universal Links) and Android (App Links)
class LinkModeManager {
  static LinkModeManager? _instance;
  static LinkModeManager get instance => _instance ??= LinkModeManager._();

  bool _initialized = false;
  final _appLinks = AppLinks();
  Function(String? walletId, Uri? result)? _onWalletReturnCallback;
  Function(String uri)? _onWcUriReceivedCallback;

  LinkModeManager._();

  /// Initialize link mode with real app_links stream.
  /// Sets up listeners for both initial deep links and ongoing link events.
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    // Handle the initial deep link if the app was opened from a wallet return
    _appLinks.getInitialLink().then((uri) {
      if (uri != null) _handleIncomingLink(uri);
    });

    // Listen for incoming deep links while app is running
    _appLinks.uriLinkStream.listen(
      _handleIncomingLink,
      onError: (err) {
        // Log but don't crash on stream errors
        print('[LinkMode] Stream error: $err');
      },
    );
  }

  /// Connect to a wallet using deep link mode with full fallback chain.
  ///
  /// 1. Builds a WC v2 pairing URI
  /// 2. Tries deep link (custom scheme)
  /// 3. Falls back to universal link (HTTPS)
  /// 4. Falls back to app store URL
  ///
  /// Returns true if any launch method succeeded.
  Future<bool> connectWithLink(
    String walletId, {
    String? wcUri,
    String? namespace,
    int deepLinkTimeoutMs = 1500,
  }) async {
    if (!_initialized) await init();

    // Step 1: Try deep link (custom URI scheme)
    final deepLinkUrl = buildDeepLinkUrl(walletId, wcUri: wcUri, namespace: namespace);
    if (deepLinkUrl != null) {
      final deepLinkUri = Uri.parse(deepLinkUrl);
      if (await canLaunchUrl(deepLinkUri)) {
        await launchUrl(deepLinkUri, mode: LaunchMode.externalApplication);
        return true;
      }
    }

    // Step 2: Fallback to universal link (HTTPS)
    final universalUrl = buildUniversalLinkUrl(walletId, wcUri: wcUri, namespace: namespace);
    if (universalUrl != null) {
      final universalUri = Uri.parse(universalUrl);
      if (await canLaunchUrl(universalUri)) {
        await launchUrl(universalUri, mode: LaunchMode.externalApplication);
        return true;
      }
    }

    // Step 3: Fallback to app store
    final storeUrl = _getAppStoreUrl(walletId);
    if (storeUrl != null) {
      final storeUri = Uri.parse(storeUrl);
      if (await canLaunchUrl(storeUri)) {
        await launchUrl(storeUri, mode: LaunchMode.externalApplication);
        return true;
      }
    }

    return false;
  }

  /// Build a deep link URL embedding the WC v2 URI.
  ///
  /// Uses wallet-specific custom URI schemes with the WC URI
  /// embedded as a query parameter.
  ///
  /// Examples:
  /// - MetaMask: `metamask://wc?uri=wc%3Atopic%402%3F...`
  /// - Rainbow: `rainbow://wc?uri=wc%3Atopic%402%3F...`
  /// - Coinbase: `cbwallet://wc?uri=wc%3Atopic%402%3F...`
  ///
  /// The callback parameter tells the wallet where to return.
  String? buildDeepLinkUrl(String walletId, {String? wcUri, String? namespace}) {
    final walletConfig = _walletConfigs[walletId];
    if (walletConfig == null) return null;

    final scheme = walletConfig['scheme']!;

    // If no WC URI provided, just return the base scheme
    if (wcUri == null || wcUri.isEmpty) {
      return scheme;
    }

    final callback = namespace != null
        ? 'cinacoin://return?wallet=${Uri.encodeComponent(walletId)}&namespace=$namespace'
        : 'cinacoin://return?wallet=${Uri.encodeComponent(walletId)}';

    // Embed the WC URI in the wallet's deep link
    final encodedUri = Uri.encodeComponent(wcUri);
    return '$scheme/wc?uri=$encodedUri&callback=$callback';
  }

  /// Build a universal link URL (HTTPS) as fallback.
  ///
  /// Universal links work on both iOS and Android:
  /// - iOS: Apple Universal Links (apple-app-site-association)
  /// - Android: App Links (assetlinks.json)
  ///
  /// Examples:
  /// - MetaMask: `https://metamask.app.link/wc?uri=wc%3Atopic%402%3F...`
  /// - Rainbow: `https://rnbw.app.link/wc?uri=wc%3Atopic%402%3F...`
  /// - Coinbase: `https://go.cb-w.com/wc?uri=wc%3Atopic%402%3F...`
  String? buildUniversalLinkUrl(String walletId, {String? wcUri, String? namespace}) {
    final walletConfig = _walletConfigs[walletId];
    if (walletConfig == null) return null;

    final universalDomain = walletConfig['universal_domain'];
    if (universalDomain == null) return null;

    // If no WC URI provided, return the base domain
    if (wcUri == null || wcUri.isEmpty) {
      return 'https://$universalDomain';
    }

    final callback = namespace != null
        ? 'cinacoin://return?wallet=${Uri.encodeComponent(walletId)}&namespace=$namespace'
        : 'cinacoin://return?wallet=${Uri.encodeComponent(walletId)}';

    final encodedUri = Uri.encodeComponent(wcUri);
    return 'https://$universalDomain/wc?uri=$encodedUri&callback=$callback';
  }

  /// Check if a specific wallet is installed.
  ///
  /// Tries the deep link URL first. If it can't be launched,
  /// the wallet is likely not installed.
  Future<bool> isWalletInstalled(String walletId) async {
    // Try deep link
    final deepLinkUrl = buildDeepLinkUrl(walletId);
    if (deepLinkUrl != null) {
      try {
        return await canLaunchUrl(Uri.parse(deepLinkUrl));
      } catch (e) {
        // Fall through to universal link check
      }
    }

    // Try universal link (may work even if app is not installed,
    // since it falls back to a web page)
    final universalUrl = buildUniversalLinkUrl(walletId);
    if (universalUrl != null) {
      try {
        return await canLaunchUrl(Uri.parse(universalUrl));
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  /// Get the app store URL for a wallet.
  /// Returns a URL to the App Store (iOS) or Play Store (Android).
  String? _getAppStoreUrl(String walletId) {
    final walletConfig = _walletConfigs[walletId];
    if (walletConfig == null) return null;

    // Return platform-appropriate store URL
    // In production, use dart:io Platform to detect iOS vs Android
    return walletConfig['play_store'] ?? walletConfig['app_store'];
  }

  /// Register callback for when user returns from wallet app.
  ///
  /// Called when the wallet redirects back to our app via deep link.
  /// The result URI may contain wallet-specific data (session info,
  /// approval status, etc.).
  void onWalletReturn(Function(String? walletId, Uri? result) callback) {
    _onWalletReturnCallback = callback;
  }

  /// Register callback for when a WC v2 URI is received via deep link.
  ///
  /// Called when another app sends us a WC URI (e.g., a wallet initiating
  /// a connection).
  void onWcUriReceived(Function(String uri) callback) {
    _onWcUriReceivedCallback = callback;
  }

  /// Handle incoming deep links.
  ///
  /// Routes the link to the appropriate handler:
  /// - `cinacoin://return` → wallet return callback
  /// - `wc:...` → WC URI received callback
  void _handleIncomingLink(Uri uri) {
    if (uri.scheme == 'cinacoin' && uri.host == 'return') {
      final walletId = uri.queryParameters['wallet'];
      _onWalletReturnCallback?.call(walletId, uri);
    } else if (uri.scheme == 'wc' || uri.toString().startsWith('wc:')) {
      _onWcUriReceivedCallback?.call(uri.toString());
    }
  }

  /// Get all registered wallet IDs that support link mode.
  List<String> getSupportedWallets() => _walletConfigs.keys.toList();

  /// Register a new wallet for link mode.
  void registerWallet(
    String walletId, {
    required String scheme,
    String? universalDomain,
    String? appStoreUrl,
    String? playStoreUrl,
  }) {
    _walletConfigs[walletId] = {
      'scheme': scheme,
      if (universalDomain != null) 'universal_domain': universalDomain,
      if (appStoreUrl != null) 'app_store': appStoreUrl,
      if (playStoreUrl != null) 'play_store': playStoreUrl,
    };
  }

  /// Dispose resources.
  void dispose() {
    _initialized = false;
    _onWalletReturnCallback = null;
    _onWcUriReceivedCallback = null;
  }
}

// ─── Wallet Configuration ────────────────────────────────────────────────

/// Known wallet deep link configurations.
///
/// Each wallet defines:
/// - `scheme`: Custom URI scheme for deep linking
/// - `universal_domain`: HTTPS domain for universal link fallback
/// - `app_store`: iOS App Store URL
/// - `play_store`: Android Play Store URL
final Map<String, Map<String, String>> _walletConfigs = {
  'metamask': {
    'scheme': 'metamask://',
    'universal_domain': 'metamask.app.link',
    'app_store': 'https://apps.apple.com/app/metamask/id1438712428',
    'play_store': 'https://play.google.com/store/apps/details?id=io.metamask',
  },
  'rainbow': {
    'scheme': 'rainbow://',
    'universal_domain': 'rnbwapp.com',
    'app_store': 'https://apps.apple.com/app/rainbow/id1457119021',
    'play_store': 'https://play.google.com/store/apps/details?id=me.rainbow',
  },
  'trust': {
    'scheme': 'trust://',
    'universal_domain': 'link.trustwallet.com',
    'app_store': 'https://apps.apple.com/app/trust-crypto-wallet/id1288339409',
    'play_store': 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
  },
  'coinbase': {
    'scheme': 'cbwallet://',
    'universal_domain': 'go.cb-w.com',
    'app_store': 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    'play_store': 'https://play.google.com/store/apps/details?id=org.toshi',
  },
  'phantom': {
    'scheme': 'phantom://',
    'universal_domain': 'phantom.app',
    'app_store': 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
    'play_store': 'https://play.google.com/store/apps/details?id=com.phantom.app',
  },
  'solflare': {
    'scheme': 'solflare://',
    'universal_domain': 'solflare.com',
    'app_store': 'https://apps.apple.com/app/solflare/id1580778734',
    'play_store': 'https://play.google.com/store/apps/details?id=com.solflarewallet.solflare',
  },
  'walletconnect': {
    'scheme': 'wc:',
  },
};
