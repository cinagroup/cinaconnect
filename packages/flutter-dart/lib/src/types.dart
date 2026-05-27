/// Core type definitions for the Cinacoin Flutter SDK.
///
/// These types mirror the TypeScript core-sdk types.ts API surface.

/// Supported blockchain network types (CAIP-2 namespace).
enum ChainNamespace {
  eip155('eip155'),
  solana('solana'),
  bip121('bip121'),
  tron('tron');

  final String value;
  const ChainNamespace(this.value);
}

/// Chain reference (CAIP-2 format: namespace:reference).
class ChainReference {
  final ChainNamespace namespace;
  final String reference;

  const ChainReference({
    required this.namespace,
    required this.reference,
  });

  /// Create from CAIP-2 string (e.g., 'eip155:1').
  factory ChainReference.fromCaip2(String caip2) {
    final parts = caip2.split(':');
    if (parts.length != 2) {
      throw ArgumentError('Invalid CAIP-2 format: $caip2');
    }
    return ChainReference(
      namespace: ChainNamespace.values.firstWhere(
        (n) => n.value == parts[0],
        orElse: () => ChainNamespace.eip155,
      ),
      reference: parts[1],
    );
  }

  /// Convert to CAIP-2 string.
  String toCaip2() => '${namespace.value}:$reference';

  @override
  String toString() => toCaip2();
}

/// Full chain definition matching core-sdk Chain interface.
class Chain {
  final String id;
  final String name;
  final String rpcUrl;
  final NativeCurrency? nativeCurrency;
  final String? explorerUrl;
  final String? iconUrl;

  const Chain({
    required this.id,
    required this.name,
    required this.rpcUrl,
    this.nativeCurrency,
    this.explorerUrl,
    this.iconUrl,
  });

  /// Predefined Ethereum mainnet chain.
  static const ethereum = Chain(
    id: 'eip155:1',
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: NativeCurrency(
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    ),
    explorerUrl: 'https://etherscan.io',
    iconUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  );

  /// Predefined Polygon chain.
  static const polygon = Chain(
    id: 'eip155:137',
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: NativeCurrency(
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    ),
    explorerUrl: 'https://polygonscan.com',
    iconUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  );

  /// Predefined Arbitrum chain.
  static const arbitrum = Chain(
    id: 'eip155:42161',
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: NativeCurrency(
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    ),
    explorerUrl: 'https://arbiscan.io',
    iconUrl: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  );

  /// Predefined Optimism chain.
  static const optimism = Chain(
    id: 'eip155:10',
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: NativeCurrency(
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    ),
    explorerUrl: 'https://optimistic.etherscan.io',
    iconUrl: 'https://cryptologos.cc/logos/optimism-op-logo.png',
  );

  /// Predefined Solana mainnet.
  static const solana = Chain(
    id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: NativeCurrency(
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    ),
    explorerUrl: 'https://solscan.io',
    iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  );

  @override
  String toString() => 'Chain($id, $name)';
}

/// Native currency info for a chain.
class NativeCurrency {
  final String name;
  final String symbol;
  final int decimals;

  const NativeCurrency({
    required this.name,
    required this.symbol,
    required this.decimals,
  });
}

/// Connection parameters matching core-sdk ConnectParams.
class ConnectParams {
  /// Optional topic for existing session.
  final String? topic;
  /// Optional relay URL override.
  final String? relayUrl;
  /// Optional pairing URI (WalletConnect format).
  final String? uri;
  /// Chain IDs the dApp supports.
  final List<int>? chains;
  /// Optional metadata about the dApp.
  final AppMetadata? metadata;

  const ConnectParams({
    this.topic,
    this.relayUrl,
    this.uri,
    this.chains,
    this.metadata,
  });
}

/// Application metadata for pairing (matching core-sdk AppMetadata).
class AppMetadata {
  final String name;
  final String description;
  final String url;
  final List<String> icons;

  const AppMetadata({
    required this.name,
    required this.description,
    required this.url,
    this.icons = const [],
  });
}

/// Result of a successful wallet connection (matching core-sdk ConnectionResult).
class ConnectionResult {
  final String sessionId;
  final List<String> accounts;
  final int chainId;
  final String connectorId;

  const ConnectionResult({
    required this.sessionId,
    required this.accounts,
    required this.chainId,
    required this.connectorId,
  });

  @override
  String toString() =>
      'ConnectionResult(session: $sessionId, accounts: $accounts, chain: $chainId)';
}

/// Transaction request matching core-sdk TransactionRequest.
class TransactionRequest {
  final String from;
  final String to;
  final String? value;
  final String? data;
  final String? gas;
  final String? gasPrice;
  final String? maxFeePerGas;
  final String? maxPriorityFeePerGas;
  final String? nonce;
  final int? chainId;

  const TransactionRequest({
    required this.from,
    required this.to,
    this.value,
    this.data,
    this.gas,
    this.gasPrice,
    this.maxFeePerGas,
    this.maxPriorityFeePerGas,
    this.nonce,
    this.chainId,
  });
}

/// Wallet info for the registry.
class WalletInfo {
  final String id;
  final String name;
  final String? iconUrl;
  final String? deepLinkScheme;
  final String? universalLinkDomain;
  final String? appStoreUrl;
  final String? playStoreUrl;
  final List<String> supportedChains;

  const WalletInfo({
    required this.id,
    required this.name,
    this.iconUrl,
    this.deepLinkScheme,
    this.universalLinkDomain,
    this.appStoreUrl,
    this.playStoreUrl,
    this.supportedChains = const ['eip155:1'],
  });

  @override
  String toString() => 'WalletInfo($id, $name)';
}

/// Connection state discriminator matching SessionManager state.
enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  error,
}

/// Session state matching core-sdk session.ts SessionState.
class SessionState {
  final ConnectionStatus status;
  final String? connectorId;
  final List<String>? accounts;
  final int? chainId;
  final String? sessionId;
  final Object? error;

  const SessionState._({
    required this.status,
    this.connectorId,
    this.accounts,
    this.chainId,
    this.sessionId,
    this.error,
  });

  static const SessionState disconnected = SessionState._(
    status: ConnectionStatus.disconnected,
  );

  SessionState connecting(String connectorId) => SessionState._(
        status: ConnectionStatus.connecting,
        connectorId: connectorId,
      );

  SessionState connected({
    required List<String> accounts,
    required int chainId,
    required String sessionId,
    required String connectorId,
  }) =>
      SessionState._(
        status: ConnectionStatus.connected,
        accounts: accounts,
        chainId: chainId,
        sessionId: sessionId,
        connectorId: connectorId,
      );

  SessionState errored(Object error) => SessionState._(
        status: ConnectionStatus.error,
        error: error,
      );
}
