import 'package:onux/onux.dart';
import 'package:onux/src/deep_link.dart';

/// Link mode integration for Flutter apps.
/// Enables connecting to native wallets via deep links.
class LinkModeManager {
  static LinkModeManager? _instance;
  static LinkModeManager get instance => _instance ??= LinkModeManager._();

  bool _initialized = false;
  Function()? _onWalletReturnCallback;

  LinkModeManager._();

  /// Initialize link mode.
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    DeepLinkManager.instance.registerScheme('cinaconnect');
    await DeepLinkManager.instance.init();

    DeepLinkManager.instance.onLink(_handleIncomingLink);
  }

  /// Connect to a wallet using deep link mode.
  /// Returns true if deep link was initiated.
  Future<bool> connectWithLink(String walletId, String namespace) async {
    if (!_initialized) await init();

    final canOpen = await DeepLinkManager.instance.openWallet(
      walletId,
      returnUrl: 'cinaconnect://return?namespace=$namespace',
    );
    return canOpen;
  }

  /// Set callback for when user returns from wallet.
  void onWalletReturn(Function() callback) {
    _onWalletReturnCallback = callback;
  }

  void _handleIncomingLink(String link) {
    if (link.startsWith('cinaconnect://return')) {
      _onWalletReturnCallback?.call();
    }
  }

  /// Check if a specific wallet is installed.
  Future<bool> isWalletInstalled(String walletId) async {
    try {
      final url = DeepLinkManager.instance.buildWalletUrl(walletId);
      if (url == null) return false;
      // In real implementation, use canLaunchUrl from url_launcher
      // return await canLaunchUrl(Uri.parse(url));
      return false; // placeholder
    } catch (e) {
      return false;
    }
  }
}
