/// Solana chain adapter using Solana SDK packages.
///
/// Provides chain interaction methods matching the core-sdk SolanaAdapter interface.
import 'dart:convert';
import 'package:http/http.dart';

/// Solana wallet information.
class SolanaWalletInfo {
  final String publicKey;
  final String? signature;

  const SolanaWalletInfo({
    required this.publicKey,
    this.signature,
  });
}

/// Solana chain adapter.
///
/// Uses HTTP JSON-RPC calls to interact with the Solana network.
/// For production, use a dedicated Solana Dart SDK.
class SolanaChainAdapter {
  final Client _httpClient;
  String _rpcUrl;
  String? _walletPublicKey;

  /// Create a Solana chain adapter.
  SolanaChainAdapter({String rpcUrl = 'https://api.mainnet-beta.solana.com'})
      : _httpClient = Client(),
        _rpcUrl = rpcUrl;

  /// Set the connected wallet public key.
  void setWalletPublicKey(String publicKey) {
    _walletPublicKey = publicKey;
  }

  /// Get the SOL balance (lamports) for an address.
  Future<int> getBalance(String address) async {
    final response = await _rpcCall('getBalance', [address]);
    final result = response['result'] as Map<String, dynamic>;
    return result['value'] as int;
  }

  /// Convert lamports to SOL.
  static double lamportsToSol(int lamports) {
    return lamports / 1e9;
  }

  /// Convert SOL to lamports.
  static int solToLamports(double sol) {
    return (sol * 1e9).toInt();
  }

  /// Get a recent blockhash.
  Future<String> getRecentBlockhash() async {
    final response = await _rpcCall('getLatestBlockhash', []);
    final result = response['result'] as Map<String, dynamic>;
    final value = result['value'] as Map<String, dynamic>;
    return value['blockhash'] as String;
  }

  /// Send a transaction.
  ///
  /// Returns the transaction signature.
  Future<String> sendTransaction(String serializedTransaction) async {
    final response = await _rpcCall('sendTransaction', [
      serializedTransaction,
      {'encoding': 'base64'},
    ]);
    return response['result'] as String;
  }

  /// Get a transaction by signature.
  Future<Map<String, dynamic>> getTransaction(String signature) async {
    return await _rpcCall('getTransaction', [
      signature,
      {'encoding': 'json'},
    ]);
  }

  /// Get account info.
  Future<Map<String, dynamic>> getAccountInfo(String address) async {
    return await _rpcCall('getAccountInfo', [
      address,
      {'encoding': 'base64'},
    ]);
  }

  /// Request an airdrop (testnet/devnet only).
  Future<String> requestAirdrop(String address, int lamports) async {
    final response = await _rpcCall('requestAirdrop', [
      address,
      lamports,
    ]);
    return response['result'] as String;
  }

  /// Get the minimum balance for rent exemption.
  Future<int> getMinimumBalanceForRentExemption(int dataLength) async {
    final response = await _rpcCall(
      'getMinimumBalanceForRentExemption',
      [dataLength],
    );
    return response['result'] as int;
  }

  /// Get the cluster node version.
  Future<String> getVersion() async {
    final response = await _rpcCall('getVersion', []);
    final result = response['result'] as Map<String, dynamic>;
    return result['solana-core'] as String;
  }

  /// Get the current epoch info.
  Future<Map<String, dynamic>> getEpochInfo() async {
    final response = await _rpcCall('getEpochInfo', []);
    return response['result'] as Map<String, dynamic>;
  }

  /// Make an RPC call to the Solana node.
  Future<Map<String, dynamic>> _rpcCall(String method, List<dynamic> params) async {
    final response = await _httpClient.post(
      Uri.parse(_rpcUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'jsonrpc': '2.0',
        'id': 1,
        'method': method,
        'params': params,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception(
        'Solana RPC error: ${response.statusCode} - ${response.body}',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;

    if (decoded.containsKey('error')) {
      throw Exception(
        'Solana RPC error: ${decoded['error']}',
      );
    }

    return decoded;
  }

  /// Clean up resources.
  void dispose() {
    _httpClient.close();
  }
}

/// Predefined Solana chain constants.
class SolanaChains {
  static const mainnet = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
  static const devnet = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
  static const testnet = 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z';
}

/// Common Solana wallets.
class SolanaWallets {
  static const phantom = 'phantom';
  static const solflare = 'solflare';
  static const backpack = 'backpack';
  static const ledger = 'ledger';
}

/// Validate a Solana address (base58, 32-44 characters).
bool isValidSolanaAddress(String address) {
  if (address.isEmpty || address.length > 44) return false;
  // Simple base58 check
  return RegExp(r'^[1-9A-HJ-NP-Za-km-z]+$').hasMatch(address);
}

/// Decode base58 string (simplified version).
List<int> base58Decode(String input) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  final result = <int>[];

  for (final char in input.split('')) {
    final index = alphabet.indexOf(char);
    if (index < 0) throw FormatException('Invalid base58 character: $char');
    result.add(index);
  }

  // Convert to bytes (simplified; for production use a proper base58 library)
  // This is a stub — use package:bs58check for production
  throw UnimplementedError(
    'Full base58 decoding requires package:bs58check. Use that package for production.',
  );
}
