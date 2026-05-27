/**
 * WCClient — WalletConnect v2 client for Android using WalletConnectKotlin SDK.
 *
 * Provides native Kotlin implementation of the WalletConnect v2 protocol:
 * - Pairing URI generation and QR code display
 * - Session proposal and establishment via WalletConnectKotlin SDK
 * - X25519 key exchange (handled by SDK)
 * - Relay connection (Waku, handled by SDK)
 * - JSON-RPC method dispatch (eth_sendTransaction, personal_sign, etc.)
 * - Balance fetching via eth_getBalance
 * - SIWE signing via personal_sign
 *
 * Uses the official WalletConnectKotlin SDK (com.walletconnect:sign).
 */
package com.cinacoin.walletconnect

import android.content.Context
import com.cinacoin.core.AppMetadata
import com.walletconnect.android.Core
import com.walletconnect.android.CoreClient
import com.walletconnect.android.internal.common.model.Server
import com.walletconnect.sign.Sign
import com.walletconnect.sign.SignClient
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.*
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

// ============================================================
// Status
// ============================================================

sealed class WCStatus {
    object Disconnected : WCStatus()
    object Connecting : WCStatus()
    object Pairing : WCStatus()
    object Connected : WCStatus()
    data class Error(val message: String) : WCStatus()
}

// ============================================================
// Session
// ============================================================

data class WCSession(
    val topic: String,
    val peerMetadata: Map<String, String> = emptyMap(),
    val accounts: List<String> = emptyList(),
    val namespaces: Map<String, Any> = emptyMap(),
    val relayProtocol: String = "waku"
)

// ============================================================
// Transaction Request
// ============================================================

data class WCTransactionRequest(
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
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("from", from)
        put("to", to)
        value?.let { put("value", it) }
        data?.let { put("data", it) }
        gas?.let { put("gas", it) }
        gasPrice?.let { put("gasPrice", it) }
        maxFeePerGas?.let { put("maxFeePerGas", it) }
        maxPriorityFeePerGas?.let { put("maxPriorityFeePerGas", it) }
        nonce?.let { put("nonce", it) }
        chainId?.let { put("chainId", chainId) }
    }
}

// ============================================================
// Events
// ============================================================

sealed class WCEvent {
    object Disconnected : WCEvent()
    data class Connected(val session: WCSession) : WCEvent()
    data class SessionUpdate(val session: WCSession?) : WCEvent()
    data class Error(val error: Throwable) : WCEvent()
}

// ============================================================
// Methods & Events Constants
// ============================================================

object WCMethods {
    const val ETH_SEND_TRANSACTION = "eth_sendTransaction"
    const val ETH_SIGN_TRANSACTION = "eth_signTransaction"
    const val PERSONAL_SIGN = "personal_sign"
    const val ETH_SIGN_TYPED_DATA = "eth_signTypedData"
    const val ETH_SIGN_TYPED_DATA_V4 = "eth_signTypedData_v4"
    const val WALLET_SWITCH_ETHEREUM_CHAIN = "wallet_switchEthereumChain"
    const val WALLET_ADD_ETHEREUM_CHAIN = "wallet_addEthereumChain"
    const val ETH_ACCOUNTS = "eth_accounts"
    const val ETH_CHAIN_ID = "eth_chainId"
    const val ETH_GET_BALANCE = "eth_getBalance"

    val standardEvmMethods = listOf(
        ETH_SEND_TRANSACTION, ETH_SIGN_TRANSACTION, PERSONAL_SIGN,
        ETH_SIGN_TYPED_DATA, ETH_SIGN_TYPED_DATA_V4,
        WALLET_SWITCH_ETHEREUM_CHAIN, WALLET_ADD_ETHEREUM_CHAIN,
        ETH_ACCOUNTS, ETH_CHAIN_ID
    )
}

object WCEvents {
    const val CHAIN_CHANGED = "chainChanged"
    const val ACCOUNTS_CHANGED = "accountsChanged"
    val standardEvmEvents = listOf(CHAIN_CHANGED, ACCOUNTS_CHANGED)
}

// ============================================================
// Errors
// ============================================================

sealed class WCError(message: String) : Exception(message) {
    object NotConnected : WCError("Not connected to a wallet")
    object NotConfigured : WCError("WCClient has not been configured")
    data class InvalidUrl(val url: String) : WCError("Invalid relay URL: $url")
    object SessionTimeout : WCError("Session establishment timed out")
    data class RequestTimeout(val method: String) : WCError("Request '$method' timed out")
    data class RpcError(val code: Int, val message: String) : WCError("RPC error $code: $message")
    object InvalidProposalResponse : WCError("Invalid session proposal response")
    data class RelayError(val message: String) : WCError("Relay error: $message")
    data class CryptoError(val message: String) : WCError("Crypto error: $message")
}

// ============================================================
// Parsed WC URI
// ============================================================

data class ParsedWcUri(
    val topic: String,
    val relayProtocol: String,
    val relayUrl: String,
    val symKey: String
)

// ============================================================
// WC Client — real WalletConnectKotlin SDK integration
// ============================================================

/**
 * WalletConnect v2 client for Android native integration.
 *
 * Wraps the official WalletConnectKotlin SDK (com.walletconnect:sign)
 * for real session management, pairing, and JSON-RPC communication.
 */
class WCClient {

    companion object {
        @Volatile
        private var INSTANCE: WCClient? = null

        fun getInstance(): WCClient =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: WCClient().also { INSTANCE = it }
            }
    }

    // State flows
    private val _status = MutableStateFlow<WCStatus>(WCStatus.Disconnected)
    val status: StateFlow<WCStatus> = _status.asStateFlow()

    private val _session = MutableStateFlow<WCSession?>(null)
    val session: StateFlow<WCSession?> = _session.asStateFlow()

    private val _pairingUri = MutableStateFlow<String?>(null)
    val pairingUri: StateFlow<String?> = _pairingUri.asStateFlow()

    private val _accounts = MutableStateFlow<List<String>>(emptyList())
    val accounts: StateFlow<List<String>> = _accounts.asStateFlow()

    private val _events = MutableSharedFlow<WCEvent>(extraBufferCapacity = 64)
    val events: Flow<WCEvent> = _events.asSharedFlow()

    // Configuration
    var relayUrl: String = "wss://relay.walletconnect.com"
    var projectId: String = ""
    var metadata: AppMetadata? = null
    var requiredChains: List<String> = listOf("eip155:1")
    var requiredMethods: List<String> = WCMethods.standardEvmMethods
    var requiredEvents: List<String> = WCEvents.standardEvmEvents

    // Internal state
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isInitialized = false

    // WalletConnectKotlin SDK clients
    private var coreClient: CoreClient? = null
    private var signClient: SignClient? = null

    // Pending request tracking
    private var nextRequestId: Long = 1
    private val pendingRequests = mutableMapOf<Long, CompletableDeferred<JSONObject>>()

    // Event listener IDs from SDK
    private var sessionProposalListenerId: Long? = null
    private var sessionRequestListenerId: Long? = null
    private var sessionDeleteListenerId: Long? = null
    private var sessionSettleListenerId: Long? = null

    /**
     * Initialize the WalletConnectKotlin SDK.
     * Call this once at app startup before any WC operations.
     */
    fun initialize(
        context: Context,
        projectId: String,
        metadata: AppMetadata,
        server: Server = Server("relay.walletconnect.com")
    ) {
        if (isInitialized) return

        this.projectId = projectId
        this.metadata = metadata

        // Initialize the Core SDK
        val core = CoreClient(
            context = context,
            projectId = projectId,
            server = server
        )
        coreClient = core
        core.initialize()

        // Initialize the Sign SDK
        val sign = SignClient(
            core = core,
            metaData = Sign.Model.AppMetaData(
                name = metadata.name,
                description = metadata.description,
                url = metadata.url,
                icons = metadata.icons
            )
        )
        signClient = sign
        sign.initialize()

        // Subscribe to SDK events
        subscribeToSdkEvents(sign)

        isInitialized = true
    }

    /**
     * Subscribe to WalletConnectKotlin SDK events.
     */
    private fun subscribeToSdkEvents(sign: SignClient) {
        // Session settle (established)
        sessionSettleListenerId = sign.setSessionSettleListener { session ->
            val wcSession = session.toWCSession()
            scope.launch {
                _session.value = wcSession
                _accounts.value = wcSession.accounts
                _status.value = WCStatus.Connected
                _events.emit(WCEvent.Connected(wcSession))
            }
        }

        // Session delete (disconnect)
        sessionDeleteListenerId = sign.setSessionDeleteListener { topic ->
            scope.launch {
                _session.value = null
                _accounts.value = emptyList()
                _pairingUri.value = null
                _status.value = WCStatus.Disconnected
                _events.emit(WCEvent.Disconnected)
            }
        }

        // Session request (wallet-initiated RPC — rare for dApp)
        sessionRequestListenerId = sign.setSessionRequestListener { request ->
            // Handle wallet-initiated requests if needed
            scope.launch {
                _events.emit(WCEvent.SessionUpdate(session = _session.value))
            }
        }
    }

    /**
     * Configure the WC client.
     */
    fun configure(
        relayUrl: String,
        projectId: String,
        metadata: AppMetadata,
        chains: List<String> = listOf("eip155:1")
    ) {
        this.relayUrl = relayUrl
        this.projectId = projectId
        this.metadata = metadata
        this.requiredChains = chains
    }

    /**
     * Create a new pairing and generate a WC v2 URI.
     * Returns a WalletConnect URI string for QR display or deep linking.
     */
    suspend fun createPairing(): String = withContext(Dispatchers.IO) {
        val sign = signClient ?: throw WCError.NotConfigured

        // Build required namespaces for the session proposal
        val namespaces = buildRequiredNamespaces()

        // Create pairing via the SDK
        val pairingUri = sign.pair(
            requiredNamespaces = namespaces,
            optionalNamespaces = emptyMap(),
            sessionProperties = emptyMap(),
            topic = null,
            relay = Sign.Model.Relay("waku")
        )

        _pairingUri.value = pairingUri
        _status.value = WCStatus.Pairing

        pairingUri
    }

    /**
     * Connect using an existing WC v2 URI (e.g., from QR scan).
     */
    suspend fun connect(uri: String): WCSession = withContext(Dispatchers.IO) {
        val sign = signClient ?: throw WCError.NotConfigured

        // Parse URI to validate
        val parsed = parseWcUri(uri)

        _status.value = WCStatus.Connecting

        // Approve the pairing (SDK handles the session establishment)
        sign.pair(uri = uri)

        // Wait for session to settle
        waitForSession()
    }

    /**
     * Disconnect the current session.
     */
    suspend fun disconnect() {
        val sign = signClient ?: return
        val sessionVal = _session.value ?: return

        try {
            sign.disconnectSession(sessionVal.topic)
        } catch (_: Exception) {
            // Session may already be gone
        }

        _session.value = null
        _accounts.value = emptyList()
        _pairingUri.value = null
        _status.value = WCStatus.Disconnected
        _events.emit(WCEvent.Disconnected)
    }

    /**
     * Send a JSON-RPC request to the connected wallet.
     */
    suspend fun request(method: String, params: JSONArray): JSONObject = withContext(Dispatchers.IO) {
        val sign = signClient ?: throw WCError.NotConnected
        val sessionVal = _session.value ?: throw WCError.NotConnected

        val id = nextRequestId++
        val deferred = CompletableDeferred<JSONObject>()
        pendingRequests[id] = deferred

        // Timeout
        scope.launch {
            delay(60_000)
            pendingRequests.remove(id)?.completeExceptionally(WCError.RequestTimeout(method))
        }

        // Use the SDK's request method
        sign.request(
            topic = sessionVal.topic,
            method = method,
            params = params.toString(),
            chainId = sessionVal.accounts.firstOrNull()?.substringBefore(":")?.replace("eip155:", "eip155:") ?: "eip155:1"
        )

        deferred.await()
    }

    /**
     * Send eth_sendTransaction.
     */
    suspend fun sendTransaction(tx: WCTransactionRequest): String {
        val params = JSONArray().apply { put(tx.toJson()) }
        val result = request(WCMethods.ETH_SEND_TRANSACTION, params)
        return result.getString("result")
    }

    /**
     * Send personal_sign.
     */
    suspend fun personalSign(message: String, address: String): String {
        val hexMessage = if (message.startsWith("0x")) message else message.toHex()
        val params = JSONArray().apply {
            put(hexMessage)
            put(address)
        }
        val result = request(WCMethods.PERSONAL_SIGN, params)
        return result.getString("result")
    }

    /**
     * Fetch the connected account's native balance via eth_getBalance.
     */
    suspend fun fetchBalance(): String = withContext(Dispatchers.IO) {
        val accountsVal = _accounts.value
        if (accountsVal.isEmpty()) throw WCError.NotConnected

        // Extract address from CAIP-10 account string
        val caip10 = accountsVal.first()
        val address = caip10.substringAfterLast(":")

        // eth_getBalance via WC session request
        val params = JSONArray().apply {
            put(address)
            put("latest")
        }

        val result = request(WCMethods.ETH_GET_BALANCE, params)
        val balanceHex = result.getString("result")

        // Convert hex wei to decimal ETH
        val wei = balanceHex.hexToBigInteger()
        val eth = wei.toBigDecimal().divide(BigDecimal("1000000000000000000"), 4, java.math.RoundingMode.HALF_UP)
        eth.toPlainString()
    }

    /**
     * Switch chain.
     */
    suspend fun switchChain(chainId: Int) {
        val hexChainId = "0x" + Integer.toHexString(chainId)
        val params = JSONArray().apply {
            put(JSONObject().apply { put("chainId", hexChainId) })
        }
        request(WCMethods.WALLET_SWITCH_ETHEREUM_CHAIN, params)
    }

    // --- Private methods ---

    /**
     * Build the required namespaces map for session proposal.
     */
    private fun buildRequiredNamespaces(): Map<String, Sign.Model.Namespace> {
        return mapOf(
            "eip155" to Sign.Model.Namespace(
                chains = requiredChains,
                methods = requiredMethods,
                events = requiredEvents
            )
        )
    }

    /**
     * Wait for session establishment via the SDK event flow.
     */
    private suspend fun waitForSession(): WCSession = suspendCancellableCoroutine { continuation ->
        val job = scope.launch {
            events.collect { event ->
                when (event) {
                    is WCEvent.Connected -> {
                        continuation.resume(event.session) { /* cancelled */ }
                    }
                    is WCEvent.Error -> {
                        continuation.resumeWith(Result.failure(event.error))
                    }
                    else -> {}
                }
            }
        }

        // 5-minute timeout
        scope.launch {
            delay(300_000) // 5 minutes
            if (!continuation.isCompleted) {
                continuation.resumeWith(Result.failure(WCError.SessionTimeout))
            }
        }

        continuation.invokeOnCancellation { job.cancel() }
    }

    /**
     * Convert SDK Session model to our WCSession.
     */
    private fun Sign.Model.Session.toWCSession(): WCSession {
        val accountsList = namespaces.values.flatMap { namespace ->
            namespace.chains.flatMap { chain ->
                namespace.accounts.filter { it.startsWith(chain) }
            }
        }

        return WCSession(
            topic = topic,
            peerMetadata = peerMetadata?.let { mapOf("name" to it.name, "url" to it.url, "description" to it.description) } ?: emptyMap(),
            accounts = accountsList,
            namespaces = namespaces.mapValues { it.value },
            relayProtocol = relay.protocol
        )
    }
}

// ============================================================
// WC Utils — Crypto and URI helpers (for SDK-agnostic operations)
// ============================================================

object WCUtils {

    /**
     * Parse a WalletConnect v2 URI.
     */
    fun parseWcUri(uri: String): ParsedWcUri {
        val withoutPrefix = if (uri.startsWith("wc:")) uri.substring(3) else uri
        val parts = withoutPrefix.split("?", limit = 2)
        val topicVersion = parts[0].split("@")
        val topic = topicVersion[0]
        val version = topicVersion.getOrNull(1)?.toIntOrNull()
            ?: throw IllegalArgumentException("Invalid WC URI version")
        if (version != 2) throw IllegalArgumentException("Unsupported WC version: $version")

        val params = if (parts.size > 1) {
            parts[1].split("&").associate {
                val (k, v) = it.split("=", limit = 2)
                k to java.net.URLDecoder.decode(v, "UTF-8")
            }
        } else emptyMap()

        return ParsedWcUri(
            topic = topic,
            relayProtocol = params["relay-protocol"] ?: "waku",
            relayUrl = params["relay-url"] ?: "",
            symKey = params["symKey"] ?: throw IllegalArgumentException("Missing symKey")
        )
    }
}

// ============================================================
// Extensions
// ============================================================

private fun String.toHex(): String =
    "0x" + this.toByteArray(Charsets.UTF_8).joinToString("") { "%02x".format(it) }

private fun String.hexToBigInteger(): BigInteger {
    val cleaned = if (startsWith("0x")) substring(2) else this
    return BigInteger(cleaned, 16)
}
