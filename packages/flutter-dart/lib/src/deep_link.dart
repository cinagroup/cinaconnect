import 'package:uni_links/uni_links.dart';
import 'package:onux/onux.dart';

/// Manager for handling deep links in Flutter apps.
/// Supports both iOS Universal Links and Android App Links.
class DeepLinkManager {
  static DeepLinkManager? _instance;
  static DeepLinkManager get instance => _instance ??= DeepLinkManager._();

  String? _registeredScheme;
  List<DeepLinkHandler> _handlers = [];

  DeepLinkManager._();

  /// Register a URI scheme (e.g., 'cinacoin://').
  void registerScheme(String scheme) {
    _registeredScheme = scheme;
  }

  /// Open a wallet using deep link.
  /// Returns true if the wallet was opened, false if not available.
  Future<bool> openWallet(String walletId, {String? returnUrl}) async {
    final url = buildWalletUrl(walletId, returnUrl: returnUrl);
    if (url == null) return false;
    // Use url_launcher in real implementation
    // await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    return true;
  }

  /// Build a deep link URL for a specific wallet.
  String? buildWalletUrl(String walletId, {String? returnUrl}) {
    // Wallet-specific deep link patterns
    final walletSchemes = {
      'metamask': 'metamask://',
      'rainbow': 'rainbow://',
      'trust': 'trust://',
      'coinbase': 'cbwallet://',
      'walletconnect': 'wc:',
    };
    final scheme = walletSchemes[walletId];
    if (scheme == null) return null;
    return returnUrl != null ? '$scheme?callback=$returnUrl' : scheme;
  }

  /// Listen for incoming deep links.
  void onLink(Function(String) callback) {
    // In real implementation:
    // uriLinkStream.listen((Uri? uri) {
    //   if (uri != null) callback(uri.toString());
    // });
  }

  /// Initialize deep link handling.
  Future<void> init() async {
    // Get initial link if app was opened from deep link
    // final initialLink = await getInitialLink();
    // if (initialLink != null) {
    //   _handleDeepLink(initialLink.toString());
    // }
    // Listen for links while app is running
    // uriLinkStream.listen(_handleDeepLink);
  }

  void _handleDeepLink(String link) {
    for (final handler in _handlers) {
      if (handler.canHandle(link)) {
        handler.handle(link);
        break;
      }
    }
  }

  /// Register a custom deep link handler.
  void registerHandler(DeepLinkHandler handler) {
    _handlers.add(handler);
  }
}

/// Interface for custom deep link handlers.
abstract class DeepLinkHandler {
  bool canHandle(String link);
  void handle(String link);
}
