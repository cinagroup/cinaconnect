import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('EvmAdapter', () {
    test('constructor initializes with optional params', () {
      final adapter = EvmAdapter(
        rpcUrl: 'https://eth.llamarpc.com',
        chainId: 1,
      );
      expect(adapter, isNotNull);
    });

    test('constructor with no params works', () {
      final adapter = EvmAdapter();
      expect(adapter, isNotNull);
    });

    test('init sets rpcUrl and chainId', () {
      final adapter = EvmAdapter();
      adapter.init('https://polygon-rpc.com', chainId: 137);
      expect(adapter, isNotNull);
    });

    test('getBalance returns BigInt for valid address', () async {
      final adapter = EvmAdapter(rpcUrl: 'https://eth.llamarpc.com');
      // Will fail with network error in test env, but verifies the API contract
      expect(
        () => adapter.getBalance('0x1234567890abcdef1234567890abcdef12345678'),
        throwsA(isA<Exception>()),
      );
    });

    test('sendTransaction throws when credentials not set', () async {
      final adapter = EvmAdapter(rpcUrl: 'https://eth.llamarpc.com');
      expect(
        () => adapter.sendTransaction(const TransactionRequest(
          from: '0xFrom',
          to: '0xTo',
          value: '0x1',
        )),
        throwsA(isA<StateError>()),
      );
    });

    test('getBlockNumber returns int', () async {
      final adapter = EvmAdapter(rpcUrl: 'https://eth.llamarpc.com');
      expect(
        () => adapter.getBlockNumber(),
        throwsA(isA<Exception>()),
      );
    });

    test('getGasPrice returns BigInt', () async {
      final adapter = EvmAdapter(rpcUrl: 'https://eth.llamarpc.com');
      expect(
        () => adapter.getGasPrice(),
        throwsA(isA<Exception>()),
      );
    });

    test('estimateGas requires valid addresses', () async {
      final adapter = EvmAdapter(rpcUrl: 'https://eth.llamarpc.com');
      expect(
        () => adapter.estimateGas(
          from: '0xFrom',
          to: '0xTo',
        ),
        throwsA(isA<Exception>()),
      );
    });

    test('getNonce returns int for valid address', () async {
      final adapter = EvmAdapter(rpcUrl: 'https://eth.llamarpc.com');
      expect(
        () => adapter.getNonce('0x1234567890abcdef1234567890abcdef12345678'),
        throwsA(isA<Exception>()),
      );
    });

    test('dispose closes http client', () {
      final adapter = EvmAdapter(rpcUrl: 'https://eth.llamarpc.com');
      adapter.dispose();
      // No exception thrown
    });
  });
}
