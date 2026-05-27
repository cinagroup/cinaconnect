import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('Types', () {
    test('ChainReference fromCaip2 parses correctly', () {
      final ref = ChainReference.fromCaip2('eip155:1');
      expect(ref.namespace, ChainNamespace.eip155);
      expect(ref.reference, '1');
      expect(ref.toCaip2(), 'eip155:1');
    });

    test('ChainReference fromCaip2 throws on invalid format', () {
      expect(() => ChainReference.fromCaip2('invalid'), throwsArgumentError);
    });

    test('Chain predefined chains have correct properties', () {
      expect(Chain.ethereum.id, 'eip155:1');
      expect(Chain.ethereum.name, 'Ethereum');
      expect(Chain.polygon.id, 'eip155:137');
      expect(Chain.solana.id, 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    });

    test('AppMetadata creates correctly', () {
      const metadata = AppMetadata(
        name: 'Test dApp',
        description: 'Test',
        url: 'https://test.com',
        icons: ['https://test.com/icon.png'],
      );
      expect(metadata.name, 'Test dApp');
      expect(metadata.icons, ['https://test.com/icon.png']);
    });

    test('ConnectionResult formats correctly', () {
      const result = ConnectionResult(
        sessionId: 'abc123',
        accounts: ['0x1234567890abcdef'],
        chainId: 1,
        connectorId: 'metamask',
      );
      expect(result.sessionId, 'abc123');
      expect(result.accounts, ['0x1234567890abcdef']);
      expect(result.chainId, 1);
    });
  });

  group('Utils', () {
    test('formatAddress truncates correctly', () {
      const addr = '0x1234567890abcdef1234567890abcdef12345678';
      final result = formatAddress(addr, prefixLength: 6, suffixLength: 4);
      expect(result, '0x1234\u20265678');
    });

    test('formatAddress returns full address if short', () {
      const addr = '0x1234';
      expect(formatAddress(addr), '0x1234');
    });

    test('formatBalance formats wei to ETH', () {
      final result = formatBalance(
        BigInt.parse('1000000000000000000'),
        'ETH',
        decimals: 18,
      );
      expect(result, '1 ETH');
    });

    test('isValidEthereumAddress validates correctly', () {
      expect(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef12345678'), true);
      expect(isValidEthereumAddress('0x1234'), false);
    });

    test('hexToBytes converts correctly', () {
      final bytes = hexToBytes('0x48656c6c6f');
      expect(bytes, [0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    });

    test('bytesToHex converts correctly', () {
      final hex = bytesToHex(Uint8List.fromList([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
      expect(hex, '0x48656c6c6f');
    });

    test('generateNonce produces valid hex string', () {
      final nonce = generateNonce();
      expect(nonce.startsWith('0x'), true);
      expect(nonce.length, 34);
    });
  });
}
