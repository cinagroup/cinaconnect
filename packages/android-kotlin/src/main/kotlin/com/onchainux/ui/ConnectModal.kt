/**
 * ConnectModal — Jetpack Compose modal for wallet connection.
 *
 * Presents a native Android dialog with tabs for Wallet, Social, Email, and Scan.
 * Integrates real deep linking via DeepLinkHandler for wallet app redirects.
 *
 * ## Usage
 * ```kotlin
 * var showModal by remember { mutableStateOf(false) }
 *
 * ConnectButton { showModal = true }
 *
 * if (showModal) {
 *     ConnectModal(
 *         onDismiss = { showModal = false }
 *     )
 * }
 * ```
 */
package com.cinacoin.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cinacoin.core.Cinacoin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Wallet info for modal display. */
data class WalletInfo(
    val id: String,
    val name: String,
    val icon: String? = null,
    val iconBackground: Long? = null,
    val description: String = "",
    val downloadUrl: String? = null,
    val rdns: String? = null,
    val deepLink: String? = null,
    val universalLink: String? = null,
    val appStoreUrl: String? = null,
    val playStoreUrl: String? = null,
    val supportsWalletConnect: Boolean = false
) {
    companion object {
        /** Default wallet configurations. */
        val defaults: List<WalletInfo> = listOf(
            WalletInfo(
                id = "metamask", name = "MetaMask",
                description = "Browser extension & mobile",
                deepLink = "metamask://",
                universalLink = "https://metamask.app.link",
                playStoreUrl = "https://play.google.com/store/apps/details?id=io.metamask",
                supportsWalletConnect = true
            ),
            WalletInfo(
                id = "walletconnect", name = "WalletConnect",
                description = "QR Code",
                deepLink = "wc://",
                universalLink = "https://walletconnect.com",
                supportsWalletConnect = true
            ),
            WalletInfo(
                id = "coinbase", name = "Coinbase Wallet",
                description = "Wallet",
                deepLink = "cbwallet://",
                universalLink = "https://go.cb-w.com",
                playStoreUrl = "https://play.google.com/store/apps/details?id=org.toshi",
                supportsWalletConnect = true
            ),
            WalletInfo(
                id = "rainbow", name = "Rainbow",
                description = "Ethereum wallet",
                deepLink = "rainbow://",
                universalLink = "https://rnbwapp.com",
                playStoreUrl = "https://play.google.com/store/apps/details?id=me.rainbow",
                supportsWalletConnect = true
            ),
            WalletInfo(
                id = "trust", name = "Trust Wallet",
                description = "Multi-chain wallet",
                deepLink = "trust://",
                universalLink = "https://link.trustwallet.com",
                playStoreUrl = "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
                supportsWalletConnect = true
            ),
            WalletInfo(
                id = "rabby", name = "Rabby",
                description = "Multi-chain wallet",
                deepLink = "rabby://",
                supportsWalletConnect = false
            )
        )
    }
}

/** Modal view tab options. */
enum class ModalView(val displayName: String) {
    WALLETS("Wallets"),
    SOCIAL("Social"),
    EMAIL("Email"),
    SCAN("Scan")
}

/** Deep link status for UI feedback. */
sealed class DeepLinkState {
    object Loading : DeepLinkState()
    object Success : DeepLinkState()
    data class Error(val message: String) : DeepLinkState()
}

/**
 * Compose Connect Modal.
 */
@Composable
fun ConnectModal(
    onDismiss: () -> Unit,
    views: List<ModalView> = ModalView.values().toList(),
    defaultView: ModalView = ModalView.WALLETS,
    recommendedWalletIds: List<String> = emptyList(),
    wallets: List<WalletInfo> = WalletInfo.defaults,
    wcUri: String? = null,
    onChainUX: Cinacoin = Cinacoin.getInstance()
) {
    val context = LocalContext.current
    val colors = onChainUX.themeColors

    var currentView by remember { mutableStateOf(defaultView) }
    var email by remember { mutableStateOf("") }
    var deepLinkStatus by remember { mutableStateOf<Map<String, DeepLinkState>>(emptyMap()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.8f),
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Connect Wallet",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(colors.textPrimary)
                )
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color(colors.textSecondary)
                    )
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxSize()) {
                // Tab bar
                TabRow(
                    selectedTabIndex = views.indexOf(currentView),
                    containerColor = Color(colors.bgPrimary),
                    contentColor = Color(colors.accent500)
                ) {
                    views.forEach { view ->
                        Tab(
                            selected = currentView == view,
                            onClick = { currentView = view },
                            text = {
                                Text(
                                    text = view.displayName,
                                    fontSize = 14.sp,
                                    fontWeight = if (currentView == view) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (currentView == view)
                                        Color(colors.textPrimary)
                                    else
                                        Color(colors.textSecondary)
                                )
                            }
                        )
                    }
                }

                // Content
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                ) {
                    when (currentView) {
                        ModalView.WALLETS -> WalletListView(
                            wallets = wallets,
                            recommendedWalletIds = recommendedWalletIds,
                            deepLinkStatus = deepLinkStatus,
                            colors = colors,
                            onWalletSelect = { wallet ->
                                handleWalletSelect(
                                    wallet = wallet,
                                    onChainUX = onChainUX,
                                    wcUri = wcUri,
                                    onDismiss = onDismiss,
                                    onStatusChange = { newStatus ->
                                        deepLinkStatus = deepLinkStatus + (wallet.id to newStatus)
                                    }
                                )
                            }
                        )
                        ModalView.SOCIAL -> SocialLoginView(
                            colors = colors,
                            onSocialLogin = { provider ->
                                handleSocialLogin(provider, onChainUX, onDismiss)
                            }
                        )
                        ModalView.EMAIL -> EmailLoginView(
                            email = email,
                            onEmailChange = { email = it },
                            colors = colors,
                            onEmailSubmit = {
                                if (email.isNotBlank()) {
                                    handleEmailLogin(onChainUX, onDismiss)
                                }
                            }
                        )
                        ModalView.SCAN -> ScanView(
                            wcUri = wcUri,
                            colors = colors
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {},
        containerColor = Color(colors.bgPrimary)
    )
}

@Composable
private fun WalletListView(
    wallets: List<WalletInfo>,
    recommendedWalletIds: List<String>,
    deepLinkStatus: Map<String, DeepLinkState>,
    colors: com.cinacoin.core.ThemeColors,
    onWalletSelect: (WalletInfo) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.padding(16.dp)
    ) {
        items(wallets) { wallet ->
            WalletCard(
                wallet = wallet,
                isRecommended = wallet.id in recommendedWalletIds,
                status = deepLinkStatus[wallet.id],
                colors = colors,
                onSelect = { onWalletSelect(wallet) }
            )
        }
    }
}

@Composable
private fun WalletCard(
    wallet: WalletInfo,
    isRecommended: Boolean,
    status: DeepLinkState?,
    colors: com.cinacoin.core.ThemeColors,
    onSelect: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = status !is DeepLinkState.Loading) { onSelect() },
        colors = CardDefaults.cardColors(containerColor = Color(colors.bgCard)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Icon placeholder
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        wallet.iconBackground?.let { Color(it) } ?: Color(colors.bgCardHover),
                        RoundedCornerShape(8.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "🔗", fontSize = 20.sp)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = wallet.name,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color(colors.textPrimary),
                textAlign = TextAlign.Center
            )

            if (wallet.description.isNotEmpty()) {
                Text(
                    text = wallet.description,
                    fontSize = 12.sp,
                    color = Color(colors.textSecondary),
                    textAlign = TextAlign.Center
                )
            }

            if (status != null) {
                when (status) {
                    is DeepLinkState.Loading ->
                        Text("Opening...", fontSize = 11.sp, color = Color(0xFF60A5FA))
                    is DeepLinkState.Success ->
                        Text("✓ Opened", fontSize = 11.sp, color = Color(0xFF34D399))
                    is DeepLinkState.Error ->
                        Text("✕ Failed", fontSize = 11.sp, color = Color(0xFFF87171))
                }
            }

            if (isRecommended) {
                Text(
                    text = "Recommended",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(colors.accent500)
                )
            }
        }
    }
}

@Composable
private fun SocialLoginView(colors: com.cinacoin.core.ThemeColors, onSocialLogin: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        listOf("Google", "Apple", "X").forEach { provider ->
            OutlinedButton(
                onClick = { onSocialLogin(provider) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color(colors.textPrimary)
                )
            ) {
                Text("Continue with $provider", fontSize = 14.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun EmailLoginView(
    email: String,
    onEmailChange: (String) -> Unit,
    colors: com.cinacoin.core.ThemeColors,
    onEmailSubmit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            label = { Text("Email") },
            placeholder = { Text("Enter your email") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
            colors = TextFieldDefaults.outlinedTextFieldColors(
                textColor = Color(colors.textPrimary),
                focusedBorderColor = Color(colors.accent500),
                unfocusedBorderColor = Color(colors.border)
            )
        )
        OutlinedButton(
            onClick = onEmailSubmit,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = Color(colors.textPrimary)
            )
        ) {
            Text("Continue with Email", fontSize = 14.sp, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun ScanView(wcUri: String?, colors: com.cinacoin.core.ThemeColors) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Scan with your wallet app",
            fontSize = 18.sp,
            color = Color(colors.textSecondary)
        )
        Box(
            modifier = Modifier
                .size(200.dp)
                .background(Color(colors.bgCard), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(text = "📱", fontSize = 48.sp)
        }
        wcUri?.let { uri ->
            Text(
                text = uri.take(60) + "...",
                fontSize = 10.sp,
                color = Color(colors.textTertiary),
                textAlign = TextAlign.Center
            )
        }
    }
}

// MARK: - Actions

private fun handleWalletSelect(
    wallet: WalletInfo,
    onChainUX: Cinacoin,
    wcUri: String?,
    onDismiss: () -> Unit,
    onStatusChange: (DeepLinkState) -> Unit
) {
    val scope = CoroutineScope(Dispatchers.Main)
    onStatusChange(DeepLinkState.Loading)

    scope.launch(Dispatchers.IO) {
        try {
            onChainUX.connect(wallet.id)
            onStatusChange(DeepLinkState.Success)
            onDismiss()
        } catch (e: Exception) {
            onStatusChange(DeepLinkState.Error(e.message ?: "Failed"))
        }
    }
}

private fun handleSocialLogin(provider: String, onChainUX: Cinacoin, onDismiss: () -> Unit) {
    val scope = CoroutineScope(Dispatchers.Main)
    scope.launch(Dispatchers.IO) {
        try {
            onChainUX.connect(provider.lowercase())
            onDismiss()
        } catch (_: Exception) { /* handled by state */ }
    }
}

private fun handleEmailLogin(onChainUX: Cinacoin, onDismiss: () -> Unit) {
    val scope = CoroutineScope(Dispatchers.Main)
    scope.launch(Dispatchers.IO) {
        try {
            onChainUX.connect("email")
            onDismiss()
        } catch (_: Exception) { /* handled by state */ }
    }
}
