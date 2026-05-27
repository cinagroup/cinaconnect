package com.cinacoin.wallet

import com.cinacoin.core.*
import org.junit.Test
import org.junit.Assert.*

/**
 * EvmAdapterTest — EVM adapter tests: balance, tx signing, chain switching.
 * Tests pure data/enum logic without Android framework dependencies.
 */
class EvmAdapterTest {

    // ─── Balance ───────────────────────────────────────────────────────────

    @Test
    fun `eth nativeCurrency has correct properties`() {
        assertEquals("Ether", NativeCurrency.eth.name)
        assertEquals("ETH", NativeCurrency.eth.symbol)
        assertEquals(18, NativeCurrency.eth.decimals)
    }

    @Test
    fun `ethereum chain preset has chainId 1`() {
        assertEquals(1, ChainConfig.ethereum.chainId)
        assertEquals("Ethereum", ChainConfig.ethereum.name)
        assertEquals("https://eth.llamarpc.com", ChainConfig.ethereum.rpcUrl)
    }

    @Test
    fun `polygon chain preset has chainId 137`() {
        assertEquals(137, ChainConfig.polygon.chainId)
        assertEquals("Polygon", ChainConfig.polygon.name)
    }

    @Test
    fun `arbitrum chain preset has chainId 42161`() {
        assertEquals(42161, ChainConfig.arbitrum.chainId)
        assertEquals("Arbitrum", ChainConfig.arbitrum.name)
    }

    // ─── Transaction ──────────────────────────────────────────────────────

    @Test
    fun `TransactionRequest stores all fields`() {
        val tx = TransactionRequest(
            from = "0xSender",
            to = "0xReceiver",
            value = "0xDE0B6B3A7640000",
            data = "0xa9059cbb",
            gas = "0x5208",
            gasPrice = "0x3B9ACA00",
            maxFeePerGas = "0x77359400",
            maxPriorityFeePerGas = "0x7735940",
            nonce = "0x1",
            chainId = 1
        )
        assertEquals("0xSender", tx.from)
        assertEquals("0xReceiver", tx.to)
        assertEquals("0xDE0B6B3A7640000", tx.value)
        assertEquals("0xa9059cbb", tx.data)
        assertEquals(1, tx.chainId)
    }

    @Test
    fun `TransactionRequest optional fields default to null`() {
        val tx = TransactionRequest(from = "0xFrom", to = "0xTo")
        assertNull(tx.value)
        assertNull(tx.data)
        assertNull(tx.gas)
        assertNull(tx.nonce)
        assertNull(tx.chainId)
    }

    // ─── Chain Switch ─────────────────────────────────────────────────────

    @Test
    fun `chain presets have unique chainIds`() {
        val ids = listOf(
            ChainConfig.ethereum.chainId,
            ChainConfig.polygon.chainId,
            ChainConfig.arbitrum.chainId
        )
        assertEquals(ids.size, ids.toSet().size)
    }

    @Test
    fun `ChainConfig custom creation with testnet flag`() {
        val custom = ChainConfig(
            chainId = 999, name = "Custom", rpcUrl = "https://custom.rpc",
            nativeCurrency = NativeCurrency(name = "CUST", symbol = "CUST", decimals = 18),
            testnet = true
        )
        assertEquals(999, custom.chainId)
        assertTrue(custom.testnet)
    }

    @Test
    fun `ConnectorType enum has expected values`() {
        val types = ConnectorType.values()
        assertTrue(types.contains(ConnectorType.INJECTED))
        assertTrue(types.contains(ConnectorType.WALLETCONNECT))
        assertTrue(types.contains(ConnectorType.COINBASE))
        assertEquals(5, types.size)
    }

    @Test
    fun `ConnectionStatus sealed class variants exist`() {
        val disconnected: ConnectionStatus = ConnectionStatus.DISCONNECTED
        val connecting: ConnectionStatus = ConnectionStatus.CONNECTING
        val connected: ConnectionStatus = ConnectionStatus.CONNECTED
        val error: ConnectionStatus = ConnectionStatus.ERROR("fail")

        assertTrue(disconnected is ConnectionStatus.DISCONNECTED)
        assertTrue(connecting is ConnectionStatus.CONNECTING)
        assertTrue(connected is ConnectionStatus.CONNECTED)
        assertTrue(error is ConnectionStatus.ERROR)
    }
}
