/**
 * Cinacoin iOS SDK — Core Cinacoin client class.
 *
 * Provides a simplified, unified entry point for native iOS applications
 * to connect wallets, sign messages, send transactions, and manage sessions.
 *
 * Internally coordinates:
 * - `WalletManager`     — wallet discovery, connection, session lifecycle
 * - `WCClient`          — WalletConnect v2 protocol (WCClient.swift)
 * - `SessionManager`    — in-memory session state tracking
 * - `EventEmitter`      — typed event bus for connection state changes
 * - `EVMAdapter`        — EVM chain RPC interactions
 * - `SolanaAdapter`     — Solana chain RPC interactions
 * - `SIWEAuth`          — Sign-In With Ethereum message generation
 *
 * ## Usage
 * ```swift
 * import Cinacoin
 *
 * let client = CinacoinClient(
 *     projectId: "YOUR_PROJECT_ID",
 *     metadata: AppMetadata(
 *         name: "My dApp",
 *         description: "An iOS dApp",
 *         url: "https://mydapp.com",
 *         icons: ["https://mydapp.com/icon.png"]
 *     )
 * )
 *
 * try await client.initialize()
 *
 * let result = try await client.connect(walletId: "metamask")
 * print("Connected accounts: \(result.accounts)")
 *
 * let signature = try await client.signMessage("Hello from iOS!")
 * try await client.disconnect()
 * ```
 */

import Foundation
import Combine

// MARK: - SDK Version

/// SDK version string.
public let CINA_VERSION = "0.1.0"

// MARK: - CinacoinClient

/// Top-level Cinacoin client facade for iOS.
///
/// Provides the primary API surface for Flutter and native iOS integrations.
/// Thread-safe (actors are Sendable). All public methods are `async` or
/// `async throws`.
///
/// ### Lifecycle
/// 1. **Construct** with `projectId` and `AppMetadata`.
/// 2. Call `initialize()` — sets up WalletConnect, restores sessions.
/// 3. Use `connect()`, `signMessage()`, `sendTransaction()`, `disconnect()`.
/// 4. Listen to the `events` publisher for real-time updates.
/// 5. Call `dispose()` on app teardown.
public final class CinacoinClient: ObservableObject, Sendable {

    // ── Configuration ──────────────────────────────────────────────────

    /// Cinacoin project ID.
    public let projectId: String

    /// App metadata for WalletConnect pairing.
    public let metadata: AppMetadata

    /// Override relay URL.
    public let relayUrl: String?

    /// Default chain namespace.
    public let namespace: String

    // ── Internal State ─────────────────────────────────────────────────

    private let _walletManager = WalletManager()
    private let _sessionManager = SessionManager()
    private let _eventEmitter = EventEmitter<CinacoinEvent>()
    private var _initialized = false
    private var _disposed = false
    private let _lock = NSRecursiveLock()

    // ── Public State (Published for Combine/SwiftUI) ───────────────────

    /// Current connection status (SwiftUI-friendly).
    @Published public private(set) var status: ConnectionStatus = .disconnected

    /// Connected accounts (SwiftUI-friendly).
    @Published public private(set) var accounts: [String] = []

    /// Active chain ID (SwiftUI-friendly).
    @Published public private(set) var chainId: Int = 1

    /// Whether a wallet is connected.
    public var isConnected: Bool { status == .connected }

    /// Current session topic.
    public var sessionTopic: String? { _sessionManager.sessionTopic }

    // ── Event Publisher ────────────────────────────────────────────────

    /// Combine publisher for Cinacoin events.
    public var events: AnyPublisher<CinacoinEvent, Never> {
        _eventEmitter.publisher
    }

    // ── Constructor ────────────────────────────────────────────────────

    /// Create a new Cinacoin client.
    ///
    /// - Parameters:
    ///   - projectId: Cinacoin / WalletConnect project identifier.
    ///   - metadata:  App metadata for wallet pairing proposals.
    ///   - relayUrl:  Optional relay WebSocket override.
    ///   - namespace: Default chain namespace (default `"eip155"`).
    public init(
        projectId: String,
        metadata: AppMetadata,
        relayUrl: String? = nil,
        namespace: String = "eip155"
    ) {
        self.projectId = projectId
        self.metadata = metadata
        self.relayUrl = relayUrl
        self.namespace = namespace
    }

    // ── Initialization ─────────────────────────────────────────────────

    /// Initialize the SDK. Must be called once before any other method.
    ///
    /// 1. Configures the WalletConnect v2 client.
    /// 2. Registers chain adapters.
    /// 3. Attempts session restoration from Keychain.
    /// 4. Sets up the event dispatch pipeline.
    public func initialize() async throws {
        try _guardNotDisposed()
        _lock.lock()
        defer { _lock.unlock() }
        guard !_initialized else { return }

        try await _walletManager.configure(
            projectId: projectId,
            metadata: metadata,
            relayUrl: relayUrl
        )

        // Forward wallet manager events → public event stream.
        _walletManager.onStatusChange = { [weak self] newStatus in
            self?._handleStatusChange(newStatus)
        }

        // Attempt session restoration.
        if let restored = await _walletManager.tryRestoreSession() {
            _sessionManager.setConnected(
                accounts: restored.accounts,
                chainId: restored.chainId,
                sessionId: restored.sessionId,
                connectorId: restored.connectorId
            )
            await MainActor.run {
                self.status = .connected
                self.accounts = restored.accounts
                self.chainId = restored.chainId
            }
            _eventEmitter.emit(.sessionRestored(
                accounts: restored.accounts,
                chainId: restored.chainId
            ))
        }

        _initialized = true
    }

    // ── Connection ─────────────────────────────────────────────────────

    /// Connect to a wallet.
    ///
    /// - Parameters:
    ///   - walletId: Connector identifier (e.g. `"metamask"`,
    ///               `"walletconnect"`, `"coinbase-wallet"`).
    ///   - chains:   Optional chain ID filter.
    /// - Returns: `ConnectionResult` with session info and accounts.
    public func connect(walletId: String, chains: [Int]? = nil) async throws -> ConnectionResult {
        try _guardInitialized()

        let result = try await _walletManager.connect(
            walletId: walletId,
            chains: chains
        )

        _sessionManager.setConnected(
            accounts: result.accounts,
            chainId: result.chainId,
            sessionId: result.sessionId,
            connectorId: result.connectorId
        )

        await MainActor.run {
            self.status = .connected
            self.accounts = result.accounts
            self.chainId = result.chainId
        }

        return result
    }

    /// Disconnect the active wallet session.
    public func disconnect() async {
        do {
            try _guardInitialized()
        } catch { return }

        await _walletManager.disconnect()
        _sessionManager.setDisconnected()

        await MainActor.run {
            self.status = .disconnected
            self.accounts = []
            self.chainId = 1
        }

        _eventEmitter.emit(.disconnected)
    }

    // ── Chain Switching ────────────────────────────────────────────────

    /// Switch the active chain.
    ///
    /// - Parameter chainId: Target chain ID.
    /// - Throws: If not connected or chain unsupported.
    public func switchChain(chainId: Int) async throws {
        try _guardInitialized()
        guard isConnected else {
            throw CinacoinError.notConnected
        }

        try await _walletManager.switchChain(chainId)
        _sessionManager.setChainId(chainId)

        await MainActor.run {
            self.chainId = chainId
        }

        _eventEmitter.emit(.chainChanged(chainId: chainId))
    }

    // ── Signing ────────────────────────────────────────────────────────

    /// Sign a raw message (EIP-191 `personal_sign`).
    ///
    /// - Parameter message: Plaintext message to sign.
    /// - Returns: Hex-encoded signature.
    public func signMessage(_ message: String) async throws -> String {
        try _guardInitialized()
        try _guardConnected()

        return try await _walletManager.signMessage(message)
    }

    /// Sign typed structured data (EIP-712).
    ///
    /// - Parameter typedData: JSON-encoded EIP-712 typed data.
    /// - Returns: Hex-encoded signature.
    public func signTypedData(_ typedData: String) async throws -> String {
        try _guardInitialized()
        try _guardConnected()

        return try await _walletManager.signTypedData(typedData)
    }

    // ── Transactions ───────────────────────────────────────────────────

    /// Send a transaction for signing and broadcasting.
    ///
    /// - Parameter tx: Transaction parameters.
    /// - Returns: Transaction hash.
    public func sendTransaction(_ tx: TransactionRequest) async throws -> String {
        try _guardInitialized()
        try _guardConnected()

        return try await _walletManager.sendTransaction(tx)
    }

    // ── Balance ────────────────────────────────────────────────────────

    /// Fetch the native token balance for the primary connected account.
    ///
    /// - Returns: Decimal string (e.g. `"1.234567"`).
    public func getBalance() async throws -> String {
        try _guardInitialized()
        try _guardConnected()

        guard let address = accounts.first else {
            throw CinacoinError.notConnected
        }
        return try await _walletManager.getBalance(address, chainId: chainId)
    }

    // ── SIWE ───────────────────────────────────────────────────────────

    /// Generate a Sign-In With Ethereum message.
    ///
    /// - Parameters:
    ///   - domain:    The dApp domain (e.g. `"mydapp.com"`).
    ///   - nonce:     Server-generated nonce for replay protection.
    ///   - uri:       Optional URI override.
    ///   - statement: Optional human-readable statement.
    /// - Returns: SIWE message string.
    public func generateSiweMessage(
        domain: String,
        nonce: String,
        uri: String? = nil,
        statement: String? = nil
    ) throws -> String {
        try _guardConnected()

        guard let address = accounts.first else {
            throw CinacoinError.notConnected
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let now = formatter.string(from: Date())

        var lines: [String] = []
        lines.append("\(domain) wants you to sign in with your Ethereum account:")
        lines.append(address)
        lines.append("")
        if let statement = statement {
            lines.append(statement)
            lines.append("")
        }
        lines.append("URI: \(uri ?? "https://\(domain)")")
        lines.append("Version: 1")
        lines.append("Chain ID: \(chainId)")
        lines.append("Nonce: \(nonce)")
        lines.append("Issued At: \(now)")

        return lines.joined(separator: "\n")
    }

    // ── Utilities ──────────────────────────────────────────────────────

    /// Get the WalletConnect pairing URI for QR display.
    public func getPairingUri() async throws -> String? {
        try _guardInitialized()
        return try await _walletManager.getPairingUri()
    }

    /// Check if a specific wallet is installed on the device.
    public func isWalletInstalled(_ walletId: String) async -> Bool {
        do { try _guardInitialized() } catch { return false }
        return await _walletManager.isWalletInstalled(walletId)
    }

    /// Get recommended wallets for the current namespace.
    public func getRecommendedWallets() -> [WalletInfo] {
        WalletRegistry.shared.getRecommended(for: namespace)
    }

    // ── Disposal ───────────────────────────────────────────────────────

    /// Dispose of the client and release resources.
    public func dispose() async {
        _lock.lock()
        defer { _lock.unlock() }
        guard !_disposed else { return }
        _disposed = true

        await _walletManager.dispose()
        _eventEmitter.removeAllListeners()
        _initialized = false
    }

    // ── Internal Event Handler ─────────────────────────────────────────

    private func _handleStatusChange(_ newStatus: ConnectionStatus) {
        switch newStatus {
        case .connected:
            if let session = _walletManager.currentSession {
                _sessionManager.setConnected(
                    accounts: session.accounts,
                    chainId: session.chainId,
                    sessionId: session.sessionId,
                    connectorId: session.connectorId
                )
                Task { @MainActor in
                    self.status = .connected
                    self.accounts = session.accounts
                    self.chainId = session.chainId
                }
                _eventEmitter.emit(.connected(
                    accounts: session.accounts,
                    chainId: session.chainId
                ))
            }
        case .disconnected:
            _sessionManager.setDisconnected()
            Task { @MainActor in
                self.status = .disconnected
                self.accounts = []
                self.chainId = 1
            }
            _eventEmitter.emit(.disconnected)
        case .connecting:
            _eventEmitter.emit(.connecting(
                connectorId: _walletManager.currentConnectorId ?? "unknown"
            ))
        case .error(let message):
            _eventEmitter.emit(.error(message: message))
        }
    }

    // ── Guards ─────────────────────────────────────────────────────────

    private func _guardInitialized() throws {
        guard _initialized else {
            throw CinacoinError.notInitialized
        }
        guard !_disposed else {
            throw CinacoinError.disposed
        }
    }

    private func _guardConnected() throws {
        guard isConnected else {
            throw CinacoinError.notConnected
        }
    }

    private func _guardNotDisposed() throws {
        guard !_disposed else {
            throw CinacoinError.disposed
        }
    }
}

// MARK: - SessionManager

/// In-memory session state tracker.
public final class SessionManager: @unchecked Sendable {

    private var _status: ConnectionStatus = .disconnected
    private var _accounts: [String] = []
    private var _chainId: Int = 1
    private(set) var sessionTopic: String?
    private(set) var sessionId: String?
    private(set) var connectorId: String?

    var status: ConnectionStatus { _status }
    var accounts: [String] { _accounts }
    var chainId: Int { _chainId }

    func setConnected(accounts: [String], chainId: Int, sessionId: String, connectorId: String) {
        _status = .connected
        _accounts = accounts
        _chainId = chainId
        self.sessionId = sessionId
        self.connectorId = connectorId
    }

    func setDisconnected() {
        _status = .disconnected
        _accounts = []
        _chainId = 1
        sessionTopic = nil
        sessionId = nil
        connectorId = nil
    }

    func setChainId(_ chainId: Int) {
        _chainId = chainId
    }
}

// MARK: - EventEmitter

/// Typed event emitter with Combine publisher support.
public final class EventEmitter<T>: @unchecked Sendable {

    private let _subject = PassthroughSubject<T, Never>()
    private var _listeners: [UUID: (T) -> Void] = [:]
    private let _lock = NSLock()

    var publisher: AnyPublisher<T, Never> { _subject.eraseToAnyPublisher() }

    /// Emit an event to all subscribers.
    public func emit(_ event: T) {
        _lock.lock()
        defer { _lock.unlock() }
        _subject.send(event)
        for handler in _listeners.values {
            handler(event)
        }
    }

    /// Subscribe with a closure callback.
    @discardableResult
    public func on(_ handler: @escaping (T) -> Void) -> UUID {
        let id = UUID()
        _lock.lock()
        _listeners[id] = handler
        _lock.unlock()
        return id
    }

    /// Unsubscribe by ID.
    public func off(_ id: UUID) {
        _lock.lock()
        _listeners.removeValue(forKey: id)
        _lock.unlock()
    }

    /// Remove all listeners.
    public func removeAllListeners() {
        _lock.lock()
        _listeners.removeAll()
        _lock.unlock()
    }
}

// MARK: - CinacoinEvent

/// Union type for all Cinacoin client events.
public enum CinacoinEvent: Sendable, Equatable {
    /// Wallet connected successfully.
    case connected(accounts: [String], chainId: Int)
    /// Connection attempt in progress.
    case connecting(connectorId: String)
    /// Wallet disconnected.
    case disconnected
    /// Active chain changed.
    case chainChanged(chainId: Int)
    /// Account list changed.
    case accountsChanged(accounts: [String])
    /// An error occurred.
    case error(message: String)
    /// Session restored from storage.
    case sessionRestored(accounts: [String], chainId: Int)

    public static func == (lhs: CinacoinEvent, rhs: CinacoinEvent) -> Bool {
        switch (lhs, rhs) {
        case (.connected(let la, let lc), .connected(let ra, let rc)):
            return la == ra && lc == rc
        case (.connecting(let l), .connecting(let r)):
            return l == r
        case (.disconnected, .disconnected):
            return true
        case (.chainChanged(let l), .chainChanged(let r)):
            return l == r
        case (.accountsChanged(let l), .accountsChanged(let r)):
            return l == r
        case (.error(let l), .error(let r)):
            return l == r
        case (.sessionRestored(let la, let lc), .sessionRestored(let ra, let rc)):
            return la == ra && lc == rc
        default:
            return false
        }
    }
}

// MARK: - Errors

/// Cinacoin-specific error cases.
public enum CinacoinError: Error, LocalizedError {
    case notInitialized
    case disposed
    case notConnected
    case chainNotSupported(Int)
    case walletNotFound(String)
    case connectionFailed(String)
    case userRejected

    public var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "CinacoinClient has not been initialized. Call initialize() first."
        case .disposed:
            return "CinacoinClient has been disposed. Create a new instance."
        case .notConnected:
            return "No wallet is currently connected."
        case let .chainNotSupported(id):
            return "Chain \(id) is not supported."
        case let .walletNotFound(id):
            return "Wallet '\(id)' not found on this device."
        case let .connectionFailed(msg):
            return "Connection failed: \(msg)"
        case .userRejected:
            return "User rejected the connection request."
        }
    }
}
