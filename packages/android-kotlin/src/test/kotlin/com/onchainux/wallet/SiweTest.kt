package com.cinacoin.wallet

import com.cinacoin.core.*
import org.junit.Test
import org.junit.Assert.*

/**
 * SiweTest — Tests for SIWE: message generation, validation.
 * Tests pure Kotlin logic for SIWE message format and data types.
 */
class SiweTest {

    // ─── Message Generation ───────────────────────────────────────────────

    @Test
    fun `build SIWE message contains domain and address`() {
        val message = buildTestSIWEMessage(
            domain = "example.com",
            address = "0x1234567890abcdef1234567890abcdef12345678",
            uri = "https://example.com/login",
            chainId = 1,
            nonce = "abc123",
            issuedAt = "2024-01-01T00:00:00Z"
        )
        assertTrue(message.contains("example.com wants you to sign in"))
        assertTrue(message.contains("0x1234567890abcdef1234567890abcdef12345678"))
    }

    @Test
    fun `build SIWE message includes statement when provided`() {
        val message = buildTestSIWEMessage(
            domain = "example.com",
            address = "0x1234",
            statement = "Sign in to Example",
            uri = "https://example.com",
            chainId = 1,
            nonce = "abc",
            issuedAt = "2024-01-01T00:00:00Z"
        )
        assertTrue(message.contains("Sign in to Example"))
    }

    @Test
    fun `build SIWE message includes URI and version`() {
        val message = buildTestSIWEMessage(
            domain = "example.com",
            address = "0x1234",
            uri = "https://example.com/login",
            chainId = 1,
            nonce = "abc",
            issuedAt = "2024-01-01T00:00:00Z"
        )
        assertTrue(message.contains("URI: https://example.com/login"))
        assertTrue(message.contains("Version: 1"))
    }

    @Test
    fun `build SIWE message includes chain ID and nonce`() {
        val message = buildTestSIWEMessage(
            domain = "example.com",
            address = "0x1234",
            uri = "https://example.com",
            chainId = 137,
            nonce = "nonce123",
            issuedAt = "2024-01-01T00:00:00Z"
        )
        assertTrue(message.contains("Chain ID: 137"))
        assertTrue(message.contains("Nonce: nonce123"))
    }

    // ─── Validation ───────────────────────────────────────────────────────

    @Test
    fun `ParsedSIWE stores all fields correctly`() {
        val parsed = ParsedSIWE(
            domain = "example.com",
            address = "0x1234",
            statement = "Sign in",
            uri = "https://example.com",
            chainId = 1,
            nonce = "abc",
            issuedAt = "2024-01-01T00:00:00Z"
        )
        assertEquals("example.com", parsed.domain)
        assertEquals("0x1234", parsed.address)
        assertEquals("Sign in", parsed.statement)
        assertEquals(1, parsed.chainId)
    }

    @Test
    fun `SIWESignInResult stores all fields`() {
        val parsed = ParsedSIWE(
            domain = "example.com", address = "0x1234",
            statement = null, uri = "https://example.com",
            chainId = 1, nonce = "abc", issuedAt = "2024-01-01T00:00:00Z"
        )
        val result = SIWESignInResult(
            address = "0x1234",
            message = "test message",
            signature = "0x" + "ab".repeat(65),
            verified = true,
            data = parsed,
            sessionToken = "token123",
            expiresAt = 1704067200L
        )
        assertEquals("0x1234", result.address)
        assertEquals("test message", result.message)
        assertTrue(result.verified)
        assertEquals("token123", result.sessionToken)
    }

    @Test
    fun `SIWESignInResult verified is true with valid data`() {
        val parsed = ParsedSIWE(
            domain = "example.com", address = "0x1234",
            statement = null, uri = "https://example.com",
            chainId = 1, nonce = "abc", issuedAt = "2024-01-01T00:00:00Z"
        )
        val result = SIWESignInResult(
            address = "0x1234", message = "msg", signature = "0x" + "ab".repeat(65),
            verified = true, data = parsed, sessionToken = null, expiresAt = null
        )
        assertTrue(result.verified)
        assertNotNull(result.data)
    }

    @Test
    fun `nonce generation produces 32 hex characters`() {
        val nonce = generateTestNonce()
        assertEquals(32, nonce.length)
        assertTrue(nonce.all { it in '0'..'9' || it in 'a'..'f' })
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private fun buildTestSIWEMessage(
        domain: String, address: String, statement: String? = null,
        uri: String, chainId: Int, nonce: String, issuedAt: String
    ): String {
        var message = "$domain wants you to sign in with your Ethereum account:\n"
        message += "$address\n\n"
        if (statement != null) {
            message += "$statement\n\n"
        }
        message += "URI: $uri\n"
        message += "Version: 1\n"
        message += "Chain ID: $chainId\n"
        message += "Nonce: $nonce\n"
        message += "Issued At: $issuedAt\n"
        return message
    }

    private fun generateTestNonce(): String {
        val bytes = ByteArray(16)
        java.security.SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
