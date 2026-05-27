/**
 * Cinacoin Android SDK — Main class.
 *
 * Provides the core `Cinacoin` manager for Android applications.
 * Configured once at app launch, provides access to wallet connections,
 * chain state, and theme configuration.
 *
 * ## Usage
 * ```kotlin
 * val config = CinacoinConfig(
 *     projectId = "your-project-id",
 *     chains = listOf(ChainConfig.ethereum, ChainConfig.polygon),
 *     metadata = AppMetadata(
 *         name = "My App",
 *         description = "A great dApp",
 *         url = "https://myapp.com",
 *         icons = listOf("https://myapp.com/icon.png")
 *     )
 * )
 *
 * val onChainUX = Cinacoin.initialize(config)
 * ```
 *
 * @property config Current configuration
 * @property walletManager Wallet connection manager
 * @property deepLinkHandler Deep link handler
 * @property pushNotificationHandler FCM push handler
 */
package com.cinacoin.core

import com.cinacoin.wallet.WalletManager
import com.cinacoin.deeplink.DeepLinkHandler
import com.cinacoin.push.FcmHandler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Central Cinacoin manager for Android.
 */
class Cinacoin private constructor() {

    /** Shared singleton instance. */
    companion object {
        @Volatile
        private var INSTANCE: Cinacoin? = null

        /** Get or create the shared instance. */
        fun getInstance(): Cinacoin =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Cinacoin().also { INSTANCE = it }
            }

        /** Initialize Cinacoin with configuration. */
        fun initialize(config: CinacoinConfig): Cinacoin =
            getInstance().apply { configure(config) }
    }

    /** SDK version. */
    val version: String = "0.1.0"

    /** Current configuration. */
    var config: CinacoinConfig? = null
        private set

    /** Wallet manager for connection operations. */
    val walletManager: WalletManager = WalletManager()

    /** Deep link handler for wallet redirects. */
    val deepLinkHandler: DeepLinkHandler = DeepLinkHandler()

    /** FCM push notification handler. */
    val pushNotificationHandler: FcmHandler = FcmHandler()

    /** Current connection status. */
    private val _status = MutableStateFlow(ConnectionStatus.DISCONNECTED)
    val status: StateFlow<ConnectionStatus> = _status.asStateFlow()

    /** Connected account information. */
    private val _account = MutableStateFlow<AccountInfo?>(null)
    val account: StateFlow<AccountInfo?> = _account.asStateFlow()

    /** Active chain ID. */
    private val _activeChainId = MutableStateFlow(1)
    val activeChainId: StateFlow<Int> = _activeChainId.asStateFlow()

    /** Current theme mode. */
    private val _themeMode = MutableStateFlow(ThemeMode.DARK)
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    /** Resolved theme colors. */
    val themeColors: ThemeColors
        get() = ThemeColors(_themeMode.value)

    /**
     * Configure Cinacoin with app-specific settings.
     */
    fun configure(config: CinacoinConfig) {
        this.config = config
        _themeMode.value = config.themeMode
        _activeChainId.value = config.chains.firstOrNull()?.chainId ?: 1
        walletManager.configure(config)
        deepLinkHandler.configure(config)
    }

    /**
     * Connect to a wallet using the specified connector ID.
     */
    suspend fun connect(connectorId: String): ConnectResult {
        _status.value = ConnectionStatus.CONNECTING
        return try {
            val result = walletManager.connect(connectorId)
            _account.value = result.account
            _activeChainId.value = result.chainId
            _status.value = ConnectionStatus.CONNECTED
            result
        } catch (e: Exception) {
            _status.value = ConnectionStatus.ERROR(e.message ?: "Unknown error")
            throw e
        }
    }

    /**
     * Disconnect from the current wallet.
     */
    suspend fun disconnect() {
        walletManager.disconnect()
        _account.value = null
        _status.value = ConnectionStatus.DISCONNECTED
    }

    /**
     * Switch to a different chain.
     */
    suspend fun switchChain(chainId: Int) {
        val config = config ?: throw IllegalStateException("Cinacoin not configured")
        if (config.chains.none { it.chainId == chainId }) {
            throw IllegalArgumentException("Chain $chainId not supported")
        }
        _activeChainId.value = chainId
    }

    /**
     * Get the list of available connectors.
     */
    fun getConnectors(): List<ConnectorInfo> = walletManager.getConnectors()

    /**
     * Set the theme mode.
     */
    fun setThemeMode(mode: ThemeMode) {
        _themeMode.value = mode
    }
}

// ============================================================
// Configuration types (shared with other modules)
// ============================================================

/** Configuration passed to Cinacoin at startup. */
data class CinacoinConfig(
    val projectId: String? = null,
    val chains: List<ChainConfig>,
    val themeMode: ThemeMode = ThemeMode.DARK,
    val metadata: AppMetadata? = null,
    val recommendedWallets: List<String> = emptyList()
)

/** Chain configuration. */
data class ChainConfig(
    val chainId: Int,
    val name: String,
    val rpcUrl: String,
    val nativeCurrency: NativeCurrency,
    val blockExplorerUrl: String? = null,
    val iconUrl: String? = null,
    val testnet: Boolean = false
) {
    companion object {
        val ethereum = ChainConfig(
            chainId = 1, name = "Ethereum", rpcUrl = "https://eth.llamarpc.com",
            nativeCurrency = NativeCurrency.eth, blockExplorerUrl = "https://etherscan.io"
        )
        val polygon = ChainConfig(
            chainId = 137, name = "Polygon", rpcUrl = "https://polygon-rpc.com",
            nativeCurrency = NativeCurrency(name = "MATIC", symbol = "MATIC", decimals = 18),
            blockExplorerUrl = "https://polygonscan.com"
        )
        val arbitrum = ChainConfig(
            chainId = 42161, name = "Arbitrum", rpcUrl = "https://arb1.arbitrum.io/rpc",
            nativeCurrency = NativeCurrency.eth, blockExplorerUrl = "https://arbiscan.io"
        )
    }
}

/** Native currency info. */
data class NativeCurrency(
    val name: String,
    val symbol: String,
    val decimals: Int
) {
    companion object {
        val eth = NativeCurrency(name = "Ether", symbol = "ETH", decimals = 18)
    }
}

/** Application metadata for WalletConnect. */
data class AppMetadata(
    val name: String,
    val description: String,
    val url: String,
    val icons: List<String>
)

// ============================================================
// Connection state
// ============================================================

/** Connection status. */
sealed class ConnectionStatus {
    object DISCONNECTED : ConnectionStatus()
    object CONNECTING : ConnectionStatus()
    object CONNECTED : ConnectionStatus()
    data class ERROR(val message: String) : ConnectionStatus()
}

/** Connected account information. */
data class AccountInfo(
    val address: String,
    val balance: String,
    val chainId: Int,
    val chainSymbol: String,
    val ensName: String? = null
)

/** Wallet connector info. */
data class ConnectorInfo(
    val id: String,
    val name: String,
    val iconUrl: String? = null,
    val type: ConnectorType
)

/** Connector type. */
enum class ConnectorType {
    INJECTED, WALLETCONNECT, COINBASE, EMAIL, SOCIAL
}

/** Result of a successful wallet connection. */
data class ConnectResult(
    val account: AccountInfo,
    val chainId: Int,
    val sessionId: String
)

// ============================================================
// Theme
// ============================================================

/** Theme mode. */
enum class ThemeMode { DARK, LIGHT, MINIMAL }

/** Theme color tokens. */
data class ThemeColors(
    val accent500: Long,
    val accentGlow: Long,
    val bgPrimary: Long,
    val bgSecondary: Long,
    val bgCard: Long,
    val bgCardHover: Long,
    val textPrimary: Long,
    val textSecondary: Long,
    val textTertiary: Long,
    val border: Long,
    val success: Long,
    val warning: Long,
    val error: Long
) {
    constructor(mode: ThemeMode) : this(
        accent500 = when (mode) {
            ThemeMode.DARK -> 0xFF3B82F6
            ThemeMode.LIGHT -> 0xFF2563EB
            ThemeMode.MINIMAL -> 0xFF94A3B8
        },
        accentGlow = when (mode) {
            ThemeMode.DARK -> 0x4C3B82F6
            ThemeMode.LIGHT -> 0x262563EB
            ThemeMode.MINIMAL -> 0x00000000
        },
        bgPrimary = when (mode) {
            ThemeMode.DARK -> 0xFF0F172A
            ThemeMode.LIGHT -> 0xFFFFFFFF
            ThemeMode.MINIMAL -> 0xFF000000
        },
        bgSecondary = when (mode) {
            ThemeMode.DARK -> 0xFF111827
            ThemeMode.LIGHT -> 0xFFF8FAFC
            ThemeMode.MINIMAL -> 0xFF0A0A0A
        },
        bgCard = when (mode) {
            ThemeMode.DARK -> 0xFF1E293B
            ThemeMode.LIGHT -> 0xFFF8FAFC
            ThemeMode.MINIMAL -> 0xFF0A0A0A
        },
        bgCardHover = when (mode) {
            ThemeMode.DARK -> 0xFF334155
            ThemeMode.LIGHT -> 0xFFF1F5F9
            ThemeMode.MINIMAL -> 0xFF171717
        },
        textPrimary = when (mode) {
            ThemeMode.DARK -> 0xFFF8FAFC
            ThemeMode.LIGHT -> 0xFF0F172A
            ThemeMode.MINIMAL -> 0xFFFAFAFA
        },
        textSecondary = when (mode) {
            ThemeMode.DARK -> 0xFF94A3B8
            ThemeMode.LIGHT -> 0xFF64748B
            ThemeMode.MINIMAL -> 0xFFA3A3A3
        },
        textTertiary = when (mode) {
            ThemeMode.DARK -> 0xFF64748B
            ThemeMode.LIGHT -> 0xFF94A3B8
            ThemeMode.MINIMAL -> 0xFF737373
        },
        border = when (mode) {
            ThemeMode.DARK -> 0xFF334155
            ThemeMode.LIGHT -> 0xFFE2E8F0
            ThemeMode.MINIMAL -> 0xFF262626
        },
        success = when (mode) {
            ThemeMode.DARK -> 0xFF22C55E
            ThemeMode.LIGHT -> 0xFF16A34A
            ThemeMode.MINIMAL -> 0xFF4ADE80
        },
        warning = when (mode) {
            ThemeMode.DARK -> 0xFFEAB308
            ThemeMode.LIGHT -> 0xFFCA8A04
            ThemeMode.MINIMAL -> 0xFFFACC15
        },
        error = when (mode) {
            ThemeMode.DARK -> 0xFFEF4444
            ThemeMode.LIGHT -> 0xFFDC2626
            ThemeMode.MINIMAL -> 0xFFF87171
        }
    )
}

/** Transaction request for signing. */
data class TransactionRequest(
    val from: String,
    val to: String,
    val value: String? = null,
    val data: String? = null,
    val gas: String? = null,
    val gasPrice: String? = null,
    val maxFeePerGas: String? = null,
    val maxPriorityFeePerGas: String? = null,
    val nonce: String? = null,
    val chainId: Int? = null
)
