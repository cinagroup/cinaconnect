/// Wallet connection manager with encrypted session persistence.
///
/// Manages the full wallet connection lifecycle:
/// connect → session → sign → disconnect
///
/// Session state is encrypted via flutter_secure_storage and
/// auto-restored on app resume with expiry validation.
///
/// Mirrors the core-sdk Connector + SessionManager API surface.
import 'dart:async';
import 'dart:convert';
import 'package:walletconnect_flutter_v2/walletconnect_flutter_v2.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';
import 'types.dart';
import 'wallet_registry.dart';
import 'deep_link_handler.dart';

/// Session storage key for encrypted persistence.
const String _sessionStorageKey = 'cinacoin_encrypted_session';
const String _sessionExpiryKey = 'cinacoin_session_expiry';

/// Default session TTL: 7 days.
const Duration _defaultSessionTtl = Duration(days: 7);

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

  // Encrypted storage
  final FlutterSecureStorage _secureStorage;
  final Duration _sessionTtl;

  // Auto-reconnect timer
  Timer? _expiryCheckTimer;

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
    FlutterSecureStorage? secureStorage,
    Duration sessionTtl = _defaultSessionTtl,
  })  : _projectId = projectId,
        _metadata = metadata,
        _requiredNamespaces = requiredNamespaces,
        _deepLinkHandler = deepLinkHandler,
        _secureStorage = secureStorage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: true,
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock_this_device,
          ),
        ),
        _sessionTtl = sessionTtl;

  /// Initialize the WalletConnect client.
  ///
  /// Must be called before any connection operations.
  /// Attempts to restore a persisted session after initialization.
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

    // Auto-restore persisted session
    await _restoreSession();
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

      // Persist session with encryption
      await _persistSecureSession(session, accounts, chainId);

      // Start expiry monitoring
      _startExpiryCheck();

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
    // Cancel expiry check
    _expiryCheckTimer?.cancel();
    _expiryCheckTimer = null;

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

    // Clear persisted session from encrypted storage
    await _clearSecureSession();
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

      // Update persisted session
      await _updateSecureSession();
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

  /// Handle app resume event — attempt auto-reconnect.
  ///
  /// Call this from your app's onResume / WidgetsBindingObserver
  /// when the app returns from background.
  Future<void> onAppResume() async {
    if (_initialized) {
      await _restoreSession();
    }
  }

  // ─── Private: Encrypted Session Persistence ───────────────────────────

  /// Restore a previously persisted session from encrypted storage.
  ///
  /// Validates session expiry and attempts to reconnect if still valid.
  Future<void> _restoreSession() async {
    try {
      final raw = await _secureStorage.read(key: _sessionStorageKey);
      final expiryStr = await _secureStorage.read(key: _sessionExpiryKey);

      if (raw == null || expiryStr == null) {
        return;
      }

      final data = _parseSecureSession(raw);
      if (data == null) return;

      // Check session expiry
      final expiry = DateTime.parse(expiryStr);
      if (DateTime.now().isAfter(expiry)) {
        // Session expired — clear storage
        await _clearSecureSession();
        return;
      }

      final status = data['status'];
      if (status == 'connected') {
        _status = ConnectionStatus.connected;
        _currentSessionId = data['sessionId'];
        _currentAccounts = List<String>.from(data['accounts'] ?? []);
        _currentChainId = data['chainId'] ?? 1;
        _currentConnectorId = data['connectorId'];

        _emitState();
        _startExpiryCheck();
      }
    } catch (e) {
      // Corrupted or inaccessible storage — ignore and continue
      await _clearSecureSession();
    }
  }

  /// Persist the current session to encrypted storage.
  Future<void> _persistSecureSession(
    SessionStruct session,
    List<String> accounts,
    int chainId,
  ) async {
    try {
      final data = {
        'status': 'connected',
        'sessionId': session.topic,
        'accounts': accounts,
        'chainId': chainId,
        'connectorId': _currentConnectorId,
        'createdAt': DateTime.now().toIso8601String(),
      };

      final serialized = jsonEncode(data);
      await _secureStorage.write(key: _sessionStorageKey, value: serialized);

      // Set expiry time
      final expiry = DateTime.now().add(_sessionTtl);
      await _secureStorage.write(key: _sessionExpiryKey, value: expiry.toIso8601String());
    } catch (e) {
      // Storage failure — log but don't crash
      // In production, add proper logging here
    }
  }

  /// Update the persisted session in encrypted storage.
  Future<void> _updateSecureSession() async {
    if (_currentSessionId == null) return;

    try {
      final data = {
        'status': 'connected',
        'sessionId': _currentSessionId,
        'accounts': _currentAccounts,
        'chainId': _currentChainId,
        'connectorId': _currentConnectorId,
      };

      final serialized = jsonEncode(data);
      await _secureStorage.write(key: _sessionStorageKey, value: serialized);
    } catch (e) {
      // Storage failure — log but don't crash
    }
  }

  /// Clear the persisted session from encrypted storage.
  Future<void> _clearSecureSession() async {
    try {
      await _secureStorage.delete(key: _sessionStorageKey);
      await _secureStorage.delete(key: _sessionExpiryKey);
    } catch (e) {
      // Ignore — storage might be empty
    }
  }

  /// Parse the encrypted session data.
  Map<String, dynamic>? _parseSecureSession(String raw) {
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  /// Start periodic session expiry checking.
  void _startExpiryCheck() {
    _expiryCheckTimer?.cancel();

    // Check every 5 minutes
    _expiryCheckTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      _checkSessionExpiry();
    });

    // Also check immediately
    _checkSessionExpiry();
  }

  /// Check if the current session has expired.
  Future<void> _checkSessionExpiry() async {
    try {
      final expiryStr = await _secureStorage.read(key: _sessionExpiryKey);
      if (expiryStr == null) return;

      final expiry = DateTime.parse(expiryStr);
      if (DateTime.now().isAfter(expiry)) {
        // Session expired — disconnect
        await disconnect();
      }
    } catch (e) {
      // Ignore — might happen during shutdown
    }
  }

  // ─── Private: WalletConnect Helpers ───────────────────────────────────

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
    _clearSecureSession();
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

  /// Clean up resources.
  Future<void> dispose() async {
    _expiryCheckTimer?.cancel();
    _expiryCheckTimer = null;
    await _stateController.close();
    if (_initialized) {
      try {
        await _wcClient.core.disconnect();
      } catch (_) {}
    }
  }
}
