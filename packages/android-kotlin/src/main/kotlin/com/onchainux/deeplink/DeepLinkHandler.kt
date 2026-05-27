/**
 * DeepLinkHandler — handles deep linking for wallet connections on Android.
 *
 * Manages Intent-based deep links, universal links (App Links), and smart
 * redirect logic for Android wallet app connections.
 *
 * ## Usage
 * ```kotlin
 * val handler = DeepLinkHandler()
 * handler.configure(config)
 *
 * val intent = handler.generateIntent(walletId = "metamask", uri = wcUri)
 * context.startActivity(intent)
 * ```
 *
 * ## AndroidManifest.xml Setup
 * Add intent-filter for wallet deep links your app handles:
 * ```xml
 * <queries>
 *     <package android:name="io.metamask" />
 *     <package android:name="org.toshi" />
 *     <package android:name="me.rainbow" />
 *     <package android:name="com.wallet.crypto.trustapp" />
 * </queries>
 * ```
 */
package com.cinacoin.deeplink

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import com.cinacoin.core.CinacoinConfig

/** Platform for redirect decisions. */
enum class Platform { IOS, ANDROID, WEB }

/** Result of a redirect attempt. */
data class RedirectResult(
    val success: Boolean,
    val method: RedirectMethod,
    val url: String,
    val fallbackUsed: Boolean,
    val error: String? = null
)

/** Redirect method used. */
enum class RedirectMethod { DEEP_LINK, UNIVERSAL_LINK, APP_STORE, QR_CODE }

/** Parameters for deep link generation. */
data class DeepLinkParams(
    val walletId: String,
    val uri: String,
    val params: Map<String, String>? = null,
    val fallbackTimeoutMs: Int? = null
)

/** Configuration for a specific wallet's deep link scheme. */
data class WalletDeepLinkConfig(
    val scheme: String,
    val universalDomain: String? = null,
    val appStoreUrl: String? = null,
    val playStoreUrl: String? = null,
    val pathTemplate: String? = null,
    val packageName: String? = null
)

/**
 * Handles deep linking for wallet connections on Android.
 */
class DeepLinkHandler {

    companion object {
        /** Wallet deep link configurations. */
        val walletConfigs: MutableMap<String, WalletDeepLinkConfig> = mutableMapOf(
            "metamask" to WalletDeepLinkConfig(
                scheme = "metamask://",
                universalDomain = "metamask.app.link",
                playStoreUrl = "https://play.google.com/store/apps/details?id=io.metamask",
                pathTemplate = "/wc?uri={uri}",
                packageName = "io.metamask"
            ),
            "walletconnect" to WalletDeepLinkConfig(
                scheme = "wc://",
                universalDomain = "walletconnect.com",
                pathTemplate = "/wc?uri={uri}"
            ),
            "coinbase" to WalletDeepLinkConfig(
                scheme = "cbwallet://",
                universalDomain = "go.cb-w.com",
                playStoreUrl = "https://play.google.com/store/apps/details?id=org.toshi",
                packageName = "org.toshi"
            ),
            "rainbow" to WalletDeepLinkConfig(
                scheme = "rainbow://",
                universalDomain = "rnbwapp.com",
                playStoreUrl = "https://play.google.com/store/apps/details?id=me.rainbow",
                packageName = "me.rainbow"
            ),
            "trust" to WalletDeepLinkConfig(
                scheme = "trust://",
                universalDomain = "link.trustwallet.com",
                playStoreUrl = "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
                packageName = "com.wallet.crypto.trustapp"
            ),
            "phantom" to WalletDeepLinkConfig(
                scheme = "phantom://",
                universalDomain = "phantom.app",
                playStoreUrl = "https://play.google.com/store/apps/details?id=com.phantom.app",
                packageName = "com.phantom.app"
            ),
            "rabby" to WalletDeepLinkConfig(
                scheme = "rabby://"
            )
        )
    }

    private var config: CinacoinConfig? = null

    /** Configure the handler. */
    fun configure(config: CinacoinConfig) {
        this.config = config
    }

    /**
     * Generate a deep link URL for a wallet.
     */
    fun generateDeepLink(walletId: String, uri: String, queryParams: Map<String, String>? = null): String {
        val walletConfig = walletConfigs[walletId] ?: return ""
        var url = walletConfig.scheme

        if (walletConfig.pathTemplate != null) {
            url += walletConfig.pathTemplate.replace("{uri}", uri)
        }

        if (!queryParams.isNullOrEmpty()) {
            val separator = if (url.contains("?")) "&" else "?"
            val query = queryParams.map { "${it.key}=${it.value}" }.joinToString("&")
            url += "$separator$query"
        }

        return url
    }

    /**
     * Generate an Intent for opening a wallet.
     */
    fun generateIntent(walletId: String, uri: String): Intent? {
        val url = generateDeepLink(walletId, uri)
        if (url.isEmpty()) return null

        val walletConfig = walletConfigs[walletId]
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))

        // Set package if known for direct app targeting
        walletConfig?.packageName?.let { pkg ->
            intent.setPackage(pkg)
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return intent
    }

    /**
     * Open a wallet app using deep linking.
     */
    fun openWallet(context: Context, walletId: String, uri: String): RedirectResult {
        val intent = generateIntent(walletId, uri)
        if (intent == null) {
            return RedirectResult(false, RedirectMethod.QR_CODE, "", false, "Wallet not configured")
        }

        return try {
            context.startActivity(intent)
            RedirectResult(true, RedirectMethod.DEEP_LINK, intent.data.toString(), false)
        } catch (e: Exception) {
            // Try Play Store fallback
            val walletConfig = walletConfigs[walletId]
            if (walletConfig?.playStoreUrl != null) {
                val storeIntent = Intent(Intent.ACTION_VIEW, Uri.parse(walletConfig.playStoreUrl))
                storeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                try {
                    context.startActivity(storeIntent)
                    return RedirectResult(true, RedirectMethod.APP_STORE, walletConfig.playStoreUrl!!, true)
                } catch (_: Exception) {
                    // Fall through
                }
            }
            RedirectResult(false, RedirectMethod.DEEP_LINK, intent.data.toString(), false, e.message)
        }
    }

    /**
     * Generate a universal link URL (Android App Link).
     */
    fun generateUniversalLink(walletId: String, uri: String): String? {
        val walletConfig = walletConfigs[walletId]
        val domain = walletConfig?.universalDomain ?: return null
        val path = walletConfig.pathTemplate?.replace("{uri}", uri) ?: "/wc?uri=$uri"
        return "https://$domain$path"
    }

    /**
     * Check if a wallet app is installed.
     */
    fun isWalletInstalled(context: Context, walletId: String): Boolean {
        val walletConfig = walletConfigs[walletId]
        val packageName = walletConfig?.packageName ?: return false

        return try {
            context.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }

    /**
     * Register a custom wallet deep link configuration.
     */
    fun registerWallet(walletId: String, config: WalletDeepLinkConfig) {
        walletConfigs[walletId] = config
    }
}
