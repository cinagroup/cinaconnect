using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

#if UNITY_ANDROID && !UNITY_EDITOR
using Firebase.Messaging;
using Firebase;
#endif

#if UNITY_IOS && !UNITY_EDITOR
using Unity.Notifications.iOS;
#endif

namespace Cinacoin.Push
{
    // ═══════════════════════════════════════════════════════════════════
    // PushNotificationHandler — Cross-platform push notification manager
    // for Cinacoin Unity SDK (Android/iOS).
    //
    // Android: Firebase Cloud Messaging via Unity Firebase SDK
    // iOS: APNs via Unity Notification Services
    //
    // Integrates with the Cinacoin push-server for device token
    // registration and WC relay events (pairing requests, session updates).
    // ═══════════════════════════════════════════════════════════════════

    /// Type of wallet push notification.
    public enum WalletNotificationType
    {
        /// Pending transaction to approve/reject.
        TransactionRequest,
        /// New wallet connection request.
        ConnectionRequest,
        /// Transaction confirmed/mined.
        TransactionConfirmed,
        /// Session expired or disconnected.
        SessionExpired,
        /// Generic wallet notification.
        Other
    }

    /// Parsed wallet notification data.
    public class WalletNotification
    {
        public WalletNotificationType Type;
        public string Title;
        public string Body;
        public string SessionId;
        public Dictionary<string, string> TransactionData;
        public Dictionary<string, string> Data;

        public override string ToString()
        {
            return $"[{Type}] {Title}: {Body} (session={SessionId})";
        }
    }

    /// Result of a device token registration with the push server.
    public class PushRegistrationResult
    {
        public bool Success;
        public string Message;
        public string DeviceToken;
    }

    /// Result of push-server API call.
    public class PushServerResult
    {
        public bool Success;
        public string Message;
        public long Timestamp;
    }

    /// Configuration for Cinacoin push-server.
    [Serializable]
    public class PushServerConfig
    {
        /// Base URL of the push-server (e.g. https://push.cinacoin.com).
        public string ServerUrl = "https://push.cinacoin.com";
        /// Project ID for push-server authentication.
        public string ProjectId;
    }

    /// Cross-platform push notification handler for Cinacoin Unity SDK.
    ///
    /// Usage:
    ///   var pushHandler = new PushNotificationHandler();
    ///   pushHandler.Initialize(pushConfig);
    ///
    ///   // Register for push:
    ///   pushHandler.RegisterForPush();
    ///
    ///   // Callbacks:
    ///   pushHandler.OnNotification += OnWalletNotification;
    ///   pushHandler.OnTokenRegistered += OnTokenRegistered;
    ///   pushHandler.OnTokenRegistrationFailed += OnTokenFailed;
    ///
    /// In your Android build, you also need a FirebaseMessagingService subclass
    /// that calls PushNotificationHandler.Instance.OnFirebaseMessage(msg).
    /// In your iOS build, call pushHandler.SetIosDeviceToken(tokenString).
    public class PushNotificationHandler
    {
        // ─── Singleton ─────────────────────────────────────────────────

        private static PushNotificationHandler _instance;

        /// Singleton instance for native platform callbacks to invoke.
        public static PushNotificationHandler Instance
        {
            get
            {
                if (_instance == null)
                {
                    _instance = new PushNotificationHandler();
                }
                return _instance;
            }
        }

        // ─── State ─────────────────────────────────────────────────────

        /// Device registration token (FCM for Android, APNs for iOS).
        public string DeviceToken { get; private set; }

        /// Whether push notifications are registered.
        public bool IsRegistered { get; private set; }

        /// Push server configuration.
        public PushServerConfig Config { get; private set; }

        /// Whether the handler has been initialized.
        public bool IsInitialized { get; private set; }

        // ─── Events ────────────────────────────────────────────────────

        /// Fired when a wallet notification is received.
        public event Action<WalletNotification> OnNotification;

        /// Fired when a notification is opened by the user.
        public event Action<WalletNotification> OnNotificationOpened;

        /// Fired when device token is successfully registered.
        public event Action<string> OnTokenRegistered;

        /// Fired when device token registration fails.
        public event Action<string> OnTokenRegistrationFailed;

        // ─── Platform ──────────────────────────────────────────────────

        /// Current platform.
        public enum TargetPlatform
        {
            Android,
            iOS,
            Unsupported
        }

        private TargetPlatform _platform;

        // ─── Android (FCM) ─────────────────────────────────────────────

#if UNITY_ANDROID && !UNITY_EDITOR
        private FirebaseApp _firebaseApp;
        private FirebaseMessaging _firebaseMessaging;
#endif

        // ─── iOS (APNs) ────────────────────────────────────────────────

#if UNITY_IOS && !UNITY_EDITOR
        private bool _iosPushRequested;
#endif

        // ─── Push-Server API ───────────────────────────────────────────

        /// Initialize the push notification handler.
        /// Call this before any push operations.
        public void Initialize(PushServerConfig config)
        {
            if (IsInitialized) return;

            Config = config;
            IsInitialized = true;

            // Detect platform
            _platform = DetectPlatform();
            Debug.Log($"[Cinacoin:Push] Initialized on {_platform}");

            // Auto-register for push after initialization
            if (_platform != TargetPlatform.Unsupported)
            {
                RegisterForPush();
            }
        }

        /// Register for push notifications on the current platform.
        public void RegisterForPush()
        {
            switch (_platform)
            {
                case TargetPlatform.Android:
                    RegisterAndroidPush();
                    break;
                case TargetPlatform.iOS:
                    RegisterIosPush();
                    break;
                case TargetPlatform.Unsupported:
                    Debug.LogWarning("[Cinacoin:Push] Push notifications not supported on this platform");
                    break;
            }
        }

        /// Unregister from push notifications and remove device token.
        public void Unregister()
        {
            DeviceToken = null;
            IsRegistered = false;

            switch (_platform)
            {
                case TargetPlatform.Android:
                    UnregisterAndroidPush();
                    break;
                case TargetPlatform.iOS:
                    UnregisterIosPush();
                    break;
            }
        }

        // ─── Android Implementation ────────────────────────────────────

        private void RegisterAndroidPush()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                FirebaseApp.CheckAndFixDependenciesAsync().ContinueWith(task =>
                {
                    var dependencyStatus = task.Result;
                    if (dependencyStatus == DependencyStatus.Available)
                    {
                        _firebaseApp = FirebaseApp.DefaultInstance;
                        _firebaseMessaging = FirebaseMessaging.DefaultInstance;

                        // Set token auto init enabled
                        _firebaseMessaging.TokenRegistrationOnInitEnabled = true;

                        // Get the FCM token
                        _firebaseMessaging.GetTokenAsync().ContinueWith(tokenTask =>
                        {
                            if (tokenTask.IsCompleted && !tokenTask.IsFaulted)
                            {
                                var token = tokenTask.Result;
                                OnAndroidTokenReceived(token);
                            }
                            else
                            {
                                var error = tokenTask.Exception?.GetBaseException()?.Message ?? "Unknown FCM error";
                                Debug.LogError($"[Cinacoin:Push] FCM token error: {error}");
                                OnTokenRegistrationFailed?.Invoke(error);
                            }
                        });

                        // Listen for token refresh
                        _firebaseMessaging.TokenReceived += OnFirebaseTokenReceived;
                        _firebaseMessaging.MessageReceived += OnFirebaseMessageReceived;

                        IsRegistered = true;
                        Debug.Log("[Cinacoin:Push] Android push registered successfully");
                    }
                    else
                    {
                        var error = $"Firebase dependencies unavailable: {dependencyStatus}";
                        Debug.LogError($"[Cinacoin:Push] {error}");
                        OnTokenRegistrationFailed?.Invoke(error);
                    }
                });
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Cinacoin:Push] Android push registration error: {ex.Message}");
                OnTokenRegistrationFailed?.Invoke(ex.Message);
            }
#else
            Debug.LogWarning("[Cinacoin:Push] Firebase SDK not available (not building for Android or in Editor)");
#endif
        }

#if UNITY_ANDROID && !UNITY_EDITOR
        private void OnFirebaseTokenReceived(object sender, TokenReceivedEventArgs e)
        {
            OnAndroidTokenReceived(e.Token);
        }

        private void OnFirebaseMessageReceived(object sender, MessageReceivedEventArgs e)
        {
            OnFirebaseMessage(e.Message);
        }
#endif

        private void OnAndroidTokenReceived(string token)
        {
            DeviceToken = token;
            Debug.Log($"[Cinacoin:Push] Android FCM token received: {token.Substring(0, Math.Min(12, token.Length))}...");
            OnTokenRegistered?.Invoke(token);

            // Register token with push-server
            RegisterTokenWithServer(token, "android");
        }

        /// Call this from your Unity Android Java bridge when FirebaseMessagingService
        /// receives a message. This allows native Android code to forward messages.
        public void OnFirebaseMessage(string jsonPayload)
        {
            var notification = ParseAndroidNotification(jsonPayload);
            OnNotification?.Invoke(notification);

            // If app is in background, notification is shown by Firebase.
            // If app is in foreground, show a local notification.
            if (Application.isFocused)
            {
                ShowLocalNotification(notification);
            }
        }

        private void UnregisterAndroidPush()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            if (_firebaseMessaging != null)
            {
                try
                {
                    _firebaseMessaging.DeleteTokenAsync();
                }
                catch { }
            }
#endif
            Debug.Log("[Cinacoin:Push] Android push unregistered");
        }

        private WalletNotification ParseAndroidNotification(string jsonPayload)
        {
            var data = new Dictionary<string, string>();

            // Parse JSON payload (simple key-value parsing)
            try
            {
                var dict = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonPayload);
                if (dict != null) data = dict;
            }
            catch
            {
                // If it's not a JSON dict, try to extract key-value pairs
                if (!string.IsNullOrEmpty(jsonPayload))
                {
                    data["raw"] = jsonPayload;
                }
            }

            var typeStr = GetOrDefault(data, "type", "other");
            var type = ParseNotificationType(typeStr);

            return new WalletNotification
            {
                Type = type,
                Title = GetOrDefault(data, "title", "Cinacoin Notification"),
                Body = GetOrDefault(data, "body", ""),
                SessionId = GetOrDefault(data, "sessionId", null),
                TransactionData = ExtractTransactionData(data),
                Data = data
            };
        }

        // ─── iOS Implementation ────────────────────────────────────────

        private void RegisterIosPush()
        {
#if UNITY_IOS && !UNITY_EDITOR
            try
            {
                // Request authorization for notifications
                var authorizationOptions = new AuthorizationOptions
                {
                    Alert = true,
                    Badge = true,
                    Sound = true,
                };

                var authRequest = new AuthorizationRequest(authorizationOptions, (granted, info) =>
                {
                    if (granted)
                    {
                        _iosPushRequested = true;
                        // The device token will be received via native iOS callback.
                        // Call SetIosDeviceToken() from your iOS native code.
                        Debug.Log("[Cinacoin:Push] iOS push authorization granted");
                    }
                    else
                    {
                        var error = info?.Error ?? "Push notification authorization denied";
                        Debug.LogError($"[Cinacoin:Push] iOS push auth failed: {error}");
                        OnTokenRegistrationFailed?.Invoke(error);
                    }
                });

                authRequest.Start();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Cinacoin:Push] iOS push registration error: {ex.Message}");
                OnTokenRegistrationFailed?.Invoke(ex.Message);
            }
#else
            Debug.LogWarning("[Cinacoin:Push] iOS Notification Services not available (not building for iOS or in Editor)");
#endif
        }

        /// Call this from your iOS native code when APNs returns a device token.
        /// In your AppDelegate:
        ///   UnityFramework.getInstance()?.appDelegate()?.pushHandler.setIosDeviceToken(tokenString)
        public void SetIosDeviceToken(string tokenString)
        {
            DeviceToken = tokenString;
            Debug.Log($"[Cinacoin:Push] iOS APNs token received: {tokenString.Substring(0, Math.Min(12, tokenString.Length))}...");
            IsRegistered = true;
            OnTokenRegistered?.Invoke(tokenString);

            // Register token with push-server
            RegisterTokenWithServer(tokenString, "ios");
        }

        /// Call this from your iOS native code when a notification is received.
        /// In your UNUserNotificationCenterDelegate:
        ///   UnityFramework.getInstance()?.appDelegate()?.pushHandler.handleIosNotification(userInfoJson)
        public void HandleIosNotification(string userInfoJson)
        {
            var notification = ParseIosNotification(userInfoJson);
            OnNotification?.Invoke(notification);

            if (Application.isFocused)
            {
                ShowLocalNotification(notification);
            }
        }

        /// Call this from your iOS native code when the user taps a notification.
        public void HandleIosNotificationResponse(string userInfoJson)
        {
            var notification = ParseIosNotification(userInfoJson);
            OnNotificationOpened?.Invoke(notification);

            // Route based on notification type
            RouteNotification(notification);
        }

        private void UnregisterIosPush()
        {
#if UNITY_IOS && !UNITY_EDITOR
            // iOS doesn't have a direct "unregister" API.
            // We just clear our state and unregister from remote notifications.
            // Native code should call UIApplication.shared.unregisterForRemoteNotifications()
#endif
            Debug.Log("[Cinacoin:Push] iOS push unregistered");
        }

        private WalletNotification ParseIosNotification(string userInfoJson)
        {
            var data = new Dictionary<string, string>();

            try
            {
                var dict = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, string>>(userInfoJson);
                if (dict != null) data = dict;
            }
            catch
            {
                if (!string.IsNullOrEmpty(userInfoJson))
                {
                    data["raw"] = userInfoJson;
                }
            }

            var typeStr = GetOrDefault(data, "type", "other");
            var type = ParseNotificationType(typeStr);

            // Extract from aps.alert if present
            var title = GetOrDefault(data, "title", "Cinacoin Notification");
            var body = GetOrDefault(data, "body", "");

            // Check for nested aps.alert structure
            if (data.ContainsKey("aps"))
            {
                try
                {
                    var aps = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, string>>(data["aps"]);
                    if (aps != null && aps.ContainsKey("alert"))
                    {
                        var alert = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, string>>(aps["alert"]);
                        if (alert != null)
                        {
                            title = GetOrDefault(alert, "title", title);
                            body = GetOrDefault(alert, "body", body);
                        }
                    }
                }
                catch { }
            }

            return new WalletNotification
            {
                Type = type,
                Title = title,
                Body = body,
                SessionId = GetOrDefault(data, "sessionId", null),
                TransactionData = ExtractTransactionData(data),
                Data = data
            };
        }

        // ─── Push-Server Integration ───────────────────────────────────

        /// Register device token with the Cinacoin push-server.
        /// This enables wallet-specific push notifications.
        public void RegisterTokenWithServer(string token, string platform)
        {
            if (Config == null || string.IsNullOrEmpty(Config.ServerUrl))
            {
                Debug.LogWarning("[Cinacoin:Push] Push server not configured, skipping token registration");
                return;
            }

            StartCoroutine(RegisterTokenCoroutine(token, platform));
        }

        private IEnumerator RegisterTokenCoroutine(string token, string platform)
        {
            var url = $"{Config.ServerUrl}/api/register";
            var payload = new RegisterTokenRequest
            {
                ProjectId = Config?.ProjectId ?? "",
                DeviceToken = token,
                Platform = platform,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            var json = Newtonsoft.Json.JsonConvert.SerializeObject(payload);
            var bodyBytes = System.Text.Encoding.UTF8.GetBytes(json);

            using var request = new UnityWebRequest(url, "POST")
            {
                uploadHandler = new UploadHandlerRaw(bodyBytes),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = 10
            };

            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

#if UNITY_2020_1_OR_NEWER
            if (request.result == UnityWebRequest.Result.Success)
#else
            if (!request.isNetworkError && !request.isHttpError)
#endif
            {
                Debug.Log("[Cinacoin:Push] Device token registered with push-server");
            }
            else
            {
                Debug.LogWarning($"[Cinacoin:Push] Push-server registration failed: {request.error}");
            }
        }

        // ─── Notification Routing ──────────────────────────────────────

        /// Route a received notification to the appropriate handler.
        private void RouteNotification(WalletNotification notification)
        {
            switch (notification.Type)
            {
                case WalletNotificationType.TransactionRequest:
                    // Notify wallet manager about pending transaction
                    Debug.Log($"[Cinacoin:Push] Transaction request: {notification.Body}");
                    break;

                case WalletNotificationType.ConnectionRequest:
                    // Notify WC protocol about new connection request
                    Debug.Log($"[Cinacoin:Push] Connection request: {notification.Body}");
                    break;

                case WalletNotificationType.TransactionConfirmed:
                    Debug.Log($"[Cinacoin:Push] Transaction confirmed: {notification.Body}");
                    break;

                case WalletNotificationType.SessionExpired:
                    // Notify WC protocol to trigger reconnection
                    Debug.Log($"[Cinacoin:Push] Session expired: {notification.Body}");
                    break;

                case WalletNotificationType.Other:
                    Debug.Log($"[Cinacoin:Push] Generic notification: {notification.Body}");
                    break;
            }
        }

        // ─── Local Notification Fallback ───────────────────────────────

        private void ShowLocalNotification(WalletNotification notification)
        {
            try
            {
                // Use Unity's built-in notification for foreground notifications
                if (Application.isFocused)
                {
                    // Create a simple in-game notification via Debug or custom UI
                    Debug.Log($"[Cinacoin:Push] Foreground notification: {notification.Title} - {notification.Body}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[Cinacoin:Push] Failed to show local notification: {ex.Message}");
            }
        }

        // ─── Helpers ───────────────────────────────────────────────────

        private TargetPlatform DetectPlatform()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            return TargetPlatform.Android;
#elif UNITY_IOS && !UNITY_EDITOR
            return TargetPlatform.iOS;
#else
            return TargetPlatform.Unsupported;
#endif
        }

        private WalletNotificationType ParseNotificationType(string typeStr)
        {
            return typeStr switch
            {
                "transaction_request" => WalletNotificationType.TransactionRequest,
                "connection_request" => WalletNotificationType.ConnectionRequest,
                "transaction_confirmed" => WalletNotificationType.TransactionConfirmed,
                "session_expired" => WalletNotificationType.SessionExpired,
                _ => WalletNotificationType.Other
            };
        }

        private string GetOrDefault(Dictionary<string, string> dict, string key, string defaultValue)
        {
            if (dict == null) return defaultValue;
            return dict.TryGetValue(key, out var value) ? value : defaultValue;
        }

        private Dictionary<string, string> ExtractTransactionData(Dictionary<string, string> data)
        {
            if (data == null) return null;

            var txData = new Dictionary<string, string>();
            foreach (var kvp in data)
            {
                if (kvp.Key.StartsWith("tx_"))
                {
                    txData[kvp.Key.Substring(3)] = kvp.Value;
                }
            }

            return txData.Count > 0 ? txData : null;
        }

        // ─── WC Protocol Integration ───────────────────────────────────

        /// Handle incoming push notification for WC events.
        /// Called by WCProtocol when a push notification arrives via relay.
        /// This bridges push-server relay messages to the WC session manager.
        public void HandleWcPushNotification(string topic, string payload)
        {
            try
            {
                var data = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, string>>(payload);
                if (data == null) return;

                var type = GetOrDefault(data, "type", "other");
                switch (type)
                {
                    case "wc_pairing_request":
                        // New WC pairing request received via push
                        Debug.Log($"[Cinacoin:Push] WC pairing request on topic: {topic}");
                        break;

                    case "wc_session_update":
                        // WC session state update via push
                        Debug.Log($"[Cinacoin:Push] WC session update on topic: {topic}");
                        break;

                    case "wc_session_delete":
                        // WC session deleted via push
                        Debug.Log($"[Cinacoin:Push] WC session deleted on topic: {topic}");
                        break;

                    default:
                        var notification = ParseAndroidNotification(payload);
                        OnNotification?.Invoke(notification);
                        break;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[Cinacoin:Push] Failed to handle WC push: {ex.Message}");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Data classes for push-server API
    // ═══════════════════════════════════════════════════════════════════

    /// Request body for registering a device token with the push-server.
    [Serializable]
    public class RegisterTokenRequest
    {
        [Newtonsoft.Json.JsonProperty("projectId")]
        public string ProjectId;

        [Newtonsoft.Json.JsonProperty("deviceToken")]
        public string DeviceToken;

        [Newtonsoft.Json.JsonProperty("platform")]
        public string Platform; // "android" or "ios"

        [Newtonsoft.Json.JsonProperty("timestamp")]
        public long Timestamp;
    }
}
