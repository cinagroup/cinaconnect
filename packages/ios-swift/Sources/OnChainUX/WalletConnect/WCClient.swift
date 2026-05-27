/**
 * WCClient — WalletConnect v2 client for iOS using WalletConnectSwiftV2 SDK.
 *
 * Provides a native Swift implementation of the WalletConnect v2 protocol:
 * - Pairing URI generation for QR display
 * - Session proposal and establishment via WalletConnectSwiftV2
 * - X25519 key exchange (handled by SDK)
 * - Relay connection (Waku, handled by SDK)
 * - JSON-RPC dispatch (eth_sendTransaction, personal_sign, etc.)
 * - SIWE signing flow
 * - Balance fetching via on-chain RPC
 *
 * Uses the official WalletConnectSwiftV2 SDK via SPM.
 */

import Foundation
import Combine
import WalletConnect

// MARK: - WCClient

/// WalletConnect v2 client wrapping the official WalletConnectSwiftV2 SDK.
public final class WCClient: ObservableObject {
    
    /// Shared singleton instance.
    public static let shared = WCClient()
    
    // MARK: - Published State
    
    /// Current connection status.
    @Published public private(set) var status: WCStatus = .disconnected
    
    /// Active pairing URI for QR display.
    @Published public private(set) var pairingUri: String?
    
    /// Active session topic.
    @Published public private(set) var sessionTopic: String?
    
    /// Connected account addresses (CAIP-10).
    @Published public private(set) var accounts: [String] = []
    
    /// Connected chain ID.
    @Published public private(set) var chainId: Int = 1
    
    /// Peer wallet metadata.
    @Published public private(set) var peerMetadata: [String: String] = [:]
    
    // MARK: - Configuration
    
    /// WalletConnect projectId (from WalletConnect Cloud).
    public var projectId: String
    
    /// App metadata for session proposals.
    public var metadata: AppMetadata
    
    /// Required chains (CAIP-2 format, e.g. "eip155:1").
    public var requiredChains: [String]
    
    /// Required methods.
    public var requiredMethods: [String]
    
    /// Required events.
    public var requiredEvents: [String]
    
    // MARK: - Internal WalletConnectSwiftV2 References
    
    /// The NetworkingInteractor from the SDK.
    internal var networking: NetworkingInteractor?
    
    /// The Sign client for session management.
    internal var signClient: Sign?
    
    /// The Pairing client.
    internal var pairingClient: Pair?
    
    /// Combine cancellables.
    internal var cancellables = Set<AnyCancellable>()
    
    /// Event handlers.
    private var eventHandlers: [UUID: (WCEvent) -> Void] = [:]
    
    /// Pending request callbacks.
    private var pendingRequests: [UInt64: CheckedContinuation<Any, Error>] = [:]
    
    /// Next JSON-RPC request ID.
    private var nextRequestId: UInt64 = 1
    
    private init(
        projectId: String = "",
        metadata: AppMetadata = .default,
        requiredChains: [String] = ["eip155:1"],
        requiredMethods: [String] = WCMethods.standardEvmMethods,
        requiredEvents: [String] = WCEvents.standardEvmEvents
    ) {
        self.projectId = projectId
        self.metadata = metadata
        self.requiredChains = requiredChains
        self.requiredMethods = requiredMethods
        self.requiredEvents = requiredEvents
    }
    
    // MARK: - Configuration
    
    /// Configure the WC client with app settings.
    public func configure(
        projectId: String,
        metadata: AppMetadata = .default,
        chains: [String] = ["eip155:1"]
    ) {
        self.projectId = projectId
        self.metadata = metadata
        self.requiredChains = chains
    }
    
    // MARK: - SDK Initialization
    
    /// Initialize the WalletConnectSwiftV2 SDK internals.
    /// Call this once at app launch before any WC operations.
    public func initializeSDK(
        metadata: AppMetadata,
        projectId: String,
        isController: Bool = true
    ) {
        // Configure the SDK's NetworkingInteractor
        let networking = NetworkingInteractor.configure(
            projectId: projectId,
            socketFactory: DefaultSocketFactory()
        )
        self.networking = networking
        
        // Configure Pairing client
        self.pairingClient = Pair.configure(networking: networking)
        
        // Configure Sign client
        self.signClient = Sign.configure(
            networking: networking,
            keyValueStorage: KeyValueStorageUserDefaults.standard
        )
        
        // Listen for session proposals (wallet-side; dApp side may use different flow)
        signClient?.sessionProposalPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] proposal in
                self?.handleSessionProposal(proposal)
            }
            .store(in: &cancellables)
        
        // Listen for session requests
        signClient?.sessionRequestPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] request in
                self?.handleSessionRequest(request)
            }
            .store(in: &cancellables)
        
        // Listen for session state changes
        signClient?.sessionDeletePublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.sessionTopic = nil
                self?.accounts = []
                self?.status = .disconnected
                self?.emit(.disconnected)
            }
            .store(in: &cancellables)
        
        self.metadata = metadata
        self.projectId = projectId
    }
    
    // MARK: - Pairing
    
    /// Create a new pairing and generate a WC v2 URI for QR display.
    public func createPairing() async throws -> String {
        guard let pairing = pairingClient else {
            throw WCError.notConfigured
        }
        
        let uri = try await pairing.create()
        self.pairingUri = uri.absoluteString
        status = .pairing
        
        return uri.absoluteString
    }
    
    /// Connect using an existing WC v2 URI (e.g., from QR scan).
    public func connect(uri: String) async throws -> WCSession {
        guard let pairing = pairingClient else {
            throw WCError.notConfigured
        }
        
        status = .connecting
        
        // Pair with the URI
        let pairingInfo = try await pairing.pair(uri: uri)
        
        // Wait for session to be established
        return try await waitForSession(topic: pairingInfo.topic)
    }
    
    /// Disconnect the current session.
    public func disconnect() async {
        guard let sign = signClient, let topic = sessionTopic else { return }
        
        try? await sign.disconnect(
            topic: topic,
            reason: .userDisconnected
        )
        
        sessionTopic = nil
        accounts = []
        pairingUri = nil
        peerMetadata = [:]
        status = .disconnected
        emit(.disconnected)
    }
    
    // MARK: - Session Management
    
    /// Handle an incoming session proposal (wallet side).
    private func handleSessionProposal(_ proposal: Session.Proposal) {
        Task {
            do {
                guard let sign = signClient else { return }
                
                let namespaces: [String: SessionNamespace] = [
                    "eip155": SessionNamespace(
                        accounts: requiredChains.map { chain in
                            "\(chain):0x0000000000000000000000000000000000000000"
                        },
                        methods: requiredMethods,
                        events: requiredEvents
                    )
                ]
                
                let session = try await sign.approve(
                    proposalId: proposal.id,
                    namespaces: namespaces
                )
                
                sessionTopic = session.topic
                status = .connected
                emit(.connected(session: WCSession(topic: session.topic)))
            } catch {
                status = .error(error.localizedDescription)
                emit(.error(WCError.relayError(error.localizedDescription)))
            }
        }
    }
    
    /// Handle an incoming session request.
    private func handleSessionRequest(_ request: Request) {
        print("[WCClient] Received session request: \(request.method)")
    }
    
    /// Wait for session establishment after pairing.
    private func waitForSession(topic: String) async throws -> WCSession {
        try await withCheckedThrowingContinuation { continuation in
            guard let sign = signClient else {
                continuation.resume(throwing: WCError.notConfigured)
                return
            }
            
            sign.sessionSettlePublisher
                .receive(on: DispatchQueue.main)
                .first { $0.topic == topic }
                .sink { session in
                    self.sessionTopic = session.topic
                    
                    var sessionAccounts: [String] = []
                    for namespace in session.namespaces.values {
                        sessionAccounts.append(
                            contentsOf: namespace.accounts.map { $0.absoluteString }
                        )
                    }
                    
                    self.accounts = sessionAccounts
                    if let first = sessionAccounts.first {
                        let parts = first.split(separator: ":")
                        if parts.count >= 2, let cid = Int(parts[1]) {
                            self.chainId = cid
                        }
                    }
                    
                    self.status = .connected
                    self.emit(.connected(
                        session: WCSession(topic: topic, accounts: sessionAccounts)
                    ))
                    
                    continuation.resume(returning: WCSession(
                        topic: topic,
                        accounts: sessionAccounts
                    ))
                }
                .store(in: &self.cancellables)
            
            // 5-minute timeout
            Task {
                try? await Task.sleep(nanoseconds: 300_000_000_000)
                if self.sessionTopic != topic {
                    continuation.resume(throwing: WCError.sessionTimeout)
                }
            }
        }
    }
    
    // MARK: - JSON-RPC Requests
    
    /// Send a JSON-RPC request to the connected wallet.
    public func request<T: Decodable>(method: String, params: Any) async throws -> T {
        guard let sign = signClient, let topic = sessionTopic else {
            throw WCError.notConnected
        }
        
        let request = Request(
            topic: topic,
            method: method,
            params: params,
            chainId: Blockchain("eip155:\(chainId)")!
        )
        
        return try await sign.request(params: request)
    }
    
    /// Convenience: send eth_sendTransaction.
    public func sendTransaction(_ tx: WCTransactionRequest) async throws -> String {
        let params: [[String: String]] = [[
            "from": tx.from,
            "to": tx.to,
            "value": tx.value ?? "0x0",
            "data": tx.data ?? "0x",
            "gas": tx.gas ?? "0x5208",
        ].compactMapValues { $0 }]
        return try await request(method: WCMethods.ethSendTransaction, params: params)
    }
    
    /// Convenience: send personal_sign.
    public func personalSign(message: String, address: String) async throws -> String {
        let hexMessage = message.hasPrefix("0x") ? message : message.utf8Hex
        return try await request(
            method: WCMethods.personalSign,
            params: [hexMessage, address]
        )
    }
    
    /// Convenience: send eth_signTypedData_v4 (EIP-712).
    public func signTypedData(address: String, typedData: String) async throws -> String {
        try await request(
            method: WCMethods.ethSignTypedDataV4,
            params: [address, typedData]
        )
    }
    
    /// Convenience: switch chain.
    public func switchChain(chainId: Int) async throws {
        let hexChainId = "0x" + String(chainId, radix: 16)
        try await request(
            method: WCMethods.walletSwitchEthereumChain,
            params: [["chainId": hexChainId]]
        )
    }
    
    // MARK: - Balance Fetching
    
    /// Fetch the native balance for the connected account via eth_getBalance.
    public func fetchBalance() async throws -> String {
        guard !accounts.isEmpty else {
            throw WCError.notConnected
        }
        
        let address = accounts[0].split(separator: ":").last.map(String.init) ?? accounts[0]
        
        let balanceHex: String = try await request(
            method: "eth_getBalance",
            params: [address, "latest"]
        )
        
        // Convert hex wei to decimal ETH
        let cleaned = balanceHex.replacingOccurrences(of: "0x", with: "")
        if let wei = BigInt(cleaned, radix: 16) {
            let ethWei = Decimal(wei.magnitude)
            let eth = ethWei / Decimal(10).power(18)
            return String(format: "%.4f", (eth as NSDecimalNumber).doubleValue)
        }
        
        return "0.0000"
    }
    
    // MARK: - Events
    
    /// Subscribe to WC client events.
    public func onEvent(_ handler: @escaping (WCEvent) -> Void) -> UUID {
        let id = UUID()
        eventHandlers[id] = handler
        return id
    }
    
    /// Unsubscribe from events.
    public func unsubscribe(_ id: UUID) {
        eventHandlers.removeValue(forKey: id)
    }
    
    /// Emit an event to all handlers.
    private func emit(_ event: WCEvent) {
        for handler in eventHandlers.values {
            handler(event)
        }
    }
}

// MARK: - Types

/// WC client connection status.
public enum WCStatus: Equatable {
    case disconnected
    case connecting
    case pairing
    case connected
    case error(String)
    
    public static func == (lhs: WCStatus, rhs: WCStatus) -> Bool {
        switch (lhs, rhs) {
        case (.disconnected, .disconnected): return true
        case (.connecting, .connecting): return true
        case (.pairing, .pairing): return true
        case (.connected, .connected): return true
        case let (.error(l), .error(r)): return l == r
        default: return false
        }
    }
}

/// WC v2 session data.
public struct WCSession: Sendable {
    public let topic: String
    public let peerMetadata: [String: Any]
    public let accounts: [String]
    public let namespaces: [String: Any]
    public let relay: [String: Any]
    
    public init(
        topic: String,
        peerMetadata: [String: Any] = [:],
        accounts: [String] = [],
        namespaces: [String: Any] = [:],
        relay: [String: Any] = [:]
    ) {
        self.topic = topic
        self.peerMetadata = peerMetadata
        self.accounts = accounts
        self.namespaces = namespaces
        self.relay = relay
    }
}

/// Application metadata for WC session proposals.
public struct WCAppMetadata: Sendable {
    public let name: String
    public let description: String
    public let url: String
    public let icons: [String]
    
    public init(name: String, description: String, url: String, icons: [String]) {
        self.name = name
        self.description = description
        self.url = url
        self.icons = icons
    }
    
    public static let `default` = WCAppMetadata(
        name: "Cinacoin dApp",
        description: "Connected via Cinacoin",
        url: "https://cinacoin.io",
        icons: ["https://cinacoin.io/icon.png"]
    )
}

/// Transaction request for eth_sendTransaction.
public struct WCTransactionRequest: Sendable {
    public let from: String
    public let to: String
    public let value: String?
    public let data: String?
    public let gas: String?
    public let gasPrice: String?
    public let maxFeePerGas: String?
    public let maxPriorityFeePerGas: String?
    public let nonce: String?
    public let chainId: Int?
    
    public init(
        from: String,
        to: String,
        value: String? = nil,
        data: String? = nil,
        gas: String? = nil,
        gasPrice: String? = nil,
        maxFeePerGas: String? = nil,
        maxPriorityFeePerGas: String? = nil,
        nonce: String? = nil,
        chainId: Int? = nil
    ) {
        self.from = from
        self.to = to
        self.value = value
        self.data = data
        self.gas = gas
        self.gasPrice = gasPrice
        self.maxFeePerGas = maxFeePerGas
        self.maxPriorityFeePerGas = maxPriorityFeePerGas
        self.nonce = nonce
        self.chainId = chainId
    }
}

/// WC client events.
public enum WCEvent {
    case pairingCreated(uri: String)
    case sessionProposal([String: Any])
    case connected(session: WCSession)
    case sessionUpdate(session: WCSession?)
    case disconnected
    case error(WCError)
}

/// WC-specific errors.
public enum WCError: Error, LocalizedError {
    case notConnected
    case notConfigured
    case invalidUrl(String)
    case invalidUri(String)
    case sessionTimeout
    case requestTimeout(String)
    case rpcError(Int, String)
    case invalidProposalResponse
    case relayError(String)
    case cryptoError(String)
    
    public var errorDescription: String? {
        switch self {
        case .notConnected: return "Not connected to a wallet"
        case .notConfigured: return "WCClient has not been configured"
        case let .invalidUrl(url): return "Invalid relay URL: \(url)"
        case let .invalidUri(uri): return "Invalid WalletConnect URI: \(uri)"
        case .sessionTimeout: return "Session establishment timed out"
        case let .requestTimeout(method): return "Request '\(method)' timed out"
        case let .rpcError(code, message): return "RPC error \(code): \(message)"
        case .invalidProposalResponse: return "Invalid session proposal response"
        case let .relayError(msg): return "Relay error: \(msg)"
        case let .cryptoError(msg): return "Crypto error: \(msg)"
        }
    }
}

// MARK: - Standard Methods & Events

/// Standard WC v2 methods for EVM chains.
public enum WCMethods {
    public static let ethSendTransaction = "eth_sendTransaction"
    public static let ethSignTransaction = "eth_signTransaction"
    public static let personalSign = "personal_sign"
    public static let ethSignTypedData = "eth_signTypedData"
    public static let ethSignTypedDataV4 = "eth_signTypedData_v4"
    public static let walletSwitchEthereumChain = "wallet_switchEthereumChain"
    public static let walletAddEthereumChain = "wallet_addEthereumChain"
    public static let ethAccounts = "eth_accounts"
    public static let ethChainId = "eth_chainId"
    
    public static let standardEvmMethods: [String] = [
        ethSendTransaction, ethSignTransaction, personalSign,
        ethSignTypedData, ethSignTypedDataV4,
        walletSwitchEthereumChain, walletAddEthereumChain,
        ethAccounts, ethChainId
    ]
}

/// Standard WC v2 events for EVM chains.
public enum WCEvents {
    public static let chainChanged = "chainChanged"
    public static let accountsChanged = "accountsChanged"
    public static let standardEvmEvents: [String] = [chainChanged, accountsChanged]
}

// MARK: - BigInt Helper

struct BigInt: Equatable {
    let magnitude: UInt64
    
    init?(_ string: String, radix: Int) {
        guard radix == 16 else { return nil }
        let cleaned = string.replacingOccurrences(of: "0x", with: "")
        guard let val = UInt64(cleaned, radix: 16) else { return nil }
        self.magnitude = val
    }
}

// MARK: - String Extensions

extension String {
    var urlEncoded: String {
        addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? self
    }
    
    var utf8Hex: String {
        "0x" + self.utf8.map { String(format: "%02x", $0) }.joined()
    }
}
