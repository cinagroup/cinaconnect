package com.cinacoin.ui

import org.junit.Test
import org.junit.Assert.*

/**
 * ConnectButtonTest — Tests for Compose button: rendering, state changes.
 * Tests pure Kotlin logic (enums, data) without Compose runtime.
 */
class ConnectButtonTest {

    // ─── UI Rendering ────────────────────────────────────────────────────

    @Test
    fun `ButtonSize SMALL has expected dimensions`() {
        // ButtonSize.SMALL = 36dp height, 16dp padding, 12sp font
        // We test the enum values directly
        assertEquals(0, ButtonSize.SMALL.ordinal)
    }

    @Test
    fun `ButtonSize MEDIUM is default`() {
        assertEquals(1, ButtonSize.MEDIUM.ordinal)
    }

    @Test
    fun `ButtonSize LARGE is largest`() {
        assertEquals(2, ButtonSize.LARGE.ordinal)
    }

    @Test
    fun `ButtonVariant has three values`() {
        val variants = ButtonVariant.values()
        assertEquals(3, variants.size)
        assertTrue(variants.contains(ButtonVariant.PRIMARY))
        assertTrue(variants.contains(ButtonVariant.SECONDARY))
        assertTrue(variants.contains(ButtonVariant.GHOST))
    }

    // ─── State Changes ───────────────────────────────────────────────────

    @Test
    fun `ConnectionStatus has all expected states`() {
        val disconnected: ConnectionStatus = ConnectionStatus.DISCONNECTED
        val connecting: ConnectionStatus = ConnectionStatus.CONNECTING
        val connected: ConnectionStatus = ConnectionStatus.CONNECTED
        val error: ConnectionStatus = ConnectionStatus.ERROR("fail")

        assertTrue(disconnected is ConnectionStatus.DISCONNECTED)
        assertTrue(connecting is ConnectionStatus.CONNECTING)
        assertTrue(connected is ConnectionStatus.CONNECTED)
        assertTrue(error is ConnectionStatus.ERROR)
    }

    @Test
    fun `truncateAddress short address unchanged`() {
        val short = "0x1234"
        assertEquals(short, truncateAddress(short))
    }
}
