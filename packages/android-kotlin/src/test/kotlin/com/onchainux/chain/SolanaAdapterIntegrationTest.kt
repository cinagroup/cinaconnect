package com.cinacoin.chain

import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.Assert.*
import kotlinx.serialization.json.*

/**
 * SolanaAdapterIntegrationTest — Real Solana adapter tests.
 *
 * Tests the SolanaAdapter with mock HTTP client to verify:
 * - Balance fetching via getBalance
 * - Transaction sending via sendTransaction
 * - Blockhash retrieval
 * - Account info queries
 * - Version/epoch queries
 * - Airdrop requests
 * - Address validation
 * - Lamport conversions
 * - Error handling for invalid addresses
 * - RPC error propagation
 *
 * Uses a mocked SolanaHttpClient to simulate real JSON-RPC responses.
 */
class SolanaAdapterIntegrationTest {

    // ─── Mock HTTP Client ───────────────────────────────────────────────

    class MockSolanaHttpClient(
        private val responses: Map<String, String> = emptyMap()
    ) : SolanaHttpClient {
        var lastMethod: String? = null
        var lastBody: String? = null

        override suspend fun post(url: String, body: String): String {
            lastMethod = Json.decodeFromString<RpcRequest>(body).method
            lastBody = body
            return responses[lastMethod] ?: throw SolanaError.RpcError("Unknown method: $lastMethod")
        }
    }

    // ─── Helper: Create adapter with mock client ────────────────────────

    private fun createAdapter(
        responses: Map<String, String> = emptyMap(),
        rpcUrl: String = "https://api.mainnet-beta.solana.com"
    ): Pair<SolanaAdapter, MockSolanaHttpClient> {
        val mockClient = MockSolanaHttpClient(responses)
        val adapter = SolanaAdapter(rpcUrl = rpcUrl, httpClient = mockClient)
        return adapter to mockClient
    }

    // ─── Helper: Build standard JSON-RPC response ──────────────────────

    private fun rpcResult(value: JsonElement): String =
        """{"jsonrpc":"2.0","result":${Json.encodeToString(value)},"id":1}"""

    private fun rpcError(code: Int, message: String): String =
        """{"jsonrpc":"2.0","error":{"code":$code,"message":"$message"},"id":1}"""

    // ============================================================
    // TEST 1: getBalance — successful SOL balance retrieval
    // ============================================================

    @Test
    fun `getBalance returns correct SOL amount`() = runBlocking {
        val lamports = 1_500_000_000L
        val response = rpcResult(
            buildJsonObject { put("value", JsonPrimitive(lamports)) }
        )

        val (adapter, _) = createAdapter(mapOf("getBalance" to response))
        val balance = adapter.getBalance("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")

        assertEquals("1.500000", balance)
    }

    // ============================================================
    // TEST 2: getBalance — zero balance
    // ============================================================

    @Test
    fun `getBalance returns zero for empty account`() = runBlocking {
        val response = rpcResult(
            buildJsonObject { put("value", JsonPrimitive(0L)) }
        )

        val (adapter, _) = createAdapter(mapOf("getBalance" to response))
        val balance = adapter.getBalance("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")

        assertEquals("0.000000", balance)
    }

    // ============================================================
    // TEST 3: getBalance — invalid address throws error
    // ============================================================

    @Test(expected = IllegalArgumentException::class)
    fun `getBalance throws for invalid address`() = runBlocking {
        val (adapter, _) = createAdapter()
        adapter.getBalance("invalid!!!address!!!not!!!base58!!!")
    }

    // ============================================================
    // TEST 4: sendTransaction — returns transaction signature
    // ============================================================

    @Test
    fun `sendTransaction returns signature`() = runBlocking {
        val signature = "5KtP8MNbKJq3qKq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGxRz8"
        val response = rpcResult(JsonPrimitive(signature))

        val (adapter, mockClient) = createAdapter(mapOf("sendTransaction" to response))
        val result = adapter.sendTransaction("base64encodedtx==")

        assertEquals(signature, result)
        assertEquals("sendTransaction", mockClient.lastMethod)
    }

    // ============================================================
    // TEST 5: getLatestBlockhash — returns blockhash and height
    // ============================================================

    @Test
    fun `getLatestBlockhash returns blockhash info`() = runBlocking {
        val response = rpcResult(
            buildJsonObject {
                put("value", buildJsonObject {
                    put("blockhash", JsonPrimitive("4sGjMW1sUnHzSxGspuhE6H8BjM9K2s3H"))
                    put("lastValidBlockHeight", JsonPrimitive(12345678L))
                })
            }
        )

        val (adapter, _) = createAdapter(mapOf("getLatestBlockhash" to response))
        val blockhash = adapter.getLatestBlockhash()

        assertEquals("4sGjMW1sUnHzSxGspuhE6H8BjM9K2s3H", blockhash.blockhash)
        assertEquals(12345678L, blockhash.lastValidBlockHeight)
    }

    // ============================================================
    // TEST 6: getVersion — returns Solana core version
    // ============================================================

    @Test
    fun `getVersion returns solana-core version`() = runBlocking {
        val response = rpcResult(
            buildJsonObject {
                put("solana-core", JsonPrimitive("1.17.0"))
            }
        )

        val (adapter, _) = createAdapter(mapOf("getVersion" to response))
        val version = adapter.getVersion()

        assertEquals("1.17.0", version)
    }

    // ============================================================
    // TEST 7: getMinimumBalanceForRentExemption — returns lamport amount
    // ============================================================

    @Test
    fun `getMinimumBalanceForRentExemption returns correct amount`() = runBlocking {
        val response = rpcResult(JsonPrimitive(890880L))

        val (adapter, _) = createAdapter(mapOf("getMinimumBalanceForRentExemption" to response))
        val result = adapter.getMinimumBalanceForRentExemption(100)

        assertEquals(890880L, result)
    }

    // ============================================================
    // TEST 8: requestAirdrop — returns transaction signature
    // ============================================================

    @Test
    fun `requestAirdrop returns signature`() = runBlocking {
        val signature = "3mMqKq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGxRz8Kq7XJqGx"
        val response = rpcResult(JsonPrimitive(signature))

        val (adapter, _) = createAdapter(mapOf("requestAirdrop" to response))
        val result = adapter.requestAirdrop("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", 1_000_000_000)

        assertEquals(signature, result)
    }

    // ============================================================
    // TEST 9: RPC error handling — server returns error
    // ============================================================

    @Test
    fun `rpcCall propagates server errors`() = runBlocking {
        val response = rpcError(-32600, "Invalid request")

        val (adapter, _) = createAdapter(mapOf("getBalance" to response))

        try {
            adapter.getBalance("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")
            fail("Expected SolanaError.RpcError")
        } catch (e: SolanaError.RpcError) {
            assertTrue(e.message.contains("Invalid request"))
        }
    }

    // ============================================================
    // TEST 10: Address validation and lamport conversions
    // ============================================================

    @Test
    fun `address validation and lamport conversions work correctly`() {
        // Valid addresses
        assertTrue(SolanaAdapter.isValidAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"))
        assertTrue(SolanaAdapter.isValidAddress("So11111111111111111111111111111111111111112"))
        assertTrue(SolanaAdapter.isValidAddress("11111111111111111111111111111111"))

        // Invalid addresses
        assertFalse(SolanaAdapter.isValidAddress(""))
        assertFalse(SolanaAdapter.isValidAddress("abc"))
        assertFalse(SolanaAdapter.isValidAddress("0invalid_address_with_bad_chars!!!"))
        assertFalse(SolanaAdapter.isValidAddress("thisIsWayTooLongToBeAValidSolanaAddress123456789"))

        // Lamport conversions
        assertEquals("1.000000", SolanaAdapter.lamportsToSol(1_000_000_000L))
        assertEquals("0.500000", SolanaAdapter.lamportsToSol(500_000_000L))
        assertEquals("0.000001", SolanaAdapter.lamportsToSol(1000L))
        assertEquals(1_000_000_000L, SolanaAdapter.solToLamports(1.0))
        assertEquals(500_000_000L, SolanaAdapter.solToLamports(0.5))
        assertEquals(2_000_000_000L, SolanaAdapter.solToLamports(2.0))
    }
}
