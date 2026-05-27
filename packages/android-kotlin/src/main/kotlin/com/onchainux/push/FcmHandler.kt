/**
 * FcmHandler — Firebase Cloud Messaging integration for wallet notifications.
 *
 * Handles FCM token registration, message parsing, and notification routing
 * for wallet connection events (pending transactions, connection requests, etc.).
 *
 * ## Usage
 * ```kotlin
 * val fcmHandler = FcmHandler()
 *
 * // In your FirebaseMessagingService:
 * override fun onNewToken(token: String) {
 *     fcmHandler.onTokenRefresh(token)
 * }
 *
 * override fun onMessageReceived(message: RemoteMessage) {
 *     fcmHandler.handleMessage(message)
 * }
 * ```
 *
 * ## Setup
 * 1. Add firebase-messaging to your build.gradle.kts
 * 2. Create a FirebaseMessagingService subclass
 * 3. Register it in AndroidManifest.xml
 */
package com.cinacoin.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.cinacoin.core.Cinacoin
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.RemoteMessage

/** Type of wallet push notification. */
enum class WalletNotificationType(val value: String) {
    TRANSACTION_REQUEST("transaction_request"),
    CONNECTION_REQUEST("connection_request"),
    TRANSACTION_CONFIRMED("transaction_confirmed"),
    SESSION_EXPIRED("session_expired"),
    OTHER("other")
}

/** Parsed wallet notification data. */
data class WalletNotification(
    val type: WalletNotificationType,
    val title: String,
    val body: String,
    val sessionId: String? = null,
    val transactionData: Map<String, String>? = null,
    val data: Map<String, String> = emptyMap()
)

/** Callback for incoming wallet notifications. */
typealias NotificationCallback = (WalletNotification) -> Unit

/** Callback for token registration. */
typealias TokenCallback = (String) -> Unit

/** Callback for registration failure. */
typealias ErrorCallback = (Exception) -> Unit

/**
 * Handler for Firebase Cloud Messaging in Cinacoin.
 */
class FcmHandler {

    /** FCM registration token. */
    var deviceToken: String? = null
        private set

    /** Whether push notifications are registered. */
    var isRegistered: Boolean = false
        private set

    /** Callback for incoming wallet notifications. */
    var onNotification: NotificationCallback? = null

    /** Callback for token registration success. */
    var onTokenRegistered: TokenCallback? = null

    /** Callback for token registration failure. */
    var onRegistrationFailed: ErrorCallback? = null

    private var context: Context? = null
    private var notificationChannelId = "cinacoin_wallet"

    /**
     * Initialize FCM handler with application context.
     */
    fun initialize(context: Context, channelId: String = "cinacoin_wallet") {
        this.context = context.applicationContext
        this.notificationChannelId = channelId
        createNotificationChannel()
    }

    /**
     * Subscribe to FCM and get a registration token.
     */
    fun subscribeToPush() {
        val ctx = context ?: return

        FirebaseMessaging.getInstance().token
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    deviceToken = token
                    isRegistered = true

                    // Send token to your Cinacoin relay server in production
                    onTokenRegistered?.invoke(token)
                } else {
                    isRegistered = false
                    onRegistrationFailed?.invoke(
                        task.exception ?: Exception("Unknown FCM error")
                    )
                }
            }
    }

    /**
     * Handle a new FCM token (e.g., from onNewToken callback).
     */
    fun onTokenRefresh(newToken: String) {
        deviceToken = newToken
        isRegistered = true
        onTokenRegistered?.invoke(newToken)
    }

    /**
     * Handle an incoming FCM message.
     */
    fun handleMessage(message: RemoteMessage) {
        val notification = parseMessage(message)
        onNotification?.invoke(notification)

        // Show system notification
        showNotification(notification)
    }

    /**
     * Unsubscribe from push notifications.
     */
    fun unsubscribe() {
        FirebaseMessaging.getInstance().deleteToken()
        deviceToken = null
        isRegistered = false
    }

    // MARK: - Private

    private fun parseMessage(message: RemoteMessage): WalletNotification {
        val data = message.data

        val typeStr = data["type"] ?: "other"
        val type = WalletNotificationType.values().find { it.value == typeStr }
            ?: WalletNotificationType.OTHER

        val title = message.notification?.title ?: data["title"] ?: "Cinacoin Notification"
        val body = message.notification?.body ?: data["body"] ?: ""
        val sessionId = data["sessionId"]

        val txData = data.filter { it.key.startsWith("tx_") }
            .mapKeys { it.key.removePrefix("tx_") }

        return WalletNotification(
            type = type,
            title = title,
            body = body,
            sessionId = sessionId,
            transactionData = if (txData.isNotEmpty()) txData else null,
            data = data
        )
    }

    private fun showNotification(notification: WalletNotification) {
        val ctx = context ?: return

        val intent = Intent(ctx, getMainActivityClass()).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("notification_type", notification.type.value)
            notification.sessionId?.let { putExtra("session_id", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            ctx, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(ctx, notificationChannelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(notification.title)
            .setContentText(notification.body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
    }

    private fun createNotificationChannel() {
        val ctx = context ?: return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            notificationChannelId,
            "Wallet Notifications",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Notifications for wallet connections and transactions"
        }

        val notificationManager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
    }

    private fun getMainActivityClass(): Class<*> {
        val ctx = context ?: throw IllegalStateException("Context not initialized")
        val pm = ctx.packageManager
        val launchIntent = pm.getLaunchIntentForPackage(ctx.packageName)
            ?: throw IllegalStateException("No launcher activity found")
        return Class.forName(launchIntent.component!!.className)
    }
}
