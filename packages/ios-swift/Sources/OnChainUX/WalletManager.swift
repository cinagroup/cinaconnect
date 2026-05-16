/**
 * WalletManager — manages wallet connections and session lifecycle.
 *
 * Handles wallet discovery, connection, disconnection, and state management.
 * Supports multiple connector types: injected, WalletConnect, Coinbase,
 * email, and social logins.
 *
 * ## Usage
 * ```swift
 * let manager = WalletManager()
 * manager.configure(with: config)
 *
 * let result = try await manager.connect(connectorId: "metamask")
 * print("Connected: \(result.account.address)")
 *
 * await manager.disconnect()
 * ```
 */

import Foundation

/// Result of a successful wallet connection.
public struct ConnectResult: Sendable {
    /// Connected account info.
    public let account: AccountInfo
    /// Connected chain ID.
    public let chainId: Int
    /// Session ID.
    public let sessionId: String
    
    public init(account: AccountInfo, chainId: Int, sessionId: String) {
        self.account = account
        self.chainId = chainId
        self.sessionId = sessionId
    }
}

/// Manages wallet connections and session state.
public final class WalletManager: ObservableObject {
    
    /// Currently connected account, if any.
    @Published public private(set) var connectedAccount: AccountInfo?
    
    /// Current connection status.
    @Published public private(set) var connectionStatus: ConnectionStatus = .disconnected
    
    /// Available connectors.
    @Published public private(set) var connectors: [ConnectorInfo] = []
    
    /// Active session ID.
    public private(set) var sessionId: String?
    
    private var config: OnChainUXConfig?
    
    // MARK: - Lifecycle
    
    /// Configure the wallet manager.
    /// - Parameter config: App configuration.
    public func configure(with config: OnChainUXConfig) {
        self.config = config
        connectors = buildDefaultConnectors(config: config)
    }
    
    /// Connect to a wallet by connector ID.
    /// - Parameter connectorId: The connector to use.
    /// - Returns: Connection result with account info.
    /// - Throws: OnChainUXError if connection fails.
    public func connect(connectorId: String) async throws -> ConnectResult {
        connectionStatus = .connecting
        
        // Check if this is a WalletConnect v2 wallet
        let isWcWallet = connectorId == "walletconnect" || connectorId == "metamask" ||
                         connectorId == "rainbow" || connectorId == "trust" ||
                         connectorId == "coinbase" || connectorId == "phantom" ||
                         connectorId == "zerion"
        
        if isWcWallet {
            return try await connectWithWalletConnect(connectorId: connectorId)
        }
        
        // Non-WC wallets: use mock flow (email, social, etc.)
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        guard let config = config else {
            throw OnChainUXError.notConfigured
        }
        
        let chainId = config.chains.first?.chainId ?? 1
        let symbol = config.chains.first?.nativeCurrency.symbol ?? "ETH"
        
        let account = AccountInfo(
            address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
            balance: "1.234",
            chainId: chainId,
            chainSymbol: symbol
        )
        
        let newSessionId = UUID().uuidString
        connectedAccount = account
        sessionId = newSessionId
        connectionStatus = .connected
        
        return ConnectResult(account: account, chainId: chainId, sessionId: newSessionId)
    }
    
    /// Connect using the WalletConnect v2 client.
    /// - Parameter connectorId: Wallet connector ID.
    /// - Returns: Connection result.
    private func connectWithWalletConnect(connectorId: String) async throws -> ConnectResult {
        guard let config = config else {
            throw OnChainUXError.notConfigured
        }
        
        guard let relayUrl = config.projectId.map({ "wss://relay.onchainux.io/v1?projectId=\($0)" }) else {
            // No relay configured — use mock
            try await Task.sleep(nanoseconds: 500_000_000)
            let chainId = config.chains.first?.chainId ?? 1
            let account = AccountInfo(
                address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
                balance: "1.234",
                chainId: chainId,
                chainSymbol: config.chains.first?.nativeCurrency.symbol ?? "ETH"
            )
            let newSessionId = UUID().uuidString
            connectedAccount = account
            sessionId = newSessionId
            connectionStatus = .connected
            return ConnectResult(account: account, chainId: chainId, sessionId: newSessionId)
        }
        
        let wcClient = WCClient.shared
        wcClient.configure(
            relayUrl: relayUrl,
            projectId: config.projectId ?? "",
            metadata: config.metadata ?? .init(name: "", description: "", url: "", icons: []),
            chains: config.chains.map { "eip155:\($0.chainId)" }
        )
        
        // Create pairing and get URI
        let uri = try await wcClient.createPairing()
        
        // Open wallet with deep link
        if let deepLink = DeepLinkHandler.walletConfigs[connectorId] {
            let deepLinkUrl = "\(deepLink.scheme)wc?uri=\(uri.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? uri)"
            if let url = URL(string: deepLinkUrl), UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
            } else if let universalUrl = deepLink.universalDomain {
                let universalLink = "https://\(universalUrl)/wc?uri=\(uri.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? uri)"
                if let url = URL(string: universalLink) {
                    UIApplication.shared.open(url)
                }
            }
        }
        
        // Wait for session (handled by event listener in OnChainUX)
        return try await withCheckedThrowingContinuation { continuation in
            let eventId = wcClient.onEvent { event in
                switch event {
                case .connected(let session):
                    wcClient.unsubscribe(eventId)
                    let chainId = session.accounts.first.flatMap { extractChainId(from: $0) } ?? config.chains.first?.chainId ?? 1
                    let account = AccountInfo(
                        address: session.accounts.first.flatMap { extractAddress(from: $0) } ?? "",
                        balance: "0.00",
                        chainId: chainId,
                        chainSymbol: config.chains.first(where: { $0.chainId == chainId })?.nativeCurrency.symbol ?? "ETH"
                    )
                    self.connectedAccount = account
                    self.sessionId = session.topic
                    self.connectionStatus = .connected
                    continuation.resume(returning: ConnectResult(account: account, chainId: chainId, sessionId: session.topic))
                case .error(let error):
                    wcClient.unsubscribe(eventId)
                    self.connectionStatus = .error(error.localizedDescription)
                    continuation.resume(throwing: OnChainUXError.connectionFailed(error.localizedDescription))
                default:
                    break
                }
            }
            
            // 5-minute timeout
            Task {
                try? await Task.sleep(nanoseconds: 300_000_000_000)
                if self.connectionStatus == .connecting {
                    wcClient.unsubscribe(eventId)
                    continuation.resume(throwing: OnChainUXError.connectionFailed("Session establishment timed out"))
                }
            }
        }
    }
    
    /// Extract chain ID from a CAIP-2 chain string.
    private func extractChainId(from caip2: String) -> Int? {
        let parts = caip2.split(separator: ":")
        return parts.count >= 2 ? Int(parts[1]) : nil
    }
    
    /// Extract address from a CAIP-10 account string.
    private func extractAddress(from caip10: String) -> String? {
        let parts = caip10.split(separator: ":")
        return parts.count >= 3 ? String(parts[2]) : nil
    }
    
    /// Disconnect from the current wallet.
    public func disconnect() async {
        connectedAccount = nil
        sessionId = nil
        connectionStatus = .disconnected
    }
    
    /// Get the list of available connectors.
    /// - Returns: Array of connector info.
    public func getConnectors() -> [ConnectorInfo] {
        connectors
    }
    
    /// Check if a specific wallet app is installed (via URL scheme).
    /// - Parameter walletId: Wallet identifier.
    /// - Returns: Whether the wallet app appears to be installed.
    public func isWalletInstalled(walletId: String) -> Bool {
        guard let scheme = urlScheme(for: walletId) else { return false }
        guard let url = URL(string: scheme) else { return false }
        return UIApplication.shared.canOpenURL(url)
    }
    
    /// Switch to a different chain.
    /// - Parameter chainId: Target chain ID.
    public func switchChain(chainId: Int) async throws {
        guard let config = config else {
            throw OnChainUXError.notConfigured
        }
        guard config.chains.contains(where: { $0.chainId == chainId }) else {
            throw OnChainUXError.chainNotSupported(chainId)
        }
        
        // In production: send wallet_switchEthereumChain request to connected wallet
        if var account = connectedAccount {
            // Update chain symbol
            if let chain = config.chains.first(where: { $0.chainId == chainId }) {
                account = AccountInfo(
                    address: account.address,
                    balance: account.balance,
                    chainId: chainId,
                    chainSymbol: chain.nativeCurrency.symbol,
                    ensName: account.ensName
                )
                connectedAccount = account
            }
        }
    }
    
    // MARK: - Private
    
    private func buildDefaultConnectors(config: OnChainUXConfig) -> [ConnectorInfo] {
        var list: [ConnectorInfo] = [
            ConnectorInfo(id: "metamask", name: "MetaMask", type: .walletconnect),
            ConnectorInfo(id: "walletconnect", name: "WalletConnect", type: .walletconnect),
            ConnectorInfo(id: "coinbase", name: "Coinbase Wallet", type: .coinbase),
            ConnectorInfo(id: "email", name: "Email", type: .email),
        ]
        return list
    }
    
    private func urlScheme(for walletId: String) -> String? {
        switch walletId {
        case "metamask": return "metamask://"
        case "coinbase", "cbwallet": return "cbwallet://"
        case "rainbow": return "rainbow://"
        case "trust": return "trust://"
        case "rabby": return "rabby://"
        case "phantom": return "phantom://"
        default: return nil
        }
    }
}
