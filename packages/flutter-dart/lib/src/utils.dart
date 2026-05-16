/// Utility functions for address formatting, balance conversion, etc.
import 'dart:typed_data';
import 'dart:math';
import 'package:convert/convert.dart';

/// Format an Ethereum-style address with prefix and ellipsis.
///
/// Example: formatAddress('0x1234...abcd', 4) → '0x1234…abcd'
String formatAddress(String address, {int prefixLength = 6, int suffixLength = 4}) {
  if (address.length <= prefixLength + suffixLength) return address;
  final prefix = address.substring(0, prefixLength);
  final suffix = address.substring(address.length - suffixLength);
  return '$prefix\u2026$suffix'; // Unicode ellipsis
}

/// Format a balance from wei to human-readable with symbol.
///
/// Example: formatBalance(BigInt.parse('1000000000000000000'), 'ETH', decimals: 18) → '1.0000 ETH'
String formatBalance(
  BigInt balance,
  String symbol, {
  int decimals = 18,
  int precision = 4,
}) {
  final divisor = BigInt.from(10).pow(decimals);
  final integerPart = balance ~/ divisor;
  final fractionalPart = balance.remainder(divisor);

  final fractionalStr = fractionalPart.toString().padLeft(decimals, '0');
  final trimmedFraction = fractionalStr.substring(0, precision);

  // Remove trailing zeros
  final cleanFraction = trimmedFraction.replaceAll(RegExp(r'0+$'), '');
  final suffix = cleanFraction.isEmpty ? '' : '.$cleanFraction';

  return '${integerPart.toString()}$suffix $symbol';
}

/// Convert wei to ether.
BigInt weiToEther(BigInt wei) {
  return wei ~/ BigInt.from(10).pow(18);
}

/// Convert ether to wei.
BigInt etherToWei(double ether) {
  return (ether * 1e18).toBigInt();
}

/// Parse hex string to bytes.
///
/// Handles both '0x' prefixed and raw hex strings.
Uint8List hexToBytes(String hex) {
  final cleanHex = hex.startsWith('0x') ? hex.substring(2) : hex;
  if (cleanHex.length % 2 != 0) {
    throw FormatException('Hex string must have even length: $hex');
  }
  return Uint8List.fromList(hex.decode(cleanHex));
}

/// Convert bytes to hex string with '0x' prefix.
String bytesToHex(Uint8List bytes) {
  return '0x${hex.encode(bytes)}';
}

/// Parse a CAIP-10 account address into namespace, reference, and address.
///
/// Example: 'eip155:1:0x1234...' → ['eip155', '1', '0x1234...']
///
/// Returns null if the format is invalid.
List<String>? parseAccountId(String accountId) {
  final parts = accountId.split(':');
  if (parts.length == 3) {
    return parts; // namespace:reference:address
  }
  return null; // Invalid format
}

/// Check if a string is a valid Ethereum address.
bool isValidEthereumAddress(String address) {
  return RegExp(r'^0x[a-fA-F0-9]{40}$').hasMatch(address);
}

/// Truncate a string with ellipsis for display.
String truncate(String text, {int maxLength = 20}) {
  if (text.length <= maxLength) return text;
  return '${text.substring(0, maxLength - 3)}...';
}

/// Generate a random nonce (hex string).
String generateNonce() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  return bytesToHex(Uint8List.fromList(bytes));
}
