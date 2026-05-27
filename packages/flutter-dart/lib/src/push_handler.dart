/// Push notification handler for wallet connections.
///
/// Integrates with flutter_local_notifications for local push,
/// and provides hooks for FCM/APNs integration.
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Push notification configuration.
class PushConfig {
  final bool enabled;
  final String? fcmToken;
  final String? apnsToken;
  final bool showOnTransaction;
  final bool showOnSignature;
  final bool showOnChainChange;

  const PushConfig({
    this.enabled = true,
    this.fcmToken,
    this.apnsToken,
    this.showOnTransaction = true,
    this.showOnSignature = true,
    this.showOnChainChange = false,
  });
}

/// Push notification handler.
class PushHandler {
  final FlutterLocalNotificationsPlugin _notifications;
  PushConfig _config;
  bool _initialized = false;

  PushHandler({PushConfig config = const PushConfig()})
      : _notifications = FlutterLocalNotificationsPlugin(),
        _config = config;

  /// Initialize the push notification handler.
  Future<void> init() async {
    if (_initialized) return;

    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      ),
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    _initialized = true;
  }

  /// Set the FCM token for push notifications.
  void setFCMToken(String token) {
    _config = PushConfig(
      enabled: _config.enabled,
      fcmToken: token,
      apnsToken: _config.apnsToken,
      showOnTransaction: _config.showOnTransaction,
      showOnSignature: _config.showOnSignature,
      showOnChainChange: _config.showOnChainChange,
    );
  }

  /// Set the APNs token for push notifications.
  void setAPNSToken(String token) {
    _config = PushConfig(
      enabled: _config.enabled,
      fcmToken: _config.fcmToken,
      apnsToken: token,
      showOnTransaction: _config.showOnTransaction,
      showOnSignature: _config.showOnSignature,
      showOnChainChange: _config.showOnChainChange,
    );
  }

  /// Show a notification for a pending transaction.
  Future<void> notifyTransaction({
    required String from,
    required String to,
    required String amount,
    required String chainName,
  }) async {
    if (!_config.enabled || !_config.showOnTransaction) return;

    await _notifications.show(
      1,
      'Transaction Request',
      'Send $amount on $chainName to ${_truncateAddress(to)}',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'cinacoin_transactions',
          'Transactions',
          channelDescription: 'Wallet transaction notifications',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
  }

  /// Show a notification for a signature request.
  Future<void> notifySignatureRequest({
    required String message,
    required String dappName,
  }) async {
    if (!_config.enabled || !_config.showOnSignature) return;

    await _notifications.show(
      2,
      'Signature Request',
      '$dappName is requesting a signature',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'cinacoin_signatures',
          'Signatures',
          channelDescription: 'Signature request notifications',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
  }

  /// Show a notification for a chain change.
  Future<void> notifyChainChange({
    required String fromChain,
    required String toChain,
  }) async {
    if (!_config.enabled || !_config.showOnChainChange) return;

    await _notifications.show(
      3,
      'Chain Changed',
      'Switched from $fromChain to $toChain',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'cinacoin_chain',
          'Chain Changes',
          channelDescription: 'Chain change notifications',
          importance: Importance.defaultImportance,
          priority: Priority.defaultPriority,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: false,
          presentSound: false,
        ),
      ),
    );
  }

  /// Show a notification for a connection event.
  Future<void> notifyConnection({
    required String walletName,
    required bool connected,
  }) async {
    if (!_config.enabled) return;

    await _notifications.show(
      4,
      connected ? 'Wallet Connected' : 'Wallet Disconnected',
      connected ? 'Connected to $walletName' : 'Disconnected from $walletName',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'cinacoin_connection',
          'Connection',
          channelDescription: 'Wallet connection notifications',
          importance: Importance.defaultImportance,
          priority: Priority.defaultPriority,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
  }

  /// Cancel all notifications.
  Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }

  /// Cancel a specific notification by ID.
  Future<void> cancel(int id) async {
    await _notifications.cancel(id);
  }

  // --- Private ---

  void _onNotificationTap(NotificationResponse response) {
    // Handle notification tap — could navigate to the relevant screen
    // This is a hook for the app to handle
  }

  String _truncateAddress(String address) {
    if (address.length <= 10) return address;
    return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
  }
}
