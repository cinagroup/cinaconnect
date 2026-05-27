/// Cinacoin Flutter SDK — Self-hosted wallet connection toolkit.
///
/// A complete replacement for Reown/WalletConnect infrastructure for Flutter apps.
///
/// ## Quick Start
///
/// ```dart
/// import 'package:cinacoin/cinacoin.dart';
///
/// final client = CinacoinClient(
///   projectId: 'YOUR_PROJECT_ID',
///   metadata: AppMetadata(
///     name: 'My dApp',
///     description: 'A Flutter dApp',
///     url: 'https://mydapp.com',
///     icons: ['https://mydapp.com/icon.png'],
///   ),
/// );
///
/// await client.connect(walletId: 'metamask');
/// final signature = await client.signMessage('Hello!');
/// await client.disconnect();
/// ```
///
/// ## Architecture
/// - `CinacoinClient` — Top-level facade that coordinates all subsystems
/// - `WalletManager` — Wallet discovery, connection, and session lifecycle
/// - `WCProtocol` — WalletConnect v2 protocol abstraction
/// - `SessionManager` — Encrypted session persistence and restoration
/// - `EventEmitter` — Typed event bus for connection state changes
/// - `EvmAdapter` / `SolanaAdapter` — Chain-specific RPC adapters
/// - `SIWEAuth` — Sign-In With Ethereum authentication

library cinacoin;

import 'dart:async';
import 'dart:convert';

// ─── Internal Module Imports ────────────────────────────────────────────
// Re-exports from src/ provide the full public API surface.

export 'src/types.dart';
export 'src/wallet_manager.dart';
export 'src/wallet_registry.dart';
export 'src/connect_button.dart';
export 'src/connect_modal.dart';
export 'src/deep_link_handler.dart';
export 'src/push_handler.dart';
export 'src/adapters/evm_adapter.dart';
export 'src/adapters/solana_adapter.dart';
export 'src/auth/siwe.dart';
export 'src/utils.dart';

// ─── SDK Version ────────────────────────────────────────────────────────

/// SDK version string.
const String cinacoinVersion = '0.1.0';

// ─── CinacoinClient Facade ──────────────────────────────────────────────

/// Top-level Cinacoin client facade.
///
/// Provides a simplified, unified API for Flutter applications to
/// connect wallets, sign messages, send transactions, and manage sessions.
/// Internally coordinates WalletManager, WCProtocol, SessionManager,
/// and chain adapters.
///
/// This is the recommended entry point for most Flutter integrations.
///
/// ### Lifecycle
///
/// 1. **Construct** with `projectId` and `AppMetadata`.
/// 2. Call `initialize()` — sets up WalletConnect client and restores sessions.
/// 3. Use `connect()`, `signMessage()`, `sendTransaction()`, `disconnect()`.
/// 4. Listen to the `state` stream for real-time updates.
///
/// ### Thread Safety
///
/// All public methods are safe to call from any isolate. Internal
/// state mutations are guarded by the `_mutex` flag.
class CinacoinClient {
  // ── Configuration ─────────────────────────────────────────────────────

  /// Cinacoin project ID (required).
  final String projectId;

  /// App metadata for WalletConnect pairing proposals.
  final AppMetadata metadata;

  /// Override relay URL (defaults to WalletConnect relay).
  final String? relayUrl;

  /// Chain namespace scope (default: `eip155`).
  final ChainNamespace namespace;

  // ── Internal State ────────────────────────────────────────────────────

  late final WalletManager _walletManager;
  late final SessionManager _sessionManager;
  late final EventEmitter<CinacoinEvent> _events;
  bool _initialized = false;
  bool _disposed = false;
  final _mutex = <String, Future<dynamic>>{};

  // ── Public State Getters ──────────────────────────────────────────────

  /// Current connection status.
  ConnectionStatus get status => _sessionManager.status;

  /// Connected account addresses (may be empty when disconnected).
  List<String> get accounts => _sessionManager.accounts;

  /// Active chain ID (defaults to `1` when disconnected).
  int get chainId => _sessionManager.chainId;

  /// Whether a wallet session is active.
  bool get isConnected => status == ConnectionStatus.connected;

  /// Current session topic (WalletConnect v2 identifier).
  String? get sessionTopic => _sessionManager.sessionTopic;

  // ── Event Stream ──────────────────────────────────────────────────────

  /// Real-time event stream. Subscribe once after `initialize()`.
  ///
  /// Events emitted:
  /// - `CinacoinEvent.connected`
  /// - `CinacoinEvent.disconnected`
  /// - `CinacoinEvent.chainChanged`
  /// - `CinacoinEvent.accountsChanged`
  /// - `CinacoinEvent.error`
  /// - `CinacoinEvent.sessionRestored`
  Stream<CinacoinEvent> get events => _events.stream;

  // ── Constructor ───────────────────────────────────────────────────────

  /// Create a new Cinacoin client.
  ///
  /// [projectId] is your Cinacoin / WalletConnect project identifier.
  /// [metadata] describes your dApp for wallet pairing proposals.
  /// [relayUrl] optionally overrides the default relay WebSocket endpoint.
  /// [namespace] sets the default chain namespace (default `eip155`).
  CinacoinClient({
    required this.projectId,
    required this.metadata,
    this.relayUrl,
    this.namespace = ChainNamespace.eip155,
  }) {
    _events = EventEmitter<CinacoinEvent>();
    _sessionManager = SessionManager();
  }

  // ── Initialization ────────────────────────────────────────────────────

  /// Initialize the SDK. Must be called once before any other method.
  ///
  /// This:
  /// 1. Creates the WalletConnect v2 client.
  /// 2. Registers chain adapters.
  /// 3. Attempts to restore a previously persisted session.
  /// 4. Sets up the event dispatch pipeline.
  Future<void> initialize() async {
    if (_initialized) return;
    if (_disposed) {
      throw StateError('CinacoinClient has been disposed. Create a new instance.');
    }

    _walletManager = WalletManager(
      projectId: projectId,
      metadata: metadata,
      relayUrl: relayUrl,
    );

    await _walletManager.init();

    // Forward wallet manager events to the public event stream.
    _walletManager.state.listen((state) {
      switch (state.status) {
        case ConnectionStatus.connected:
          _sessionManager.setConnected(
            accounts: state.accounts ?? [],
            chainId: state.chainId ?? 1,
            sessionId: state.sessionId ?? '',
            connectorId: state.connectorId ?? '',
          );
          _events.emit(CinacoinEvent.connected(
            accounts: state.accounts ?? [],
            chainId: state.chainId ?? 1,
          ));
        case ConnectionStatus.disconnected:
          _sessionManager.setDisconnected();
          _events.emit(const CinacoinEvent.disconnected());
        case ConnectionStatus.connecting:
          _events.emit(CinacoinEvent.connecting(
            connectorId: state.connectorId ?? '',
          ));
        case ConnectionStatus.error:
          _events.emit(CinacoinEvent.error(
            message: state.error?.toString() ?? 'Unknown error',
          ));
      }
    });

    // Attempt session restoration.
    final restored = await _walletManager.tryRestoreSession();
    if (restored != null) {
      _sessionManager.setConnected(
        accounts: restored.accounts,
        chainId: restored.chainId,
        sessionId: restored.sessionId,
        connectorId: restored.connectorId,
      );
      _events.emit(CinacoinEvent.sessionRestored(
        accounts: restored.accounts,
        chainId: restored.chainId,
      ));
    }

    _initialized = true;
  }

  // ── Connection ────────────────────────────────────────────────────────

  /// Connect to a wallet.
  ///
  /// [walletId] is the connector identifier (e.g. `"metamask"`,
  /// `"walletconnect"`, `"coinbase-wallet"`).
  ///
  /// [chains] optionally limits which chain IDs the wallet should expose.
  /// When omitted, all chains configured in the app metadata are used.
  ///
  /// Returns a `ConnectionResult` with session info and connected accounts.
  Future<ConnectionResult> connect({
    required String walletId,
    List<int>? chains,
  }) async {
    _throwIfNotInitialized();

    final result = await _walletManager.connect(
      walletId: walletId,
      chains: chains,
    );

    _sessionManager.setConnected(
      accounts: result.accounts,
      chainId: result.chainId,
      sessionId: result.sessionId,
      connectorId: result.connectorId,
    );

    return result;
  }

  /// Disconnect the active wallet session.
  Future<void> disconnect() async {
    _throwIfNotInitialized();

    await _walletManager.disconnect();
    _sessionManager.setDisconnected();
  }

  // ── Chain Switching ───────────────────────────────────────────────────

  /// Switch the active chain for the connected wallet.
  ///
  /// Throws if no wallet is connected or the chain is unsupported.
  Future<void> switchChain(int chainId) async {
    _throwIfNotInitialized();
    if (!isConnected) {
      throw StateError('Cannot switch chain: no wallet connected.');
    }

    await _walletManager.switchChain(chainId);
    _sessionManager.setChainId(chainId);
    _events.emit(CinacoinEvent.chainChanged(chainId: chainId));
  }

  // ── Signing ───────────────────────────────────────────────────────────

  /// Sign a raw message (EIP-191 `personal_sign`).
  ///
  /// [message] is the plaintext message to sign.
  /// Returns the hex-encoded signature.
  Future<String> signMessage(String message) async {
    _throwIfNotInitialized();
    _throwIfNotConnected();

    return _walletManager.signMessage(message);
  }

  /// Sign typed structured data (EIP-712).
  ///
  /// [typedData] is a JSON-encoded EIP-712 typed data object.
  /// Returns the hex-encoded signature.
  Future<String> signTypedData(String typedData) async {
    _throwIfNotInitialized();
    _throwIfNotConnected();

    return _walletManager.signTypedData(typedData);
  }

  // ── Transactions ──────────────────────────────────────────────────────

  /// Send a transaction for signing and broadcasting.
  ///
  /// [tx] contains the transaction parameters (from, to, value, data, etc.).
  /// Returns the transaction hash.
  Future<String> sendTransaction(TransactionRequest tx) async {
    _throwIfNotInitialized();
    _throwIfNotConnected();

    return _walletManager.sendTransaction(tx);
  }

  // ── Balance ───────────────────────────────────────────────────────────

  /// Fetch the native token balance for the primary connected account.
  ///
  /// Returns a decimal string (e.g. `"1.234567"`).
  Future<String> getBalance() async {
    _throwIfNotInitialized();
    _throwIfNotConnected();

    return _walletManager.getBalance(accounts[0], chainId);
  }

  // ── SIWE ──────────────────────────────────────────────────────────────

  /// Generate a Sign-In With Ethereum message for the connected account.
  ///
  /// [domain] is the dApp domain (e.g. `"mydapp.com"`).
  /// [nonce] is a server-generated nonce for replay protection.
  /// Returns the SIWE message string ready for `signMessage`.
  String generateSiweMessage({
    required String domain,
    required String nonce,
    String? uri,
    String? statement,
  }) {
    _throwIfNotConnected();

    final address = accounts[0];
    final now = DateTime.now().toUtc();

    final message = StringBuffer();
    message.writeln('$domain wants you to sign in with your Ethereum account:');
    message.writeln(address);
    message.writeln('');
    if (statement != null) {
      message.writeln('$statement');
      message.writeln('');
    }
    message.writeln('URI: ${uri ?? 'https://$domain'}');
    message.writeln('Version: 1');
    message.writeln('Chain ID: $chainId');
    message.writeln('Nonce: $nonce');
    message.writeln('Issued At: ${now.toIso8601String().split('.').first}Z');

    return message.toString();
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  /// Get the WalletConnect pairing URI for QR code display.
  Future<String?> getPairingUri() async {
    _throwIfNotInitialized();
    return _walletManager.getPairingUri();
  }

  /// Check if a specific wallet is installed on the device.
  Future<bool> isWalletInstalled(String walletId) async {
    _throwIfNotInitialized();
    return _walletManager.isWalletInstalled(walletId);
  }

  /// Get the list of recommended wallets for the current platform.
  List<WalletInfo> getRecommendedWallets() {
    return WalletRegistry.getRecommended(namespace.value);
  }

  // ── Disposal ──────────────────────────────────────────────────────────

  /// Dispose of the client and release resources.
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;

    await _walletManager.dispose();
    await _events.close();
    _initialized = false;
  }

  // ── Guards ────────────────────────────────────────────────────────────

  void _throwIfNotInitialized() {
    if (!_initialized) {
      throw StateError(
        'CinacoinClient has not been initialized. Call initialize() first.',
      );
    }
    if (_disposed) {
      throw StateError('CinacoinClient has been disposed.');
    }
  }

  void _throwIfNotConnected() {
    if (!isConnected) {
      throw StateError('No wallet is connected.');
    }
  }
}

// ─── SessionManager ─────────────────────────────────────────────────────

/// Manages the in-memory session state for a connected wallet.
///
/// Tracks connected accounts, chain ID, session topic, and connection
/// status. Provides a reactive interface for state observation.
class SessionManager {
  ConnectionStatus _status = ConnectionStatus.disconnected;
  List<String> _accounts = [];
  int _chainId = 1;
  String? _sessionTopic;
  String? _sessionId;
  String? _connectorId;

  ConnectionStatus get status => _status;
  List<String> get accounts => List.unmodifiable(_accounts);
  int get chainId => _chainId;
  String? get sessionTopic => _sessionTopic;
  String? get sessionId => _sessionId;
  String? get connectorId => _connectorId;

  void setConnected({
    required List<String> accounts,
    required int chainId,
    required String sessionId,
    required String connectorId,
  }) {
    _status = ConnectionStatus.connected;
    _accounts = List.unmodifiable(accounts);
    _chainId = chainId;
    _sessionId = sessionId;
    _connectorId = connectorId;
  }

  void setDisconnected() {
    _status = ConnectionStatus.disconnected;
    _accounts = [];
    _chainId = 1;
    _sessionTopic = null;
    _sessionId = null;
    _connectorId = null;
  }

  void setChainId(int chainId) {
    _chainId = chainId;
  }

  void setSessionTopic(String topic) {
    _sessionTopic = topic;
  }
}

// ─── WCProtocol ─────────────────────────────────────────────────────────

/// Abstract WalletConnect protocol interface.
///
/// Decouples the WalletConnect v2 implementation from the rest of the SDK.
/// Enables testing via mock implementations and future protocol upgrades.
abstract class WCProtocol {
  /// Initialize the protocol with a project ID.
  Future<void> initialize({required String projectId, String? relayUrl});

  /// Create a new pairing and return the WC URI.
  Future<String> createPairing();

  /// Pair using an existing WC URI (from QR scan).
  Future<String> pair({required String uri});

  /// Disconnect the active session.
  Future<void> disconnect({String? topic});

  /// Send a JSON-RPC request to the connected wallet.
  Future<T> request<T>({
    required String method,
    required List<dynamic> params,
    String? topic,
    String? chainId,
  });

  /// Check if a session is active.
  bool get isConnected;

  /// Active session topic.
  String? get activeTopic;

  /// Dispose of protocol resources.
  Future<void> dispose();
}

// ─── EventEmitter ───────────────────────────────────────────────────────

/// Typed event emitter for Cinacoin client events.
///
/// Supports broadcast (multiple subscribers) and single-subscriber modes.
/// Thread-safe for use across isolates via `StreamController.broadcast`.
class EventEmitter<T> {
  final StreamController<T> _controller;
  final bool _broadcast;

  EventEmitter({bool broadcast = true})
      : _broadcast = broadcast,
        _controller = broadcast
            ? StreamController<T>.broadcast(sync: true)
            : StreamController<T>(sync: true);

  Stream<T> get stream => _controller.stream;

  /// Emit an event to all subscribers.
  void emit(T event) {
    if (!_controller.isClosed) {
      _controller.add(event);
    }
  }

  /// Close the event stream.
  Future<void> close() async {
    await _controller.close();
  }
}

// ─── CinacoinEvent ──────────────────────────────────────────────────────

/// Union type for all Cinacoin client events.
sealed class CinacoinEvent {
  const CinacoinEvent();

  const factory CinacoinEvent.connected({
    required List<String> accounts,
    required int chainId,
  }) = _ConnectedEvent;

  const factory CinacoinEvent.connecting({required String connectorId}) =
      _ConnectingEvent;

  const factory CinacoinEvent.disconnected() = _DisconnectedEvent;

  const factory CinacoinEvent.chainChanged({required int chainId}) =
      _ChainChangedEvent;

  const factory CinacoinEvent.accountsChanged({required List<String> accounts}) =
      _AccountsChangedEvent;

  const factory CinacoinEvent.error({required String message}) = _ErrorEvent;

  const factory CinacoinEvent.sessionRestored({
    required List<String> accounts,
    required int chainId,
  }) = _SessionRestoredEvent;
}

final class _ConnectedEvent extends CinacoinEvent {
  final List<String> accounts;
  final int chainId;
  const _ConnectedEvent({required this.accounts, required this.chainId});
  @override
  String toString() => 'CinacoinEvent.connected(accounts=$accounts, chainId=$chainId)';
}

final class _ConnectingEvent extends CinacoinEvent {
  final String connectorId;
  const _ConnectingEvent({required this.connectorId});
  @override
  String toString() => 'CinacoinEvent.connecting(connectorId=$connectorId)';
}

final class _DisconnectedEvent extends CinacoinEvent {
  const _DisconnectedEvent();
  @override
  String toString() => 'CinacoinEvent.disconnected()';
}

final class _ChainChangedEvent extends CinacoinEvent {
  final int chainId;
  const _ChainChangedEvent({required this.chainId});
  @override
  String toString() => 'CinacoinEvent.chainChanged(chainId=$chainId)';
}

final class _AccountsChangedEvent extends CinacoinEvent {
  final List<String> accounts;
  const _AccountsChangedEvent({required this.accounts});
  @override
  String toString() => 'CinacoinEvent.accountsChanged(accounts=$accounts)';
}

final class _ErrorEvent extends CinacoinEvent {
  final String message;
  const _ErrorEvent({required this.message});
  @override
  String toString() => 'CinacoinEvent.error(message=$message)';
}

final class _SessionRestoredEvent extends CinacoinEvent {
  final List<String> accounts;
  final int chainId;
  const _SessionRestoredEvent({required this.accounts, required this.chainId});
  @override
  String toString() =>
      'CinacoinEvent.sessionRestored(accounts=$accounts, chainId=$chainId)';
}
