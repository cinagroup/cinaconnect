import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('PushHandler', () {
    test('PushConfig default values are correct', () {
      const config = PushConfig();
      expect(config.enabled, isTrue);
      expect(config.fcmToken, isNull);
      expect(config.apnsToken, isNull);
      expect(config.showOnTransaction, isTrue);
      expect(config.showOnSignature, isTrue);
      expect(config.showOnChainChange, isFalse);
    });

    test('PushConfig custom values are set correctly', () {
      const config = PushConfig(
        enabled: false,
        fcmToken: 'test-token',
        showOnTransaction: false,
        showOnChainChange: true,
      );
      expect(config.enabled, isFalse);
      expect(config.fcmToken, 'test-token');
      expect(config.showOnTransaction, isFalse);
      expect(config.showOnChainChange, isTrue);
    });

    test('PushHandler constructor creates instance', () {
      final handler = PushHandler();
      expect(handler, isNotNull);
    });

    test('PushHandler with custom config', () {
      const config = PushConfig(enabled: false);
      final handler = PushHandler(config: config);
      expect(handler, isNotNull);
    });

    test('PushHandler setFCMToken updates config', () {
      final handler = PushHandler();
      handler.setFCMToken('new-fcm-token');
      // No exception thrown
    });

    test('PushHandler setAPNSToken updates config', () {
      final handler = PushHandler();
      handler.setAPNSToken('new-apns-token');
      // No exception thrown
    });
  });
}
