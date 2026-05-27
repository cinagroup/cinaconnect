package com.cinacoin.wallet

import com.cinacoin.core.*
import org.junit.Test
import org.junit.Assert.*

/**
 * SolanaAdapterTest — Tests for Solana adapter: SOL balance, tx.
 * Tests pure logic and configuration without Android framework dependencies.
 */
class SolanaAdapterTest {

    // ─── SOL Balance ──────────────────────────────────────────────────────

    @Test
    fun `sol nativeCurrency has 9 decimals`() {
        val sol = NativeCurrency(name = "Solana", symbol = "SOL", decimals = 9)
        assertEquals(9, sol.decimals)
        assertEquals("SOL", sol.symbol)
        assertEquals("Solana", sol.name)
    }

    @Test
    fun `eth nativeCurrency has 18 decimals`() {
        val eth = NativeCurrency.eth
        assertEquals(18, eth.decimals)
        assertEquals("ETH", eth.symbol)
    }

    @Test
    fun `lamports conversion - 1 SOL equals 1 billion lamports`() {
        val sol = 1.0
        val lamports = (sol * 1e9).toLong()
        assertEquals(1_000_000_000L, lamports)
    }

    @Test
    fun `lamports conversion - 0.5 SOL equals 500 million lamports`() {
        val sol = 0.5
        val lamports = (sol * 1e9).toLong()
        assertEquals(500_000_000L, lamports)
    }

    @Test
    fun `lamports to SOL - 1 billion lamports equals 1 SOL`() {
        val lamports = 1_000_000_000L
        val sol = lamports / 1e9
        assertEquals(1.0, sol, 0.000001)
    }

    @Test
    fun `lamports to SOL - 500 million lamports equals 0.5 SOL`() {
        val lamports = 500_000_000L
        val sol = lamports / 1e9
        assertEquals(0.5, sol, 0.000001)
    }

    // ─── TX ───────────────────────────────────────────────────────────────

    @Test
    fun `TransactionRequest for SOL transfer`() {
        val tx = TransactionRequest(
            from = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            to = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            value = "1000000000" // 1 SOL in lamports
        )
        assertEquals("1000000000", tx.value)
        assertEquals("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", tx.from)
    }

    @Test
    fun `TransactionRequest with data field for program interaction`() {
        val tx = TransactionRequest(
            from = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            to = "ComputeBudget111111111111111111111111111111",
            data = "0x0308485e0000000000"
        )
        assertEquals("0x0308485e0000000000", tx.data)
    }
}
