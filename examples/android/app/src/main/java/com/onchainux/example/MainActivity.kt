// MainActivity.kt
// 主 Activity — Jetpack Compose UI

package com.cinaconnect.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Language
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.cinaconnect.core.CinaConnect
import com.cinaconnect.core.config.CinaConnectConfig
import com.cinaconnect.core.model.Chain

class MainActivity : ComponentActivity() {
    private lateinit var cinaconnect: CinaConnect

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 初始化 CinaConnect
        val config = CinaConnectConfig(
            projectId = "demo-project-id",
            relayUrl = "wss://relay.cinaconnect.com/v1",
            chains = listOf(
                Chain(id = 1, name = "Ethereum", symbol = "ETH"),
                Chain(id = 137, name = "Polygon", symbol = "MATIC"),
                Chain(id = 42161, name = "Arbitrum", symbol = "ETH"),
            ),
        )
        cinaconnect = CinaConnect(config, applicationContext)

        setContent {
            CinaConnectTheme {
                val navController = rememberNavController()

                Scaffold(
                    bottomBar = {
                        NavigationBar {
                            NavigationBarItem(
                                selected = false,
                                onClick = { navController.navigate("connect") },
                                icon = { Icon(Icons.Default.Link, contentDescription = "连接") },
                                label = { Text("连接") }
                            )
                            NavigationBarItem(
                                selected = false,
                                onClick = { navController.navigate("swap") },
                                icon = { Icon(Icons.Default.SwapHoriz, contentDescription = "Swap") },
                                label = { Text("Swap") }
                            )
                            NavigationBarItem(
                                selected = false,
                                onClick = { navController.navigate("multichain") },
                                icon = { Icon(Icons.Default.Language, contentDescription = "多链") },
                                label = { Text("多链") }
                            )
                        }
                    }
                ) { padding ->
                    NavHost(
                        navController = navController,
                        startDestination = "connect",
                        modifier = Modifier.padding(padding)
                    ) {
                        composable("connect") { ConnectScreen(cinaconnect) }
                        composable("swap") { SwapScreen(cinaconnect) }
                        composable("multichain") { MultiChainScreen(cinaconnect) }
                    }
                }
            }
        }
    }
}

@Composable
fun CinaConnectTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF3B82F6),
            background = Color(0xFF0F172A),
            surface = Color(0xFF1E293B),
        ),
        content = content
    )
}
