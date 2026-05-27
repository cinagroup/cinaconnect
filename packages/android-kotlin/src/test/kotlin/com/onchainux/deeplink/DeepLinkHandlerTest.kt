package com.cinacoin.deeplink

import org.junit.Test
import org.junit.Assert.*

/**
 * DeepLinkHandlerTest — Tests for deep link: URI parsing, wallet routing.
 * Tests pure Kotlin logic without Android Context dependencies.
 */
class DeepLinkHandlerTest {

    // ─── URI Parsing ─────────────────────────────────────────────────────

    @Test
    fun `generate deep link for metamask`() {
        val handler = DeepLinkHandler()
        val link = handler.generateDeepLink("metamask", "wc:abc123")
        assertTrue(link.startsWith("metamask://"))
        assertTrue(link.contains("wc:abc123"))
    }

    @Test
    fun `generate deep link for walletconnect`() {
        val handler = DeepLinkHandler()
        val link = handler.generateDeepLink("walletconnect", "wc:xyz789")
        assertTrue(link.startsWith("wc://"))
        assertTrue(link.contains("wc:xyz789"))
    }

    @Test
    fun `generate deep link for phantom`() {
        val handler = DeepLinkHandler()
        val link = handler.generateDeepLink("phantom", "wc:sol123")
        assertTrue(link.startsWith("phantom://"))
    }

    @Test
    fun `generate deep link for unknown wallet returns empty`() {
        val handler = DeepLinkHandler()
        val link = handler.generateDeepLink("unknown_wallet", "wc:test")
        assertEquals("", link)
    }

    // ─── Wallet Detection ─────────────────────────────────────────────────

    @Test
    fun `metamask wallet config has correct scheme`() {
        val config = DeepLinkHandler.walletConfigs["metamask"]
        assertNotNull(config)
        assertEquals("metamask://", config?.scheme)
        assertEquals("metamask.app.link", config?.universalDomain)
        assertEquals("io.metamask", config?.packageName)
    }

    @Test
    fun `all registered wallets have non-empty schemes`() {
        DeepLinkHandler.walletConfigs.forEach { (id, config) ->
            assertTrue("Wallet $id has empty scheme", config.scheme.isNotEmpty())
        }
    }

    @Test
    fun `wallet configs include expected wallets`() {
        val walletIds = DeepLinkHandler.walletConfigs.keys
        assertTrue(walletIds.contains("metamask"))
        assertTrue(walletIds.contains("walletconnect"))
        assertTrue(walletIds.contains("coinbase"))
        assertTrue(walletIds.contains("rainbow"))
        assertTrue(walletIds.contains("trust"))
        assertTrue(walletIds.contains("phantom"))
    }

    @Test
    fun `register wallet adds to config`() {
        DeepLinkHandler.registerWallet(
            "custom_wallet",
            WalletDeepLinkConfig(scheme = "custom://")
        )
        val config = DeepLinkHandler.walletConfigs["custom_wallet"]
        assertNotNull(config)
        assertEquals("custom://", config?.scheme)
    }
}
