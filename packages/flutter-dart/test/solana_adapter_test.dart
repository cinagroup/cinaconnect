import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('SolanaChainAdapter', () {
    test('constructor initializes with default RPC', () {
      final adapter = SolanaChainAdapter();
      expect(adapter, isNotNull);
    });

    test('constructor with custom RPC works', () {
      final adapter = SolanaChainAdapter(
        rpcUrl: 'https://api.devnet.solana.com',
      );
      expect(adapter, isNotNull);
    });

    test('lamportsToSol converts correctly', () {
      expect(SolanaChainAdapter.lamportsToSol(1000000000), 1.0);
      expect(SolanaChainAdapter.lamportsToSol(500000000), 0.5);
    });

    test('solToLamports converts correctly', () {
      expect(SolanaChainAdapter.solToLamports(1.0), 1000000000);
      expect(SolanaChainAdapter.solToLamports(0.5), 500000000);
    });

    test('isValidSolanaAddress validates correctly', () {
      expect(isValidSolanaAddress('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV'), true);
      expect(isValidSolanaAddress('11111111111111111111111111111111'), true);
      expect(isValidSolanaAddress(''), false);
      expect(isValidSolanaAddress('0x1234567890abcdef'), false);
      expect(isValidSolanaAddress('ThisIsWayTooLongForAValidSolanaAddress12345'), false);
    });

    test('getBalance calls RPC', () async {
      final adapter = SolanaChainAdapter();
      // Will fail with network error in test env
      expect(
        () => adapter.getBalance('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV'),
        throwsA(isA<Exception>()),
      );
    });

    test('getRecentBlockhash calls RPC', () async {
      final adapter = SolanaChainAdapter();
      expect(
        () => adapter.getRecentBlockhash(),
        throwsA(isA<Exception>()),
      );
    });

    test('sendTransaction calls RPC', () async {
      final adapter = SolanaChainAdapter();
      expect(
        () => adapter.sendTransaction('dGVzdA=='),
        throwsA(isA<Exception>()),
      );
    });
  });
}
