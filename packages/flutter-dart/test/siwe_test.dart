import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('SIWE', () {
    test('generateSIWEMessage creates valid EIP-4361 message with all fields', () {
      final params = SIWEParams(
        domain: 'example.com',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        statement: 'Sign in to Example',
        uri: 'https://example.com/login',
        chainId: 1,
        nonce: 'abc123',
        issuedAt: '2024-01-01T00:00:00Z',
        expirationTime: '2024-01-02T00:00:00Z',
      );

      final message = generateSIWEMessage(params);

      expect(message.contains('example.com wants you to sign in'), isTrue);
      expect(message.contains('0x1234567890abcdef1234567890abcdef12345678'), isTrue);
      expect(message.contains('Sign in to Example'), isTrue);
      expect(message.contains('URI: https://example.com/login'), isTrue);
      expect(message.contains('Version: 1'), isTrue);
      expect(message.contains('Chain ID: 1'), isTrue);
      expect(message.contains('Nonce: abc123'), isTrue);
    });

    test('generateSIWEMessage works without optional fields', () {
      final params = SIWEParams(
        domain: 'example.com',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        uri: 'https://example.com',
        chainId: 1,
        nonce: 'abc',
        issuedAt: '2024-01-01T00:00:00Z',
      );

      final message = generateSIWEMessage(params);
      expect(message.contains('Version: 1'), isTrue);
      expect(message.contains('Chain ID: 1'), isTrue);
      expect(message.contains('Sign in to Example'), isFalse);
    });

    test('parseSIWEMessage correctly parses domain and address', () {
      final message = '''example.com wants you to sign in with your Ethereum account:
0x1234567890abcdef1234567890abcdef12345678

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00Z''';

      final parsed = parseSIWEMessage(message);

      expect(parsed.domain, 'example.com');
      expect(parsed.address, '0x1234567890abcdef1234567890abcdef12345678');
      expect(parsed.chainId, 1);
      expect(parsed.nonce, 'abc123');
    });

    test('parseSIWEMessage parses statement when present', () {
      final message = '''example.com wants you to sign in with your Ethereum account:
0x1234567890abcdef1234567890abcdef12345678

Sign in to Example

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc
Issued At: 2024-01-01T00:00:00Z''';

      final parsed = parseSIWEMessage(message);
      expect(parsed.statement, 'Sign in to Example');
    });

    test('verifySIWEMessage returns valid for correct format', () {
      final message = '''example.com wants you to sign in with your Ethereum account:
0x1234567890abcdef1234567890abcdef12345678

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00Z''';

      final result = verifySIWEMessage(
        message,
        '0x' + 'ab' * 65,
      );

      expect(result.valid, isTrue);
      expect(result.data, isNotNull);
    });

    test('verifySIWEMessage rejects missing domain', () {
      final result = verifySIWEMessage(
        'not a valid message',
        '0x' + 'ab' * 65,
      );

      expect(result.valid, isFalse);
    });

    test('verifySIWEMessage rejects empty signature', () {
      final message = '''example.com wants you to sign in with your Ethereum account:
0x1234567890abcdef1234567890abcdef12345678

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00Z''';

      final result = verifySIWEMessage(message, 'invalid');
      expect(result.valid, isFalse);
    });

    test('generateISOTimestamp creates valid timestamp', () {
      final ts = generateISOTimestamp();
      expect(ts.endsWith('Z'), isTrue);
    });
  });
}
