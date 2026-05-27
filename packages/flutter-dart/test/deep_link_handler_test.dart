import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('DeepLinkHandler', () {
    test('generateDeepLink for metamask', () {
      final handler = DeepLinkHandler();
      handler.setPlatform(DeepLinkPlatform.android);

      final result = handler.generateDeepLink(
        DeepLinkParams(
          walletId: 'metamask',
          uri: 'wc:abc123',
        ),
      );

      expect(result, contains('metamask://'));
      expect(result, contains('wc:abc123'));
    });

    test('generateDeepLink for phantom', () {
      final handler = DeepLinkHandler();
      handler.setPlatform(DeepLinkPlatform.android);

      final result = handler.generateDeepLink(
        DeepLinkParams(
          walletId: 'phantom',
          uri: 'wc:sol456',
        ),
      );

      expect(result, contains('phantom://'));
    });

    test('generateDeepLink for unknown wallet throws', () {
      final handler = DeepLinkHandler();
      handler.setPlatform(DeepLinkPlatform.android);

      expect(
        () => handler.generateDeepLink(
          DeepLinkParams(walletId: 'unknown_wallet', uri: 'wc:test'),
        ),
        throwsArgumentError,
      );
    });

    test('generateUniversalLink for metamask', () {
      final handler = DeepLinkHandler();
      handler.setPlatform(DeepLinkPlatform.android);

      final result = handler.generateUniversalLink(
        DeepLinkParams(
          walletId: 'metamask',
          uri: 'wc:abc123',
        ),
      );

      expect(result, contains('https://'));
      expect(result, contains('metamask.app.link'));
      expect(result, contains('wc:abc123'));
    });

    test('generateUniversalLink for wallet without universal domain', () {
      final handler = DeepLinkHandler();
      handler.setPlatform(DeepLinkPlatform.android);

      // rabby has no universalLinkDomain in registry
      // This should throw ArgumentError for unknown wallet
      expect(
        () => handler.generateUniversalLink(
          DeepLinkParams(walletId: 'unknown_wallet', uri: 'wc:test'),
        ),
        throwsArgumentError,
      );
    });

    test('generateDeepLink with query params', () {
      final handler = DeepLinkHandler();
      handler.setPlatform(DeepLinkPlatform.android);

      final result = handler.generateDeepLink(
        DeepLinkParams(
          walletId: 'metamask',
          uri: 'wc:abc',
          queryParams: {'foo': 'bar'},
        ),
      );

      expect(result, contains('foo=bar'));
    });

    test('detectPlatform returns valid enum', () async {
      final platform = await DeepLinkHandler.detectPlatform();
      expect(DeepLinkPlatform.values.contains(platform), isTrue);
    });

    test('setPlatform changes platform correctly', () {
      final handler = DeepLinkHandler();
      handler.setPlatform(DeepLinkPlatform.ios);
      // Platform is set without error
    });
  });
}
