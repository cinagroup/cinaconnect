/**
 * Cinacoin iOS SDK — Main module.
 *
 * Provides the core `Cinacoin` class that manages wallet connections,
 * chain state, and theme configuration for native iOS applications.
 *
 * ## Usage
 * ```swift
 * import Cinacoin
 *
 * let config = CinacoinConfig(
 *     projectId: "your-project-id",
 *     chains: [.ethereum, .polygon, .arbitrum],
 *     metadata: AppMetadata(
 *         name: "My App",
 *         description: "A great dApp",
 *         url: "https://myapp.com",
 *         icons: ["https://myapp.com/icon.png"]
 *     )
 * )
 *
 * Cinacoin.shared.configure(with: config)
 * ```
 *
 * ## Architecture
 * - `Cinacoin` — Central manager (singleton) for configuration and state
 * - `WalletManager` — Wallet discovery, connection, and session lifecycle
 * - `ConnectButton` — SwiftUI button component
 * - `ConnectModal` — SwiftUI modal component
 * - `DeepLinkHandler` — Universal link & scheme-based wallet redirects
 * - `PushNotificationHandler` — APNs integration for wallet notifications
 * - `EVMChainAdapter` / `SolanaChainAdapter` — Chain-specific RPC adapters
 * - `SIWEAuth` — Sign-In With Ethereum authentication
 */

import Foundation

// MARK: - SDK Version

/// SDK version string.
public let ONCHAINUX_VERSION = "0.1.0"

// MARK: - Cinacoin

/// Central Cinacoin manager. Configured once at app launch, provides
/// access to wallet connection state, chain information, and theme settings.
public final class Cinacoin: ObservableObject {
    
    /// Shared singleton instance.
    public static let shared = Cinacoin()
    
    /// Current connection status.
    @Published public private(set) var status: ConnectionStatus = .disconnected
    
    /// Connected account information.
    @Published public private(set) var account: AccountInfo?
    
    /// Active chain ID.
    @Published public private(set) var activeChainId: Int = 1
    
    /// Current theme mode.
    @Published public var themeMode: ThemeMode = .dark {
        didSet { updateColors() }
    }
    
    /// Resolved theme colors.
    @Published public private(set) var themeColors: ThemeColors = .dark
    
    /// Configuration provided by the app.
    public private(set) var config: CinacoinConfig?
    
    /// Wallet manager for connection operations.
    public let walletManager = WalletManager()
    
    /// Deep link handler for wallet redirects.
    public let deepLinkHandler = DeepLinkHandler()
    
    /// Push notification handler for APNs integration.
    public let pushNotificationHandler = PushNotificationHandler()
    
    private init() {}
    
    /// Configure Cinacoin with app-specific settings.
    /// - Parameter config: The configuration to apply.
    public func configure(with config: CinacoinConfig) {
        self.config = config
        self.themeMode = config.themeMode
        activeChainId = config.chains.first?.chainId ?? 1
        walletManager.configure(with: config)
        deepLinkHandler.configure(with: config)
    }
    
    /// Connect to a wallet using the specified connector ID.
    /// - Parameter connectorId: The connector to use (e.g., "metamask", "walletconnect").
    public func connect(connectorId: String) async throws {
        status = .connecting
        do {
            let result = try await walletManager.connect(connectorId: connectorId)
            account = result.account
            activeChainId = result.chainId
            status = .connected
        } catch {
            status = .error(error.localizedDescription)
            throw error
        }
    }
    
    /// Disconnect from the current wallet.
    public func disconnect() async {
        await walletManager.disconnect()
        account = nil
        status = .disconnected
    }
    
    /// Switch to a different chain.
    /// - Parameter chainId: Target chain ID.
    public func switchChain(chainId: Int) async throws {
        guard let config = config else {
            throw CinacoinError.notConfigured
        }
        guard config.chains.contains(where: { $0.chainId == chainId }) else {
            throw CinacoinError.chainNotSupported(chainId)
        }
        activeChainId = chainId
    }
    
    /// Get the list of available connectors.
    /// - Returns: Array of available wallet connectors.
    public func getConnectors() -> [ConnectorInfo] {
        walletManager.getConnectors()
    }
    
    private func updateColors() {
        themeColors = ThemeColors(mode: themeMode)
    }
}

// MARK: - Configuration

/// Configuration passed to Cinacoin at startup.
public struct CinacoinConfig: Sendable {
    /// Optional project ID for Relay/RPC services.
    public var projectId: String?
    /// Supported chains.
    public var chains: [ChainConfig]
    /// Theme mode preference.
    public var themeMode: ThemeMode = .dark
    /// App metadata for WalletConnect pairing.
    public var metadata: AppMetadata?
    /// Recommended wallet IDs to show first.
    public var recommendedWallets: [String] = []
    
    public init(
        projectId: String? = nil,
        chains: [ChainConfig],
        themeMode: ThemeMode = .dark,
        metadata: AppMetadata? = nil,
        recommendedWallets: [String] = []
    ) {
        self.projectId = projectId
        self.chains = chains
        self.themeMode = themeMode
        self.metadata = metadata
        self.recommendedWallets = recommendedWallets
    }
}

/// Chain configuration.
public struct ChainConfig: Sendable, Identifiable, Hashable {
    public let chainId: Int
    public let name: String
    public let rpcUrl: String
    public let nativeCurrency: NativeCurrency
    public let blockExplorerUrl: String?
    public let iconUrl: String?
    public let testnet: Bool
    
    public var id: Int { chainId }
    
    public init(
        chainId: Int,
        name: String,
        rpcUrl: String,
        nativeCurrency: NativeCurrency,
        blockExplorerUrl: String? = nil,
        iconUrl: String? = nil,
        testnet: Bool = false
    ) {
        self.chainId = chainId
        self.name = name
        self.rpcUrl = rpcUrl
        self.nativeCurrency = nativeCurrency
        self.blockExplorerUrl = blockExplorerUrl
        self.iconUrl = iconUrl
        self.testnet = testnet
    }
    
    /// Ethereum Mainnet preset.
    public static let ethereum = ChainConfig(
        chainId: 1, name: "Ethereum", rpcUrl: "https://eth.llamarpc.com",
        nativeCurrency: .eth, blockExplorerUrl: "https://etherscan.io"
    )
    
    /// Polygon Mainnet preset.
    public static let polygon = ChainConfig(
        chainId: 137, name: "Polygon", rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: NativeCurrency(name: "MATIC", symbol: "MATIC", decimals: 18),
        blockExplorerUrl: "https://polygonscan.com"
    )
    
    /// Arbitrum One preset.
    public static let arbitrum = ChainConfig(
        chainId: 42161, name: "Arbitrum", rpcUrl: "https://arb1.arbitrum.io/rpc",
        nativeCurrency: .eth, blockExplorerUrl: "https://arbiscan.io"
    )
}

/// Native currency info.
public struct NativeCurrency: Sendable, Hashable {
    public let name: String
    public let symbol: String
    public let decimals: Int
    
    public init(name: String, symbol: String, decimals: Int) {
        self.name = name
        self.symbol = symbol
        self.decimals = decimals
    }
    
    /// Ethereum / ETH.
    public static let eth = NativeCurrency(name: "Ether", symbol: "ETH", decimals: 18)
}

/// Application metadata for WalletConnect.
public struct AppMetadata: Sendable {
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
}

// MARK: - Connection State

/// Connection status enumeration.
public enum ConnectionStatus: Equatable {
    case disconnected
    case connecting
    case connected
    case error(String)
    
    public static func == (lhs: ConnectionStatus, rhs: ConnectionStatus) -> Bool {
        switch (lhs, rhs) {
        case (.disconnected, .disconnected): return true
        case (.connecting, .connecting): return true
        case (.connected, .connected): return true
        case let (.error(l), .error(r)): return l == r
        default: return false
        }
    }
}

/// Connected account information.
public struct AccountInfo: Sendable {
    public let address: String
    public let balance: String
    public let chainId: Int
    public let chainSymbol: String
    public let ensName: String?
    
    public init(address: String, balance: String, chainId: Int, chainSymbol: String, ensName: String? = nil) {
        self.address = address
        self.balance = balance
        self.chainId = chainId
        self.chainSymbol = chainSymbol
        self.ensName = ensName
    }
}

/// Wallet connector info.
public struct ConnectorInfo: Sendable, Identifiable {
    public let id: String
    public let name: String
    public let iconUrl: String?
    public let type: ConnectorType
    
    public var identifier: String { id }
    
    public init(id: String, name: String, iconUrl: String? = nil, type: ConnectorType) {
        self.id = id
        self.name = name
        self.iconUrl = iconUrl
        self.type = type
    }
}

/// Connector type.
public enum ConnectorType: String, Sendable {
    case injected
    case walletconnect
    case coinbase
    case email
    case social
}

// MARK: - Theme

/// Theme mode.
public enum ThemeMode: String, CaseIterable {
    case dark
    case light
    case minimal
}

/// Theme color tokens.
public struct ThemeColors: Sendable {
    public let accent500: String
    public let accentGlow: String
    public let bgPrimary: String
    public let bgSecondary: String
    public let bgCard: String
    public let bgCardHover: String
    public let textPrimary: String
    public let textSecondary: String
    public let textTertiary: String
    public let border: String
    public let success: String
    public let warning: String
    public let error: String
    
    public init(mode: ThemeMode) {
        switch mode {
        case .dark:
            self.accent500 = "#3B82F6"
            self.accentGlow = "rgba(59, 130, 246, 0.3)"
            self.bgPrimary = "#0F172A"
            self.bgSecondary = "#111827"
            self.bgCard = "#1E293B"
            self.bgCardHover = "#334155"
            self.textPrimary = "#F8FAFC"
            self.textSecondary = "#94A3B8"
            self.textTertiary = "#64748B"
            self.border = "#334155"
            self.success = "#22C55E"
            self.warning = "#EAB308"
            self.error = "#EF4444"
        case .light:
            self.accent500 = "#2563EB"
            self.accentGlow = "rgba(37, 99, 235, 0.15)"
            self.bgPrimary = "#FFFFFF"
            self.bgSecondary = "#F8FAFC"
            self.bgCard = "#F8FAFC"
            self.bgCardHover = "#F1F5F9"
            self.textPrimary = "#0F172A"
            self.textSecondary = "#64748B"
            self.textTertiary = "#94A3B8"
            self.border = "#E2E8F0"
            self.success = "#16A34A"
            self.warning = "#CA8A04"
            self.error = "#DC2626"
        case .minimal:
            self.accent500 = "#94A3B8"
            self.accentGlow = "transparent"
            self.bgPrimary = "#000000"
            self.bgSecondary = "#0A0A0A"
            self.bgCard = "#0A0A0A"
            self.bgCardHover = "#171717"
            self.textPrimary = "#FAFAFA"
            self.textSecondary = "#A3A3A3"
            self.textTertiary = "#737373"
            self.border = "#262626"
            self.success = "#4ADE80"
            self.warning = "#FACC15"
            self.error = "#F87171"
        }
    }
    
    public static let dark = ThemeColors(mode: .dark)
    public static let light = ThemeColors(mode: .light)
    public static let minimal = ThemeColors(mode: .minimal)
}

// MARK: - Transaction

/// Transaction request for signing.
public struct TransactionRequest: Sendable {
    public let from: String
    public let to: String
    public let value: String?      // hex
    public let data: String?       // hex
    public let gas: String?        // hex
    public let gasPrice: String?   // hex
    public let maxFeePerGas: String?
    public let maxPriorityFeePerGas: String?
    public let nonce: String?      // hex
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

// MARK: - Errors

/// Cinacoin-specific errors.
public enum CinacoinError: Error, LocalizedError {
    case notConfigured
    case chainNotSupported(Int)
    case walletNotFound(String)
    case connectionFailed(String)
    case userRejected
    case invalidAddress(String)
    
    public var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Cinacoin has not been configured. Call Cinacoin.shared.configure(with:) first."
        case let .chainNotSupported(id):
            return "Chain \(id) is not supported."
        case let .walletNotFound(id):
            return "Wallet '\(id)' not found."
        case let .connectionFailed(msg):
            return "Connection failed: \(msg)"
        case .userRejected:
            return "User rejected the connection."
        case let .invalidAddress(addr):
            return "Invalid address: \(addr)"
        }
    }
}
