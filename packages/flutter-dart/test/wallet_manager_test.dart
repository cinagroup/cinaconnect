import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('WalletManager', () {
    test('Constructor stores parameters', () {
      final manager = WalletManager(
        projectId: 'test_project_id',
        metadata: const AppMetadata(
          name: 'Test App',
          description: 'Test',
          url: 'https://test.com',
        ),
      );

      expect(manager.status, ConnectionStatus.disconnected);
      expect(manager.isConnected, false);
      expect(manager.accounts, isEmpty);
      expect(manager.chainId, 1);
    });

    test('Initial state is disconnected', () {
      final manager = WalletManager(
        projectId: 'test',
        metadata: const AppMetadata(
          name: 'Test',
          description: 'Test',
          url: 'https://test.com',
        ),
      );

      expect(manager.status, ConnectionStatus.disconnected);
      expect(manager.isConnected, false);
    });

    test('State changes stream is broadcast', () {
      final manager = WalletManager(
        projectId: 'test',
        metadata: const AppMetadata(
          name: 'Test',
          description: 'Test',
          url: 'https://test.com',
        ),
      );

      // Stream should be accessible
      expect(manager.stateChanges, isA<Stream<SessionState>>());
    });

    test('Throws if connect called before init', () async {
      final manager = WalletManager(
        projectId: 'test',
        metadata: const AppMetadata(
          name: 'Test',
          description: 'Test',
          url: 'https://test.com',
        ),
      );

      expect(
        () => manager.connect(walletId: 'metamask'),
        throwsA(isA<StateError>()),
      );
    });

    test('Throws if signMessage called when not connected', () async {
      final manager = WalletManager(
        projectId: 'test',
        metadata: const AppMetadata(
          name: 'Test',
          description: 'Test',
          url: 'https://test.com',
        ),
      );

      expect(
        () => manager.signMessage('hello'),
        throwsA(isA<StateError>()),
      );
    });

    test('Throws if sendTransaction called when not connected', () async {
      final manager = WalletManager(
        projectId: 'test',
        metadata: const AppMetadata(
          name: 'Test',
          description: 'Test',
          url: 'https://test.com',
        ),
      );

      const tx = TransactionRequest(
        from: '0x1234',
        to: '0x5678',
        value: '0x1',
      );

      expect(
        () => manager.sendTransaction(tx),
        throwsA(isA<StateError>()),
      );
    });

    test('Throws if switchChain called when not connected', () async {
      final manager = WalletManager(
        projectId: 'test',
        metadata: const AppMetadata(
          name: 'Test',
          description: 'Test',
          url: 'https://test.com',
        ),
      );

      expect(
        () => manager.switchChain(137),
        throwsA(isA<StateError>()),
      );
    });
  });
}
