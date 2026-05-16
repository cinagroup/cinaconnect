/// SIWE (Sign-In with Ethereum) implementation for Flutter.
///
/// Implements EIP-4361 message generation and verification.
import 'package:crypto/crypto.dart';
import 'package:convert/convert.dart';
import '../types.dart';
import '../utils.dart';

/// SIWE message parameters.
class SIWEParams {
  /// The RFC 3986 URI authority (domain) that is requesting the signing.
  final String domain;
  /// The Ethereum address performing the signing.
  final String address;
  /// Human-readable ASCII sentence for the user.
  final String? statement;
  /// RFC 3986 URI referring to the resource being authenticated.
  final String uri;
  /// EIP-155 Chain ID.
  final int chainId;
  /// Randomized token to prevent signature replay attacks.
  final String nonce;
  /// ISO 8601 datetime string of the current time.
  final String issuedAt;
  /// ISO 8601 datetime string of the expiration time.
  final String? expirationTime;
  /// ISO 8601 datetime string before which the message is invalid.
  final String? notBefore;
  /// System-specific identifier for the resource.
  final String? requestId;
  /// List of information for the user to accept.
  final List<String>? resources;

  const SIWEParams({
    required this.domain,
    required this.address,
    this.statement,
    required this.uri,
    required this.chainId,
    required this.nonce,
    required this.issuedAt,
    this.expirationTime,
    this.notBefore,
    this.requestId,
    this.resources,
  });
}

/// Parsed SIWE message data.
class ParsedSIWE {
  final String domain;
  final String address;
  final String? statement;
  final String uri;
  final int chainId;
  final String nonce;
  final String issuedAt;
  final String? expirationTime;
  final String? notBefore;
  final String? requestId;
  final List<String>? resources;

  const ParsedSIWE({
    required this.domain,
    required this.address,
    this.statement,
    required this.uri,
    required this.chainId,
    required this.nonce,
    required this.issuedAt,
    this.expirationTime,
    this.notBefore,
    this.requestId,
    this.resources,
  });
}

/// SIWE verification result.
class SIWEVerificationResult {
  final bool valid;
  final ParsedSIWE? data;
  final String? error;

  const SIWEVerificationResult({
    required this.valid,
    this.data,
    this.error,
  });
}

/// Generate a SIWE message string from parameters.
///
/// Implements EIP-4361 (Sign-In with Ethereum) message format:
/// https://eips.ethereum.org/EIPS/eip-4361
String generateSIWEMessage(SIWEParams params) {
  final buffer = StringBuffer();

  // Line 1: {domain} wants you to sign in with your Ethereum account:
  buffer.writeln('${params.domain} wants you to sign in with your Ethereum account:');

  // Line 2: {address}
  buffer.writeln(params.address);
  buffer.writeln();

  // Optional statement
  if (params.statement != null) {
    buffer.writeln(params.statement);
    buffer.writeln();
  }

  // URI: {uri}
  buffer.writeln('URI: ${params.uri}');

  // Version: 1
  buffer.writeln('Version: 1');

  // Chain ID: {chainId}
  buffer.writeln('Chain ID: ${params.chainId}');

  // Nonce: {nonce}
  buffer.writeln('Nonce: ${params.nonce}');

  // Issued At: {issuedAt}
  buffer.writeln('Issued At: ${params.issuedAt}');

  // Optional expiration
  if (params.expirationTime != null) {
    buffer.writeln('Expiration Time: ${params.expirationTime}');
  }

  // Optional not-before
  if (params.notBefore != null) {
    buffer.writeln('Not Before: ${params.notBefore}');
  }

  // Optional request ID
  if (params.requestId != null) {
    buffer.writeln('Request ID: ${params.requestId}');
  }

  // Optional resources
  if (params.resources != null && params.resources!.isNotEmpty) {
    buffer.writeln('Resources:');
    for (final resource in params.resources!) {
      buffer.writeln('- $resource');
    }
  }

  return buffer.toString();
}

/// Parse a SIWE message into structured data.
ParsedSIWE parseSIWEMessage(String message) {
  final lines = message.split('\n');
  if (lines.isEmpty) {
    throw FormatException('Empty SIWE message');
  }

  // Parse domain from first line
  final firstLine = lines[0];
  final domainMatch = RegExp(r'^(.+?) wants you to sign in').firstMatch(firstLine);
  final domain = domainMatch?.group(1) ?? '';

  // Parse address from second line
  final address = lines[1].trim();

  // Parse remaining fields
  String? statement;
  String? uri;
  int? chainId;
  String? nonce;
  String? issuedAt;
  String? expirationTime;
  String? notBefore;
  String? requestId;
  final resources = <String>[];

  var lineIdx = 2;

  // Skip empty line after address
  if (lineIdx < lines.length && lines[lineIdx].isEmpty) {
    // Check if next non-empty line looks like a field (not statement)
    lineIdx++;
    if (lineIdx < lines.length && !lines[lineIdx].startsWith('URI:')) {
      // This is a statement
      statement = lines[lineIdx].trim();
      lineIdx++;
      if (lineIdx < lines.length && lines[lineIdx].isEmpty) {
        lineIdx++;
      }
    }
  }

  for (; lineIdx < lines.length; lineIdx++) {
    final line = lines[lineIdx].trim();
    if (line.isEmpty) continue;
    if (line.startsWith('URI: ')) {
      uri = line.substring(5);
    } else if (line.startsWith('Version: ')) {
      // Version field — ignore (always 1)
    } else if (line.startsWith('Chain ID: ')) {
      chainId = int.tryParse(line.substring(10)) ?? 1;
    } else if (line.startsWith('Nonce: ')) {
      nonce = line.substring(7);
    } else if (line.startsWith('Issued At: ')) {
      issuedAt = line.substring(11);
    } else if (line.startsWith('Expiration Time: ')) {
      expirationTime = line.substring(19);
    } else if (line.startsWith('Not Before: ')) {
      notBefore = line.substring(12);
    } else if (line.startsWith('Request ID: ')) {
      requestId = line.substring(12);
    } else if (line.startsWith('- ')) {
      resources.add(line.substring(2));
    }
  }

  return ParsedSIWE(
    domain: domain,
    address: address,
    statement: statement,
    uri: uri ?? '',
    chainId: chainId ?? 1,
    nonce: nonce ?? '',
    issuedAt: issuedAt ?? DateTime.now().toIso8601String(),
    expirationTime: expirationTime,
    notBefore: notBefore,
    requestId: requestId,
    resources: resources.isEmpty ? null : resources,
  );
}

/// Verify a SIWE signature.
///
/// In production, this should call the wallet's verification method.
/// This is a structural validation of the message format.
SIWEVerificationResult verifySIWEMessage(
  String message,
  String signature, {
  String? expectedAddress,
  String? expectedDomain,
  String? expectedNonce,
}) {
  try {
    final parsed = parseSIWEMessage(message);

    // Validate structure
    if (parsed.domain.isEmpty) {
      return const SIWEVerificationResult(
        valid: false,
        error: 'Missing domain in SIWE message',
      );
    }
    if (parsed.address.isEmpty) {
      return const SIWEVerificationResult(
        valid: false,
        error: 'Missing address in SIWE message',
      );
    }
    if (parsed.nonce.isEmpty) {
      return const SIWEVerificationResult(
        valid: false,
        error: 'Missing nonce in SIWE message',
      );
    }

    // Validate signature format (0x + 130 hex chars = 65 bytes)
    if (!signature.startsWith('0x') || signature.length != 132) {
      return const SIWEVerificationResult(
        valid: false,
        error: 'Invalid signature format',
      );
    }

    // Check expected values
    if (expectedAddress != null && parsed.address != expectedAddress) {
      return SIWEVerificationResult(
        valid: false,
        error: 'Address mismatch: expected $expectedAddress, got ${parsed.address}',
      );
    }

    if (expectedDomain != null && parsed.domain != expectedDomain) {
      return SIWEVerificationResult(
        valid: false,
        error: 'Domain mismatch',
      );
    }

    if (expectedNonce != null && parsed.nonce != expectedNonce) {
      return SIWEVerificationResult(
        valid: false,
        error: 'Nonce mismatch',
      );
    }

    return SIWEVerificationResult(valid: true, data: parsed);
  } catch (e) {
    return SIWEVerificationResult(
      valid: false,
      error: 'Failed to parse SIWE message: $e',
    );
  }
}

/// Generate a current ISO 8601 timestamp.
String generateISOTimestamp([DateTime? time]) {
  final t = time ?? DateTime.now().toUtc();
  return t.toIso8601String().replaceAll('Z', '').split('.').first + 'Z';
}

/// Generate an expiration time string.
String generateExpirationTime({int seconds = 86400}) {
  return generateISOTimestamp(DateTime.now().toUtc().add(Duration(seconds: seconds)));
}
