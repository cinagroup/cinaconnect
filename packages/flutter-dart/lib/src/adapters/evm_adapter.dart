/// EVM chain adapter using web3dart.
///
/// Provides chain interaction methods matching the core-sdk EvmAdapter interface.
import 'package:http/http.dart';
import 'package:web3dart/web3dart.dart';
import 'types.dart';
import 'utils.dart';

/// Parameters for eth_call.
class EthCallParams {
  final String from;
  final String to;
  final String data;
  final int? chainId;

  const EthCallParams({
    required this.from,
    required this.to,
    required this.data,
    this.chainId,
  });
}

/// EVM chain adapter for interacting with Ethereum-compatible chains.
///
/// Wraps web3dart with a simpler interface matching the core-sdk EvmAdapter.
class EvmAdapter {
  late Web3Client _client;
  late Client _httpClient;
  String? _rpcUrl;
  int? _chainId;
  Credentials? _credentials;

  /// Create an EvmAdapter with a specific RPC URL.
  EvmAdapter({String? rpcUrl, int? chainId}) {
    _rpcUrl = rpcUrl;
    _chainId = chainId;
    if (rpcUrl != null) {
      _httpClient = Client();
      _client = Web3Client(rpcUrl, _httpClient);
    }
  }

  /// Initialize the adapter with an RPC URL.
  void init(String rpcUrl, {int? chainId}) {
    _rpcUrl = rpcUrl;
    _chainId = chainId;
    _httpClient = Client();
    _client = Web3Client(rpcUrl, _httpClient);
  }

  /// Set credentials for signing transactions.
  void setCredentials(Credentials credentials) {
    _credentials = credentials;
  }

  /// Get the native balance of an address.
  Future<BigInt> getBalance(String address, {BlockNum? block}) async {
    final ethAddress = EthereumAddress.fromHex(address);
    return await _client.getBalance(ethAddress, atBlock: block);
  }

  /// Send a transaction.
  ///
  /// Returns the transaction hash as a hex string.
  Future<String> sendTransaction(TransactionRequest tx) async {
    if (_credentials == null) {
      throw StateError('Credentials not set. Call setCredentials() first.');
    }

    final from = EthereumAddress.fromHex(tx.from);
    final to = EthereumAddress.fromHex(tx.to);

    final etherAmount = tx.value != null
        ? EtherAmount.fromBigInt(EtherUnit.wei, BigInt.parse(tx.value!))
        : EtherAmount.zero();

    final txData = tx.data != null ? hexToBytes(tx.data!) : null;

    final gasPrice = tx.gasPrice != null
        ? EtherAmount.fromBigInt(EtherUnit.wei, BigInt.parse(tx.gasPrice!))
        : null;

    final maxFeePerGas = tx.maxFeePerGas != null
        ? EtherAmount.fromBigInt(EtherUnit.wei, BigInt.parse(tx.maxFeePerGas!))
        : null;

    final maxPriorityFee = tx.maxPriorityFeePerGas != null
        ? EtherAmount.fromBigInt(EtherUnit.wei, BigInt.parse(tx.maxPriorityFeePerGas!))
        : null;

    final result = await _client.sendTransaction(
      _credentials!,
      Transaction(
        from: from,
        to: to,
        value: etherAmount,
        data: txData,
        maxGas: tx.gas != null ? int.parse(tx.gas!) : null,
        gasPrice: gasPrice,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFee,
      ),
      chainId: tx.chainId ?? _chainId,
    );

    return result;
  }

  /// Call a contract method (read-only).
  Future<String> call(EthCallParams params) async {
    final from = EthereumAddress.fromHex(params.from);
    final to = EthereumAddress.fromHex(params.to);
    final data = hexToBytes(params.data);

    final result = await _client.call(
      sender: from,
      contract: to,
      data: data,
    );

    return bytesToHex(result);
  }

  /// Get the current block number.
  Future<int> getBlockNumber() async {
    return await _client.getBlockNumber();
  }

  /// Get gas price estimate.
  Future<BigInt> getGasPrice() async {
    final amount = await _client.getGasPrice();
    return amount.getInWei;
  }

  /// Estimate gas for a transaction.
  Future<BigInt> estimateGas({
    required String from,
    required String to,
    String? data,
    String? value,
  }) async {
    final fromAddr = EthereumAddress.fromHex(from);
    final toAddr = EthereumAddress.fromHex(to);

    return await _client.estimateGas(
      sender: fromAddr,
      to: toAddr,
      data: data != null ? hexToBytes(data) : null,
      value: value != null
          ? EtherAmount.fromBigInt(EtherUnit.wei, BigInt.parse(value))
          : null,
    );
  }

  /// Get a transaction receipt by hash.
  Future<TransactionReceipt?> getTransactionReceipt(String txHash) async {
    return await _client.getTransactionReceipt(txHash);
  }

  /// Get the chain ID from the RPC endpoint.
  Future<int> getChainId() async {
    return await _client.getChainId();
  }

  /// Get the nonce for an address.
  Future<int> getNonce(String address) async {
    final addr = EthereumAddress.fromHex(address);
    return await _client.getTransactionCount(addr);
  }

  /// Clean up resources.
  void dispose() {
    _httpClient.close();
  }
}
