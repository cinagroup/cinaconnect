/**
 * SolanaAdapter — Real Solana chain adapter for Android.
 *
 * Provides Solana-specific operations via JSON-RPC:
 * - Balance fetching (getBalance)
 * - Transaction signing & sending (sendTransaction)
 * - Message signing (signMessage via wallet deep link)
 * - Blockhash retrieval (getLatestBlockhash)
 * - Wallet deep linking (Phantom, Solflare)
 *
 * ## Usage
 * ```kotlin
 * val adapter = SolanaAdapter("https://api.mainnet-beta.solana.com")
 * val balance = adapter.getBalance("7xKX...")
 * val signature = adapter.sendTransaction(serializedTx)
 * ```
 */
package com.cinacoin.chain

import android.content.Context
import android.content.Intent
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import java.net.HttpURLConnection
import java.net.URL

// ────────────────────────────────────────────────────────────────────────────
// RPC Types
// ────────────────────────────────────────────────────────────────────────────

@Serializable
data class RpcRequest(
    val jsonrpc: String = "2.0",
    val method: String,
    val params: JsonArray,
    val id: Int = 1
)

@Serializable
data class RpcResponse(
    val jsonrpc: String? = null,
    val result: JsonElement? = null,
    val error: RpcError? = null,
    val id: Int? = null
)

@Serializable
data class RpcError(
    val code: Int,
    val message: String
)

// ────────────────────────────────────────────────────────────────────────────
// Solana Wallet Config
// ────────────────────────────────────────────────────────────────────────────

data class SolanaWalletConfig(
    val id: String,
    val name: String,
    val packageName: String,
    val deepLinkScheme: String,
    val universalLink: String,
    val playStoreUrl: String,
    val iconUrl: String
)

// ────────────────────────────────────────────────────────────────────────────
// Solana Adapter
// ────────────────────────────────────────────────────────────────────────────

/**
 * Real Solana JSON-RPC adapter with wallet deep-link integration.
 */
class SolanaAdapter(
    private var rpcUrl: String = "https://api.mainnet-beta.solana.com",
    private val httpClient: SolanaHttpClient = DefaultSolanaHttpClient()
) {

    private var _connectedAddress: String? = null

    /** Connected Solana wallet address (base58). */
    val connectedAddress: String?
        get() = _connectedAddress

    /** RPC endpoint. */
    var endpoint: String
        get() = rpcUrl
        set(value) { rpcUrl = value }

    // ─── Presets ────────────────────────────────────────────────────────

    companion object {
        val MAINNET = "https://api.mainnet-beta.solana.com"
        val DEVNET  = "https://api.devnet.solana.com"
        val TESTNET = "https://api.testnet.solana.com"

        val wallets = listOf(
            SolanaWalletConfig(
                id = "phantom",
                name = "Phantom",
                packageName = "app.phantom.android",
                deepLinkScheme = "phantom://",
                universalLink = "https://phantom.app",
                playStoreUrl = "https://play.google.com/store/apps/details?id=app.phantom.android",
                iconUrl = "https://phantom.app/img/phantom-icon.png"
            ),
            SolanaWalletConfig(
                id = "solflare",
                name = "Solflare",
                packageName = "com.solflare.wallet",
                deepLinkScheme = "solflare://",
                universalLink = "https://solflare.com",
                playStoreUrl = "https://play.google.com/store/apps/details?id=com.solflare.wallet",
                iconUrl = "https://solflare.com/icon.png"
            ),
            SolanaWalletConfig(
                id = "backpack",
                name = "Backpack",
                packageName = "app.backpack.mobile",
                deepLinkScheme = "backpack://",
                universalLink = "https://backpack.app",
                playStoreUrl = "https://play.google.com/store/apps/details?id=app.backpack.mobile",
                iconUrl = "https://backpack.app/icon.png"
            )
        )

        fun findWalletById(id: String): SolanaWalletConfig? = wallets.find { it.id == id }

        // ─── Base58 helpers ─────────────────────────────────────────────

        private const val BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

        /** Validate a Solana base58 address. */
        fun isValidAddress(address: String): Boolean {
            if (address.length !in 32..44) return false
            return address.all { BASE58_ALPHABET.contains(it) }
        }

        /** Convert lamports to SOL string. */
        fun lamportsToSol(lamports: Long): String = String.format("%.6f", lamports / 1e9)

        /** Convert SOL to lamports. */
        fun solToLamports(sol: Double): Long = (sol * 1e9).toLong()
    }

    // ─── Balance ────────────────────────────────────────────────────────

    /**
     * Get SOL balance for an address via `getBalance`.
     * @return Balance in SOL as decimal string (e.g. "1.234567").
     */
    suspend fun getBalance(address: String): String = withContext(Dispatchers.IO) {
        require(isValidAddress(address)) { "Invalid Solana address: $address" }

        val result = rpcCall("getBalance", listOf(JsonPrimitive(address)))
        val valueObj = result.jsonObject["value"]
            ?: throw SolanaError.RpcError("Invalid balance response")

        val lamports = valueObj.jsonPrimitive.longOrNull
            ?: throw SolanaError.RpcError("Unexpected balance value")

        lamportsToSol(lamports)
    }

    // ─── Blockhash ──────────────────────────────────────────────────────

    /**
     * Get the latest blockhash via `getLatestBlockhash`.
     * @return Blockhash string.
     */
    suspend fun getLatestBlockhash(): SolanaBlockhash = withContext(Dispatchers.IO) {
        val result = rpcCall("getLatestBlockhash", emptyList())
        val value = result.jsonObject["value"]
            ?.jsonObject
            ?: throw SolanaError.RpcError("Invalid blockhash response")

        val blockhash = value["blockhash"]?.jsonPrimitive?.content
            ?: throw SolanaError.RpcError("Missing blockhash in response")

        val lastValidBlockHeight = value["lastValidBlockHeight"]?.jsonPrimitive?.longOrNull
            ?: 0L

        SolanaBlockhash(blockhash, lastValidBlockHeight)
    }

    // ─── Send Transaction ───────────────────────────────────────────────

    /**
     * Send a base64-encoded serialized transaction via `sendTransaction`.
     * @param base64Tx Base64-encoded transaction bytes.
     * @return Transaction signature.
     */
    suspend fun sendTransaction(base64Tx: String): String = withContext(Dispatchers.IO) {
        val config = buildJsonObject {
            put("encoding", JsonPrimitive("base64"))
        }
        val result = rpcCall("sendTransaction", listOf(JsonPrimitive(base64Tx), config))
        result.jsonPrimitive.content
    }

    /**
     * Send a transaction with skipPreflight option.
     * @param base64Tx Base64-encoded transaction bytes.
     * @param skipPreflight Skip preflight checks for faster submission.
     * @return Transaction signature.
     */
    suspend fun sendTransaction(base64Tx: String, skipPreflight: Boolean): String =
        withContext(Dispatchers.IO) {
            val config = buildJsonObject {
                put("encoding", JsonPrimitive("base64"))
                put("skipPreflight", JsonPrimitive(skipPreflight))
            }
            val result = rpcCall("sendTransaction", listOf(JsonPrimitive(base64Tx), config))
            result.jsonPrimitive.content
        }

    // ─── Get Transaction ────────────────────────────────────────────────

    /**
     * Get transaction details by signature via `getTransaction`.
     * @return JSON element with transaction data.
     */
    suspend fun getTransaction(signature: String): JsonElement = withContext(Dispatchers.IO) {
        val config = buildJsonObject {
            put("encoding", JsonPrimitive("json"))
            put("maxSupportedTransactionVersion", JsonPrimitive(0))
        }
        rpcCall("getTransaction", listOf(JsonPrimitive(signature), config))
    }

    // ─── Get Account Info ───────────────────────────────────────────────

    /**
     * Get account info via `getAccountInfo`.
     * @return Account data as JSON element.
     */
    suspend fun getAccountInfo(address: String): JsonElement = withContext(Dispatchers.IO) {
        require(isValidAddress(address)) { "Invalid Solana address: $address" }
        val config = buildJsonObject {
            put("encoding", JsonPrimitive("base64"))
        }
        rpcCall("getAccountInfo", listOf(JsonPrimitive(address), config))
    }

    // ─── Minimum Balance for Rent Exemption ─────────────────────────────

    /**
     * Get minimum balance for rent exemption via `getMinimumBalanceForRentExemption`.
     * @param dataLength Size of account data in bytes.
     * @return Minimum lamports required.
     */
    suspend fun getMinimumBalanceForRentExemption(dataLength: Int): Long =
        withContext(Dispatchers.IO) {
            val result = rpcCall(
                "getMinimumBalanceForRentExemption",
                listOf(JsonPrimitive(dataLength))
            )
            result.jsonPrimitive.longOrNull
                ?: throw SolanaError.RpcError("Invalid rent exemption response")
        }

    // ─── Get Version ────────────────────────────────────────────────────

    /**
     * Get Solana cluster node version via `getVersion`.
     * @return Version string (e.g. "1.17.0").
     */
    suspend fun getVersion(): String = withContext(Dispatchers.IO) {
        val result = rpcCall("getVersion", emptyList())
        result.jsonObject["solana-core"]?.jsonPrimitive?.content
            ?: throw SolanaError.RpcError("Invalid version response")
    }

    // ─── Get Epoch Info ─────────────────────────────────────────────────

    /**
     * Get current epoch info via `getEpochInfo`.
     * @return Epoch info as JSON element.
     */
    suspend fun getEpochInfo(): JsonElement = withContext(Dispatchers.IO) {
        rpcCall("getEpochInfo", emptyList())
    }

    // ─── Request Airdrop (devnet/testnet) ───────────────────────────────

    /**
     * Request an airdrop via `requestAirdrop` (devnet/testnet only).
     * @param address Recipient address.
     * @param lamports Amount in lamports.
     * @return Transaction signature.
     */
    suspend fun requestAirdrop(address: String, lamports: Long): String =
        withContext(Dispatchers.IO) {
            require(isValidAddress(address)) { "Invalid Solana address: $address" }
            val result = rpcCall(
                "requestAirdrop",
                listOf(JsonPrimitive(address), JsonPrimitive(lamports))
            )
            result.jsonPrimitive.content
        }

    // ─── Message Signing (via wallet deep link) ─────────────────────────

    /**
     * Sign a message by deep-linking to the wallet app.
     * The wallet returns the signature via the app's callback URI.
     *
     * @param message Message to sign (UTF-8 bytes).
     * @param callbackUri URI the wallet should callback to with the signature.
     * @param context Android context for starting the intent.
     * @return Deep link intent to the wallet.
     */
    fun signMessage(
        message: String,
        callbackUri: String,
        context: Context
    ): Intent? {
        val address = _connectedAddress
            ?: throw SolanaError.NotConnected

        val encodedMessage = java.util.Base64.getEncoder().encodeToString(message.toByteArray())

        // Phantom deep link format for signMessage
        val phantom = findWalletById("phantom")!!
        val uri = Uri.parse("${phantom.deepLinkScheme}signMessage")
            .buildUpon()
            .appendQueryParameter("address", address)
            .appendQueryParameter("message", encodedMessage)
            .appendQueryParameter("callback", callbackUri)
            .build()

        return Intent(Intent.ACTION_VIEW, uri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            setPackage(phantom.packageName)
        }
    }

    /**
     * Sign a transaction by deep-linking to the wallet app.
     *
     * @param base64Tx Base64-encoded transaction.
     * @param callbackUri URI the wallet should callback to.
     * @param context Android context.
     * @return Deep link intent.
     */
    fun signTransaction(
        base64Tx: String,
        callbackUri: String,
        context: Context
    ): Intent? {
        val address = _connectedAddress
            ?: throw SolanaError.NotConnected

        val phantom = findWalletById("phantom")!!
        val uri = Uri.parse("${phantom.deepLinkScheme}signTransaction")
            .buildUpon()
            .appendQueryParameter("address", address)
            .appendQueryParameter("transaction", base64Tx)
            .appendQueryParameter("callback", callbackUri)
            .build()

        return Intent(Intent.ACTION_VIEW, uri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            setPackage(phantom.packageName)
        }
    }

    // ─── Wallet Deep Link ───────────────────────────────────────────────

    /**
     * Connect to a Solana wallet via deep link.
     * Opens the wallet app with a connect request.
     *
     * @param walletId Wallet identifier (e.g. "phantom", "solflare").
     * @param context Android context.
     * @return Intent to launch, or null if wallet not found.
     */
    fun connectWallet(walletId: String, context: Context): Intent? {
        val wallet = findWalletById(walletId) ?: return null

        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse(wallet.deepLinkScheme)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            setPackage(wallet.packageName)
        }

        return try {
            context.startActivity(intent)
            intent
        } catch (e: Exception) {
            // Wallet not installed — open Play Store
            val storeIntent = Intent(Intent.ACTION_VIEW, Uri.parse(wallet.playStoreUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(storeIntent)
            null
        }
    }

    /**
     * Check if a Solana wallet is installed.
     */
    fun isWalletInstalled(walletId: String, context: Context): Boolean {
        val wallet = findWalletById(walletId) ?: return false
        return try {
            context.packageManager.getPackageInfo(wallet.packageName, 0)
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Set the connected wallet address (called after successful wallet connection).
     */
    fun setConnectedAddress(address: String) {
        require(isValidAddress(address)) { "Invalid Solana address: $address" }
        _connectedAddress = address
    }

    /**
     * Disconnect the current wallet.
     */
    fun disconnect() {
        _connectedAddress = null
    }

    // ─── EIP-1193 Compatible Request ────────────────────────────────────

    /**
     * EIP-1193 compatible request method for Solana operations.
     */
    suspend fun request(method: String, params: List<Any?> = emptyList()): JsonElement =
        when (method) {
            "solana_getBalance" -> {
                val address = params.firstOrNull() as? String
                    ?: throw SolanaError.InvalidParams
                JsonPrimitive(getBalance(address))
            }
            "solana_sendTransaction" -> {
                val tx = params.firstOrNull() as? String
                    ?: throw SolanaError.InvalidParams
                JsonPrimitive(sendTransaction(tx))
            }
            "solana_signMessage" -> {
                val msg = params.firstOrNull() as? String
                    ?: throw SolanaError.InvalidParams
                throw SolanaError.NotImplemented("Message signing requires wallet integration")
            }
            "solana_getLatestBlockhash" -> {
                val bh = getLatestBlockhash()
                buildJsonObject {
                    put("blockhash", JsonPrimitive(bh.blockhash))
                    put("lastValidBlockHeight", JsonPrimitive(bh.lastValidBlockHeight))
                }
            }
            "solana_getAccountInfo" -> {
                val address = params.firstOrNull() as? String
                    ?: throw SolanaError.InvalidParams
                getAccountInfo(address)
            }
            "solana_getVersion" -> JsonPrimitive(getVersion())
            "solana_getEpochInfo" -> getEpochInfo()
            else -> throw SolanaError.UnsupportedMethod(method)
        }

    // ─── Private: RPC ───────────────────────────────────────────────────

    private suspend fun rpcCall(method: String, params: List<JsonElement>): JsonElement =
        withContext(Dispatchers.IO) {
            val request = RpcRequest(
                method = method,
                params = JsonArray(params)
            )
            val body = Json.encodeToString(request)
            val responseBody = httpClient.post(rpcUrl, body)

            val response = Json.decodeFromString<RpcResponse>(responseBody)

            if (response.error != null) {
                throw SolanaError.RpcError(
                    "[${response.error.code}] ${response.error.message}"
                )
            }

            response.result ?: JsonPrimitive("")
        }
}

// ────────────────────────────────────────────────────────────────────────────
// Data Classes
// ────────────────────────────────────────────────────────────────────────────

/** Latest blockhash info. */
data class SolanaBlockhash(
    val blockhash: String,
    val lastValidBlockHeight: Long
)

// ────────────────────────────────────────────────────────────────────────────
// Errors
// ────────────────────────────────────────────────────────────────────────────

/** Solana adapter errors. */
sealed class SolanaError : Exception() {
    data class InvalidAddress(val address: String) : SolanaError()
    object NotConnected : SolanaError()
    data class InvalidRpcUrl(val url: String) : SolanaError()
    data class RpcError(val message: String) : SolanaError()
    object InvalidParams : SolanaError()
    data class UnsupportedMethod(val method: String) : SolanaError()
    data class NotImplemented(val message: String) : SolanaError()

    override val message: String
        get() = when (this) {
            is InvalidAddress -> "Invalid Solana address: $address"
            NotConnected -> "Not connected to a Solana wallet"
            is InvalidRpcUrl -> "Invalid RPC URL: $url"
            is RpcError -> "RPC error: $message"
            InvalidParams -> "Invalid parameters"
            is UnsupportedMethod -> "Unsupported method: $method"
            is NotImplemented -> "Not implemented: $message"
        }
}

// ────────────────────────────────────────────────────────────────────────────
// HTTP Client Interface (for testability)
// ────────────────────────────────────────────────────────────────────────────

/** HTTP client interface for Solana RPC calls. */
interface SolanaHttpClient {
    suspend fun post(url: String, body: String): String
}

/** Default implementation using Java HttpURLConnection. */
class DefaultSolanaHttpClient : SolanaHttpClient {
    override suspend fun post(url: String, body: String): String =
        withContext(Dispatchers.IO) {
            val connection = URL(url).openConnection() as HttpURLConnection
            try {
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = 15_000
                connection.readTimeout = 30_000

                connection.outputStream.write(body.toByteArray(Charsets.UTF_8))
                connection.outputStream.flush()

                val responseCode = connection.responseCode
                if (responseCode != HttpURLConnection.HTTP_OK) {
                    val errorBody = connection.errorStream?.bufferedReader()?.use { it.readText() }
                        ?: "HTTP $responseCode"
                    throw SolanaError.RpcError("HTTP $responseCode: $errorBody")
                }

                connection.inputStream.bufferedReader().use { it.readText() }
            } finally {
                connection.disconnect()
            }
        }
}
