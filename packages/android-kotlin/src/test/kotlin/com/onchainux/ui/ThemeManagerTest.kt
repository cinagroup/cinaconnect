package com.cinacoin.core

import org.junit.Test
import org.junit.Assert.*

/**
 * ThemeManagerTest — Tests for theme: switching, token injection.
 * Tests pure Kotlin logic without Android dependencies.
 */
class ThemeManagerTest {

    // ─── Theme Switching ─────────────────────────────────────────────────

    @Test
    fun `dark theme accent500 is correct`() {
        val colors = ThemeColors(ThemeMode.DARK)
        assertEquals(0xFF3B82F6, colors.accent500)
    }

    @Test
    fun `light theme accent500 is correct`() {
        val colors = ThemeColors(ThemeMode.LIGHT)
        assertEquals(0xFF2563EB, colors.accent500)
    }

    @Test
    fun `minimal theme accent500 is correct`() {
        val colors = ThemeColors(ThemeMode.MINIMAL)
        assertEquals(0xFF94A3B8, colors.accent500)
    }

    @Test
    fun `dark theme bgPrimary is dark`() {
        val colors = ThemeColors(ThemeMode.DARK)
        assertEquals(0xFF0F172A, colors.bgPrimary)
    }

    @Test
    fun `light theme bgPrimary is white`() {
        val colors = ThemeColors(ThemeMode.LIGHT)
        assertEquals(0xFFFFFFFF, colors.bgPrimary)
    }

    @Test
    fun `minimal theme bgPrimary is black`() {
        val colors = ThemeColors(ThemeMode.MINIMAL)
        assertEquals(0xFF000000, colors.bgPrimary)
    }
}
