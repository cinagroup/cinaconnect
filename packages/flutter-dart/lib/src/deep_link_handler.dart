/// Deep link + App Links + Universal Links handler for Flutter.
///
/// Mirrors the core-sdk links module functionality.
import 'package:app_links/app_links.dart';
import 'package:url_launcher/url_launcher.dart';
import 'types.dart';
import 'wallet_registry.dart';

/// Platform detection for redirect decisions.
enum DeepLinkPlatform {
  ios,
  android,
  web,
}

/// Parameters for generating a deep link.
class DeepLinkParams {
  final String walletId;
  final String uri;
  final Map<String, String>? queryParams;
  final int fallbackTimeoutMs;

  const DeepLinkParams({
    required this.walletId,
    required this.uri,
    this.queryParams,
    this.fallbackTimeoutMs = 1500,
  });
}

/// Result of a redirect attempt.
class RedirectResult {
  final bool success;
  final String method; // 'deep-link' | 'universal-link' | 'app-store' | 'qr-code'
  final String url;
  final bool fallbackUsed;
  final String? error;

  const RedirectResult({
    required this.success,
    required this.method,
    required this.url,
    this.fallbackUsed = false,
    this.error,
  });
}

/// Deep link handler for wallet connections.
class DeepLinkHandler {
  final AppLinks _appLinks;
  DeepLinkPlatform? _platform;

  DeepLinkHandler({AppLinks? appLinks})
      : _appLinks = appLinks ?? AppLinks();

  /// Detect the current platform.
  static Future<DeepLinkPlatform> detectPlatform() async {
    // In Flutter, we need platform-specific detection.
    // For now, return Android by default; the platform plugin
    // would typically be used for actual detection.
    return DeepLinkPlatform.android;
  }

  /// Set the target platform for redirect handling.
  void setPlatform(DeepLinkPlatform platform) {
    _platform = platform;
  }

  /// Generate a deep link URL for a specific wallet.
  ///
  /// Returns the complete deep link URL string.
  String generateDeepLink(DeepLinkParams params) {
    final wallet = WalletRegistry.get(params.walletId);
    if (wallet == null) {
      throw ArgumentError('Unknown wallet ID: ${params.walletId}. Register it in WalletRegistry.');
    }

    final scheme = wallet.deepLinkScheme ?? 'wc://';
    String url = '$scheme';

    // Apply path template
    final pathTemplate = '/wc?uri={uri}';
    url += pathTemplate.replaceFirst('{uri}', Uri.encodeComponent(params.uri));

    // Append additional query parameters
    if (params.queryParams != null && params.queryParams!.isNotEmpty) {
      final separator = url.contains('?') ? '&' : '?';
      final qs = params.queryParams!.entries
          .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
          .join('&');
      url += separator + qs;
    }

    return url;
  }

  /// Generate a universal link URL for fallback.
  String generateUniversalLink(DeepLinkParams params) {
    final wallet = WalletRegistry.get(params.walletId);
    if (wallet == null) {
      throw ArgumentError('Unknown wallet ID: ${params.walletId}');
    }

    final domain = wallet.universalLinkDomain ?? 'walletconnect.com';
    return 'https://$domain/wc?uri=${Uri.encodeComponent(params.uri)}';
  }

  /// Open a deep link URL.
  ///
  /// Uses smart redirect: deep link → timeout → universal link → app store.
  Future<RedirectResult> openDeepLink(
    DeepLinkParams params, {
    DeepLinkPlatform? platform,
  }) async {
    final targetPlatform = platform ?? _platform ?? await detectPlatform();
    final wallet = WalletRegistry.get(params.walletId);

    if (wallet == null) {
      return RedirectResult(
        success: false,
        method: 'deep-link',
        url: '',
        error: 'Unknown wallet ID: ${params.walletId}',
      );
    }

    try {
      // Try deep link first
      final deepLinkUrl = generateDeepLink(params);
      final uri = Uri.parse(deepLinkUrl);

      final canLaunch = await canLaunchUrl(uri);
      if (canLaunch) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return RedirectResult(
          success: true,
          method: 'deep-link',
          url: deepLinkUrl,
        );
      }

      // Fallback to universal link
      final universalUrl = generateUniversalLink(params);
      final universalUri = Uri.parse(universalUrl);

      if (await canLaunchUrl(universalUri)) {
        await launchUrl(universalUri, mode: LaunchMode.externalApplication);
        return RedirectResult(
          success: true,
          method: 'universal-link',
          url: universalUrl,
          fallbackUsed: true,
        );
      }

      // Fallback to app store
      final storeUrl = targetPlatform == DeepLinkPlatform.ios
          ? wallet.appStoreUrl
          : wallet.playStoreUrl;

      if (storeUrl != null) {
        final storeUri = Uri.parse(storeUrl);
        if (await canLaunchUrl(storeUri)) {
          await launchUrl(storeUri, mode: LaunchMode.externalApplication);
          return RedirectResult(
            success: true,
            method: 'app-store',
            url: storeUrl,
            fallbackUsed: true,
          );
        }
      }

      return RedirectResult(
        success: false,
        method: 'qr-code',
        url: deepLinkUrl,
        error: 'Could not open wallet app. Please scan QR code.',
      );
    } catch (e) {
      return RedirectResult(
        success: false,
        method: 'deep-link',
        url: '',
        error: e.toString(),
      );
    }
  }

  /// Listen for incoming deep links (App Links / Universal Links).
  ///
  /// Returns a stream of URI strings received via deep link.
  Stream<String> listenForIncomingLinks() async* {
    await for (final uri in _appLinks.uriLinkStream) {
      yield uri.toString();
    }
  }

  /// Get initial URI if the app was launched via deep link.
  Future<Uri?> getInitialLink() async {
    try {
      return await _appLinks.getInitialLink();
    } catch (_) {
      return null;
    }
  }
}
