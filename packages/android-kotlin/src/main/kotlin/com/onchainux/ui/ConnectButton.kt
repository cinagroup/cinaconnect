/**
 * ConnectButton — Jetpack Compose component.
 *
 * A drop-in wallet connection button that adapts its appearance based on
 * connection state. Shows "Connect Wallet" when disconnected, displays
 * the connected address when connected, and shows a loading spinner
 * while connecting.
 *
 * ## Usage
 * ```kotlin
 * ConnectButton()
 * ConnectButton(
 *     label = "Connect Wallet",
 *     variant = ButtonVariant.Secondary,
 *     size = ButtonSize.Large,
 *     showBalance = true,
 *     showAvatar = true
 * )
 * ```
 */
package com.cinacoin.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cinacoin.core.AccountInfo
import com.cinacoin.core.ConnectionStatus
import com.cinacoin.core.Cinacoin
import com.cinacoin.core.ThemeColors
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Button size preset. */
enum class ButtonSize(
    val height: Dp,
    val horizontalPadding: Dp,
    val fontSize: TextUnit
) {
    SMALL(height = 36.dp, horizontalPadding = 16.dp, fontSize = 12.sp),
    MEDIUM(height = 44.dp, horizontalPadding = 24.dp, fontSize = 14.sp),
    LARGE(height = 52.dp, horizontalPadding = 32.dp, fontSize = 16.sp)
}

/** Button visual variant. */
enum class ButtonVariant { PRIMARY, SECONDARY, GHOST }

/**
 * Compose Connect Button.
 */
@Composable
fun ConnectButton(
    label: String = "Connect Wallet",
    variant: ButtonVariant = ButtonVariant.PRIMARY,
    size: ButtonSize = ButtonSize.MEDIUM,
    showBalance: Boolean = false,
    showAvatar: Boolean = false,
    showNetwork: Boolean = false,
    onPress: (() -> Unit)? = null,
    onDisconnect: (() -> Unit)? = null,
    onChainUX: Cinacoin = Cinacoin.getInstance(),
    modifier: Modifier = Modifier
) {
    val status by onChainUX.status.collectAsState()
    val account by onChainUX.account.collectAsState()
    val colors = onChainUX.themeColors

    val backgroundColor = when {
        status is ConnectionStatus.CONNECTED || variant == ButtonVariant.SECONDARY ->
            Color(colors.bgCard)
        status is ConnectionStatus.ERROR ->
            Color(colors.error).copy(alpha = 0.15f)
        variant == ButtonVariant.GHOST ->
            Color.Transparent
        else ->
            Color(colors.accent500)
    }

    val foregroundColor = when {
        status is ConnectionStatus.CONNECTED || variant == ButtonVariant.SECONDARY ->
            Color(colors.textPrimary)
        status is ConnectionStatus.ERROR ->
            Color(colors.error)
        variant == ButtonVariant.GHOST ->
            Color(colors.textPrimary)
        else ->
            Color.White
    }

    Box(
        modifier = modifier
            .height(size.height)
            .padding(horizontal = size.horizontalPadding)
            .background(backgroundColor, RoundedCornerShape(24.dp))
            .then(
                if (status is ConnectionStatus.CONNECTED || variant == ButtonVariant.SECONDARY) {
                    Modifier.border(
                        width = 1.dp,
                        color = Color(colors.border),
                        shape = RoundedCornerShape(24.dp)
                    )
                } else {
                    Modifier
                }
            )
            .clickable(enabled = status !is ConnectionStatus.CONNECTING) {
                handleButtonPress(status, account, onChainUX, onPress, onDisconnect)
            },
        contentAlignment = Alignment.Center
    ) {
        when {
            status is ConnectionStatus.CONNECTING -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = foregroundColor
                )
            }
            status is ConnectionStatus.CONNECTED && account != null -> {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (showAvatar) {
                        Box(
                            modifier = Modifier
                                .size(size.fontSize.value.dp)
                                .background(Color(colors.accent500), shape = androidx.compose.foundation.shape.CircleShape)
                        )
                    }
                    Text(
                        text = truncateAddress(account!!.address),
                        fontSize = size.fontSize,
                        color = foregroundColor
                    )
                    if (showBalance) {
                        Text(
                            text = "${account!!.balance} ${account!!.chainSymbol}",
                            fontSize = (size.fontSize.value - 2).sp,
                            color = Color(colors.textSecondary)
                        )
                    }
                    if (showNetwork) {
                        NetworkBadge(chainId = account!!.chainId, colors = colors)
                    }
                }
            }
            status is ConnectionStatus.ERROR -> {
                Text(
                    text = "❌ Error",
                    fontSize = size.fontSize,
                    color = Color(colors.error)
                )
            }
            else -> {
                Text(
                    text = label,
                    fontSize = size.fontSize,
                    color = foregroundColor
                )
            }
        }
    }
}

@Composable
private fun NetworkBadge(chainId: Int, colors: ThemeColors) {
    val name = when (chainId) {
        1 -> "ETH"
        137 -> "POLY"
        42161 -> "ARB"
        56 -> "BSC"
        10 -> "OP"
        else -> chainId.toString()
    }
    Text(
        text = name,
        fontSize = 10.sp,
        color = Color(colors.accent500),
        modifier = Modifier
            .background(Color(colors.accent500).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    )
}

private fun truncateAddress(address: String, prefix: Int = 4, suffix: Int = 4): String {
    if (address.length <= prefix + suffix + 2) return address
    return "${address.substring(0, prefix + 2)}...${address.substring(address.length - suffix)}"
}

private fun handleButtonPress(
    status: ConnectionStatus,
    account: AccountInfo?,
    onChainUX: Cinacoin,
    onPress: (() -> Unit)?,
    onDisconnect: (() -> Unit)?
) {
    val scope = CoroutineScope(Dispatchers.Main)
    if (status is ConnectionStatus.CONNECTED) {
        scope.launch {
            onChainUX.disconnect()
            onDisconnect?.invoke()
        }
        return
    }
    scope.launch {
        try {
            onChainUX.connect("metamask")
            onPress?.invoke()
        } catch (_: Exception) { /* handled by Cinacoin state */ }
    }
}
