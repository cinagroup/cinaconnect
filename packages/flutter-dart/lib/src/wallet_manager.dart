/// Wallet connection manager with WalletConnect v2 support.
///
/// Manages the full wallet connection lifecycle:
/// connect → session → sign → disconnect
///
/// Mirrors the core-sdk Connector + SessionManager API surface.
import 'dart:async';
import 'package:walletconnect_flutter_v2/walletconnect_flutter_v2.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'types.dart';
import 'wallet_registry.dart';
import 'deep_link_handler.dart';

/// Session storage key for persistence.
const String _sessionStorageKey = 'onchainux_session';

/// Wallet connection manager.
///
/// Provides a unified interface for connecting to wallets via
/// injected providers, QR codes, or WalletConnect v2 relay.
class WalletManager {
  final String _projectId;
  final AppMetadata _metadata;
  late IWalletConnectClient _wcClient;
  bool _initialized = false;

  // State
  ConnectionStatus _status = ConnectionStatus.disconnected;
  String? _currentSessionId;
  String? _currentConnectorId;
  List<String> _currentAccounts = [];
  int _currentChainId = 1;
  final _stateController = StreamController<SessionState>.broadcast();

  // Dependencies
  final DeepLinkHandler? _deepLinkHandler;
  Map<String, RequiredNamespace>? _requiredNamespaces;

  /// Stream of session state changes.
  Stream<SessionState> get stateChanges => _stateController.stream;

  /// Current connection status.
  ConnectionStatus get status => _status;

  /// Currently connected accounts.
  List<String> get accounts => _currentAccounts;

  /// Current chain ID.
  int get chainId => _currentChainId;

  /// Whether a wallet is connected.
  bool get isConnected => _status == ConnectionStatus.connected;

  /// The underlying WalletConnect client (advanced usage).
  IWalletConnectClient get wcClient => _wcClient;

  WalletManager({
    required String projectId,
    required AppMetadata metadata,
    Map<String, RequiredNamespace>? requiredNamespaces,
    DeepLinkHandler? deepLinkHandler,
  })  : _projectId = projectId,
        _metadata = metadata,
        _requiredNamespaces = requiredNamespaces,
        _deepLinkHandler = deepLinkHandler;

  /// Initialize the WalletConnect client.
  ///
  /// Must be called before any connection operations.
  Future<void> init() async {
    if (_initialized) return;

    _wcClient = await WalletConnectClient.connect(
      projectId: _projectId,
      relayUrl: 'wss://relay.walletconnect.com',
      metadata: PairingMetadata(
        name: _metadata.name,
        description: _metadata.description,
        url: _metadata.url,
        icons: _metadata.icons,
      ),
    );

    // Set up event listeners
    _wcClient.onSessionEvent.subscribe(_handleSessionEvent);
    _wcClient.onSessionDelete.subscribe(_handleSessionDelete);

    _initialized = true;
  }

  /// Connect to a wallet using WalletConnect v2.
  ///
  /// Generates a URI, opens the wallet app, and waits for approval.
  Future<ConnectionResult> connect({
    String? walletId,
    List<String>? chains,
  }) async {
    if (!_initialized) {
      throw StateError('WalletManager must be initialized. Call init() first.');
    }
    if (_status == ConnectionStatus.connecting) {
      throw StateError('Connection already in progress.');
    }

    final targetChains = chains ?? ['eip155:1'];
    final namespaces = _requiredNamespaces ?? _buildRequiredNamespaces(targetChains);

    _status = ConnectionStatus.connecting;
    _currentConnectorId = walletId ?? 'walletconnect';
    _emitState();

    try {
      // Create a pairing and connect
      final uriData = await _wcClient.core.pairing.create(
        methods: namespaces['eip155']?.methods ?? [
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData',
        ],
        events: namespaces['eip155']?.events ?? [
          'chainChanged',
          'accountsChanged',
        ],
        chains: namespaces['eip155']?.chains ?? ['eip155:1'],
      );

      // Open the wallet app with deep link
      if (walletId != null) {
        await _openWallet(walletId, uriData.uri);
      }

      // Wait for session approval
      final session = await _waitForSessionApproval();

      // Extract accounts and chain
      final accounts = _extractAccounts(session);
      final chainId = _extractChainId(session);

      _currentSessionId = session.topic;
      _currentAccounts = accounts;
      _currentChainId = chainId;
      _status = ConnectionStatus.connected;
      _emitState();

      // Persist session
      await _persistSession();

      return ConnectionResult(
        sessionId: session.topic,
        accounts: accounts,
        chainId: chainId,
        connectorId: _currentConnectorId ?? 'walletconnect',
      );
    } catch (e) {
      _status = ConnectionStatus.error;
      _emitState();
      // Reset after brief delay
      Future.delayed(const Duration(seconds: 5), () {
        if (_status == ConnectionStatus.error) {
          _status = ConnectionStatus.disconnected;
          _emitState();
        }
      });
      rethrow;
    }
  }

  /// Disconnect the current session.
  Future<void> disconnect() async {
    if (_currentSessionId != null && _initialized) {
      try {
        await _wcClient.disconnect(
          topic: _currentSessionId!,
          reason: const WalletConnectError(
            code: 6000,
            message: 'User disconnected',
          ),
        );
      } catch (_) {
        // Ignore disconnect errors
      }
    }

    _currentSessionId = null;
    _currentAccounts = [];
    _currentChainId = 1;
    _currentConnectorId = null;
    _status = ConnectionStatus.disconnected;
    _emitState();

    // Clear persisted session
    await _clearSession();
  }

  /// Get the connected account addresses.
  Future<List<String>> getAccounts() async {
    return _currentAccounts;
  }

  /// Get the current chain ID.
  Future<int> getChainId() async {
    return _currentChainId;
  }

  /// Switch to a different chain.
  Future<void> switchChain(int chainId) async {
    if (_currentSessionId == null || !_initialized) {
      throw StateError('Not connected. Call connect() first.');
    }

    final chainIdStr = 'eip155:$chainId';

    try {
      await _wcClient.request(
        topic: _currentSessionId!,
        request: SessionRequestParams(
          method: 'wallet_switchEthereumChain',
          params: [
            {'chainId': '0x${chainId.toRadixString(16)}'},
          ],
        ),
        chainId: chainIdStr,
      );
      _currentChainId = chainId;
      _emitState();
    } catch (e) {
      throw Exception('Failed to switch chain: $e');
    }
  }

  /// Sign a message with the connected account.
  ///
  /// @param message - Message to sign.
  /// @returns Signature as a hex string.
  Future<String> signMessage(String message) async {
    if (_currentSessionId == null || !_initialized) {
      throw StateError('Not connected. Call connect() first.');
    }
    if (_currentAccounts.isEmpty) {
      throw StateError('No accounts available.');
    }

    try {
      final result = await _wcClient.request(
        topic: _currentSessionId!,
        request: SessionRequestParams(
          method: 'personal_sign',
          params: [
            message,
            _currentAccounts.first,
          ],
        ),
        chainId: 'eip155:$_currentChainId',
      );

      return result.toString();
    } catch (e) {
      throw Exception('Failed to sign message: $e');
    }
  }

  /// Sign a transaction.
  ///
  /// @param tx - Transaction request.
  /// @returns Signed transaction as a hex string.
  Future<String> signTransaction(TransactionRequest tx) async {
    if (_currentSessionId == null || !_initialized) {
      throw StateError('Not connected. Call connect() first.');
    }

    try {
      final params = {
        'from': tx.from,
        'to': tx.to,
        if (tx.value != null) 'value': tx.value,
        if (tx.data != null) 'data': tx.data,
        if (tx.gas != null) 'gas': tx.gas,
        if (tx.gasPrice != null) 'gasPrice': tx.gasPrice,
      };

      final result = await _wcClient.request(
        topic: _currentSessionId!,
        request: SessionRequestParams(
          method: 'eth_signTransaction',
          params: [params],
        ),
        chainId: 'eip155:${tx.chainId ?? _currentChainId}',
      );

      return result.toString();
    } catch (e) {
      throw Exception('Failed to sign transaction: $e');
    }
  }

  /// Send a transaction via the connected wallet.
  Future<String> sendTransaction(TransactionRequest tx) async {
    if (_currentSessionId == null || !_initialized) {
      throw StateError('Not connected. Call connect() first.');
    }

    try {
      final params = {
        'from': tx.from,
        'to': tx.to,
        if (tx.value != null) 'value': tx.value,
        if (tx.data != null) 'data': tx.data,
        if (tx.gas != null) 'gas': tx.gas,
        if (tx.gasPrice != null) 'gasPrice': tx.gasPrice,
      };

      final result = await _wcClient.request(
        topic: _currentSessionId!,
        request: SessionRequestParams(
          method: 'eth_sendTransaction',
          params: [params],
        ),
        chainId: 'eip155:${tx.chainId ?? _currentChainId}',
      );

      return result.toString();
    } catch (e) {
      throw Exception('Failed to send transaction: $e');
    }
  }

  /// Restore a persisted session from storage.
  Future<SessionState> restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_sessionStorageKey);
      if (raw == null) return SessionState.disconnected;

      final data = _parseSession(raw);
      if (data['status'] == 'connected') {
        _status = ConnectionStatus.connected;
        _currentSessionId = data['sessionId'];
        _currentAccounts = List<String>.from(data['accounts'] ?? []);
        _currentChainId = data['chainId'] ?? 1;
        _currentConnectorId = data['connectorId'];
        _emitState();
      }
    } catch (_) {
      // Corrupted storage — ignore
    }
    return _buildState();
  }

  // --- Private helpers ---

  Map<String, RequiredNamespace> _buildRequiredNamespaces(List<String> chains) {
    return {
      'eip155': RequiredNamespace(
        chains: chains,
        methods: [
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData',
          'eth_signTypedData_v4',
        ],
        events: [
          'chainChanged',
          'accountsChanged',
        ],
      ),
    };
  }

  Future<void> _openWallet(String walletId, String uri) async {
    final handler = _deepLinkHandler ?? DeepLinkHandler();
    await handler.openDeepLink(
      DeepLinkParams(walletId: walletId, uri: uri),
    );
  }

  Future<SessionStruct> _waitForSessionApproval() async {
    final completer = Completer<SessionStruct>();

    // Listen for session proposal
    _wcClient.onSessionProposal.subscribe((proposal) async {
      if (proposal != null) {
        try {
          await _wcClient.approveSession(
            proposerPublicKey: proposal.proposer.publicKey,
            requiredNamespaces: _requiredNamespaces ?? {
              'eip155': RequiredNamespace(
                chains: ['eip155:1'],
                methods: ['eth_sendTransaction', 'personal_sign'],
                events: ['chainChanged', 'accountsChanged'],
              ),
            },
          );
        } catch (_) {}
      }
    });

    // Set a timeout
    Future.delayed(const Duration(minutes: 5), () {
      if (!completer.isCompleted) {
        completer.completeError(TimeoutException('Session approval timed out'));
      }
    });

    return completer.future;
  }

  List<String> _extractAccounts(SessionStruct session) {
    final namespaces = session.namespaces;
    final accounts = <String>[];
    for (final ns in namespaces.values) {
      accounts.addAll(ns.accounts);
    }
    return accounts.map((a) {
      // Extract address from CAIP-10 format
      final parts = a.split(':');
      return parts.length == 3 ? parts[2] : a;
    }).toList();
  }

  int _extractChainId(SessionStruct session) {
    final namespaces = session.namespaces;
    if (namespaces.isNotEmpty) {
      final firstNs = namespaces.values.first;
      if (firstNs.accounts.isNotEmpty) {
        final parts = firstNs.accounts.first.split(':');
        if (parts.length >= 2) {
          return int.tryParse(parts[1]) ?? 1;
        }
      }
    }
    return 1;
  }

  void _handleSessionEvent(dynamic event) {
    // Handle session events (chain change, accounts change)
    // This would update internal state accordingly
  }

  void _handleSessionDelete(dynamic event) {
    _status = ConnectionStatus.disconnected;
    _currentSessionId = null;
    _currentAccounts = [];
    _emitState();
    _clearSession();
  }

  void _emitState() {
    _stateController.add(_buildState());
  }

  SessionState _buildState() {
    switch (_status) {
      case ConnectionStatus.disconnected:
        return SessionState.disconnected;
      case ConnectionStatus.connecting:
        return SessionState.disconnected
            .connecting(_currentConnectorId ?? '');
      case ConnectionStatus.connected:
        return SessionState.disconnected.connected(
          accounts: _currentAccounts,
          chainId: _currentChainId,
          sessionId: _currentSessionId ?? '',
          connectorId: _currentConnectorId ?? '',
        );
      case ConnectionStatus.error:
        return SessionState.disconnected.errored('Connection error');
    }
  }

  Future<void> _persistSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = {
        'status': 'connected',
        'sessionId': _currentSessionId,
        'accounts': _currentAccounts,
        'chainId': _currentChainId,
        'connectorId': _currentConnectorId,
      };
      await prefs.setString(_sessionStorageKey, _serializeSession(data));
    } catch (_) {}
  }

  Future<void> _clearSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_sessionStorageKey);
    } catch (_) {}
  }

  String _serializeSession(Map<String, dynamic> data) {
    // Simple JSON-like serialization
    return data.toString();
  }

  Map<String, dynamic> _parseSession(String raw) {
    // Simple parsing — in production use a proper JSON library
    return {};
  }

  /// Clean up resources.
  Future<void> dispose() async {
    await _stateController.close();
    if (_initialized) {
      try {
        await _wcClient.core.disconnect();
      } catch (_) {}
    }
  }
}
