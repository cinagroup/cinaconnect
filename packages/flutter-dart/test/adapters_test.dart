import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('EvmAdapter', () {
    test('Constructor initializes with optional params', () {
      final adapter = EvmAdapter(
        rpcUrl: 'https://eth.llamarpc.com',
        chainId: 1,
      );
      // Adapter should be constructible without error
      expect(adapter, isNotNull);
    });

    test('Constructor with no params works', () {
      final adapter = EvmAdapter();
      expect(adapter, isNotNull);
    });
  });

  group('SolanaChainAdapter', () {
    test('Constructor initializes with default RPC', () {
      final adapter = SolanaChainAdapter();
      expect(adapter, isNotNull);
    });

    test('Constructor with custom RPC works', () {
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
      // Valid Solana address (base58, 32-44 chars)
      expect(isValidSolanaAddress('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV'), true);
      expect(isValidSolanaAddress('11111111111111111111111111111111'), true);
      // Invalid
      expect(isValidSolanaAddress(''), false);
      expect(isValidSolanaAddress('0x1234567890abcdef'), false); // Not base58
      expect(isValidSolanaAddress('ThisIsWayTooLongForAValidSolanaAddress12345'), false);
    });

    test('SolanaChains has correct constants', () {
      expect(SolanaChains.mainnet, 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
      expect(SolanaChains.devnet, 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1');
      expect(SolanaChains.testnet, 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z');
    });
  });

  group('SIWE', () {
    test('generateSIWEMessage creates valid EIP-4361 message', () {
      final params = SIWEParams(
        domain: 'example.com',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        uri: 'https://example.com/login',
        chainId: 1,
        nonce: 'abc123',
        issuedAt: '2024-01-01T00:00:00Z',
        statement: 'Sign in to Example',
        expirationTime: '2024-01-02T00:00:00Z',
      );

      final message = generateSIWEMessage(params);

      expect(message.contains('example.com wants you to sign in'), true);
      expect(message.contains('0x1234567890abcdef1234567890abcdef12345678'), true);
      expect(message.contains('Sign in to Example'), true);
      expect(message.contains('URI: https://example.com/login'), true);
      expect(message.contains('Version: 1'), true);
      expect(message.contains('Chain ID: 1'), true);
      expect(message.contains('Nonce: abc123'), true);
      expect(message.contains('Issued At: 2024-01-01T00:00:00Z'), true);
      expect(message.contains('Expiration Time: 2024-01-02T00:00:00Z'), true);
    });

    test('generateSIWEMessage handles optional fields', () {
      final params = SIWEParams(
        domain: 'example.com',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        uri: 'https://example.com',
        chainId: 1,
        nonce: 'abc',
        issuedAt: '2024-01-01T00:00:00Z',
      );

      final message = generateSIWEMessage(params);

      expect(message.contains('Version: 1'), true);
      expect(message.contains('Chain ID: 1'), true);
    });

    test('generateSIWEMessage includes resources', () {
      final params = SIWEParams(
        domain: 'example.com',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        uri: 'https://example.com',
        chainId: 1,
        nonce: 'abc',
        issuedAt: '2024-01-01T00:00:00Z',
        resources: [
          'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          'https://example.com/terms',
        ],
      );

      final message = generateSIWEMessage(params);
      expect(message.contains('Resources:'), true);
      expect(message.contains('- ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'), true);
      expect(message.contains('- https://example.com/terms'), true);
    });

    test('parseSIWEMessage parses a valid message', () {
      final message = '''example.com wants you to sign in with your Ethereum account:
0x1234567890abcdef1234567890abcdef12345678

Sign in to Example

URI: https://example.com/login
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00Z
Expiration Time: 2024-01-02T00:00:00Z''';

      final parsed = parseSIWEMessage(message);

      expect(parsed.domain, 'example.com');
      expect(parsed.address, '0x1234567890abcdef1234567890abcdef12345678');
      expect(parsed.statement, 'Sign in to Example');
      expect(parsed.uri, 'https://example.com/login');
      expect(parsed.chainId, 1);
      expect(parsed.nonce, 'abc123');
    });

    test('verifySIWEMessage validates format', () {
      final result = verifySIWEMessage(
        '''example.com wants you to sign in with your Ethereum account:
0x1234567890abcdef1234567890abcdef12345678

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00Z''',
        '0x' + 'ab' * 65, // Valid format (0x + 130 hex chars)
      );

      expect(result.valid, true);
      expect(result.data, isNotNull);
    });

    test('verifySIWEMessage rejects invalid signature format', () {
      final result = verifySIWEMessage(
        '''example.com wants you to sign in with your Ethereum account:
0x1234567890abcdef1234567890abcdef12345678

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00Z''',
        'invalid', // Invalid format
      );

      expect(result.valid, false);
    });

    test('verifySIWEMessage checks address match', () {
      final result = verifySIWEMessage(
        '''example.com wants you to sign in with your Ethereum account:
0x1234567890abcdef1234567890abcdef12345678

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00Z''',
        '0x' + 'ab' * 65,
        expectedAddress: '0xdifferent',
      );

      expect(result.valid, false);
    });

    test('generateISOTimestamp creates valid timestamp', () {
      final ts = generateISOTimestamp();
      expect(ts.endsWith('Z'), true);
    });

    test('generateExpirationTime creates future timestamp', () {
      final now = generateISOTimestamp();
      final exp = generateExpirationTime(seconds: 3600);
      expect(exp.compareTo(now) > 0, true);
    });
  });
}
