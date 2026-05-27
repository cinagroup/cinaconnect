/**
 * Push Notification Manager for React Native.
 *
 * Handles FCM (Android) and APNs (iOS) registration, and processes
 * incoming WalletConnect relay notifications.
 *
 * ## Setup
 *
 * ### iOS (Info.plist)
 * ```xml
 * <key>UIBackgroundModes</key>
 * <array>
 *   <string>remote-notification</string>
 * </array>
 * ```
 *
 * ### Android
 * - Add `google-services.json` to `android/app/`
 * - Add Firebase dependencies in `android/app/build.gradle`
 *
 * ## Usage
 * ```tsx
 * import { PushNotificationManager } from '@cinacoin/react-native/push';
 *
 * // In your App entry point:
 * const pushManager = PushNotificationManager.getInstance();
 * await pushManager.init({
 *   projectId: process.env.FIREBASE_PROJECT_ID,
 *   onNotification: (notification) => {
 *     handleWalletConnectNotification(notification);
 *   },
 * });
 *
 * const token = await pushManager.registerToken();
 * // Send token to your server for WC relay subscription
 * ```
 */

import { Platform, AppState, type AppStateStatus } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Push notification provider. */
export type PushProvider = 'fcm' | 'apns' | 'unknown';

/** Push notification payload from WalletConnect relay. */
export interface WCRelayNotification {
  /** Notification title. */
  title?: string;
  /** Notification body/message. */
  body?: string;
  /** Notification type. */
  type?: 'session_proposal' | 'session_request' | 'session_delete' | 'session_event' | 'unknown';
  /** WalletConnect topic (for routing). */
  topic?: string;
  /** Raw notification data. */
  data?: Record<string, string>;
  /** Whether the notification was received in the foreground. */
  foreground?: boolean;
  /** Unix timestamp when received. */
  timestamp?: number;
}

/** Configuration for PushNotificationManager. */
export interface PushNotificationConfig {
  /** Firebase project ID (required for FCM on Android). */
  projectId?: string;
  /** Firebase messaging sender ID. */
  senderId?: string;
  /** Custom handler for incoming notifications. */
  onNotification?: (notification: WCRelayNotification) => void;
  /** Custom handler for token refresh. */
  onTokenRefresh?: (token: string) => void;
  /** Whether to request notification permission on init. */
  requestPermissionOnInit?: boolean;
  /** iOS: APNs environment (production or sandbox). */
  apnsEnvironment?: 'production' | 'sandbox';
}

/** Push notification manager state. */
export interface PushManagerState {
  /** Whether the manager has been initialized. */
  isInitialized: boolean;
  /** The push notification token (FCM or APNs). */
  token: string | null;
  /** Push provider in use. */
  provider: PushProvider;
  /** Whether the user has granted notification permission. */
  permissionGranted: boolean;
  /** Last received notification. */
  lastNotification: WCRelayNotification | null;
  /** Whether the app is in the foreground. */
  isForeground: boolean;
}

/** Return value for usePushNotification hook. */
export interface UsePushNotificationReturn {
  /** Push manager state. */
  state: PushManagerState;
  /** Register for push notifications and get the token. */
  registerToken: () => Promise<string | null>;
  /** Unregister from push notifications. */
  unregisterToken: () => Promise<void>;
  /** Handle a WalletConnect relay notification. */
  handleNotification: (notification: WCRelayNotification) => void;
}

// ---------------------------------------------------------------------------
// PushNotificationManager
// ---------------------------------------------------------------------------

/**
 * Singleton push notification manager for FCM/APNs.
 *
 * Coordinates:
 * - Token registration with FCM (Android) or APNs (iOS)
 * - Permission management
 * - Incoming WC relay notification processing
 * - Foreground/background state awareness
 */
export class PushNotificationManager {
  private static _instance: PushNotificationManager | null = null;

  private _config: PushNotificationConfig | null = null;
  private _state: PushManagerState = {
    isInitialized: false,
    token: null,
    provider: 'unknown',
    permissionGranted: false,
    lastNotification: null,
    isForeground: true,
  };

  private _appStateSub: { remove: () => void } | null = null;
  private _notificationSub: { remove: () => void } | (() => void) | null = null;
  private _tokenRefreshSub: { remove: () => void } | (() => void) | null = null;

  private constructor() {}

  /** Get the singleton instance. */
  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager._instance) {
      PushNotificationManager._instance = new PushNotificationManager();
    }
    return PushNotificationManager._instance;
  }

  /** Reset the singleton (for testing). */
  static resetInstance(): void {
    if (PushNotificationManager._instance) {
      PushNotificationManager._instance.destroy();
    }
    PushNotificationManager._instance = null;
  }

  /** Get current manager state (readonly). */
  get state(): Readonly<PushManagerState> {
    return { ...this._state };
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Initialize the push notification manager.
   *
   * Sets up FCM (Android) or APNs (iOS) listeners and configures
   * the notification handlers.
   *
   * @param config - Push notification configuration.
   */
  async init(config: PushNotificationConfig): Promise<void> {
    if (this._state.isInitialized) return;

    this._config = config;

    // Determine provider
    this._state.provider = Platform.OS === 'ios' ? 'apns' : 'fcm';

    // Track app state for foreground/background awareness
    this._appStateSub = AppState.addEventListener('change', this._handleAppStateChange);

    // Request permission if configured
    if (config.requestPermissionOnInit !== false) {
      await this._requestPermission();
    }

    // Set up notification listeners
    await this._setupListeners();

    this._state.isInitialized = true;
  }

  /** Tear down all listeners and state. */
  destroy(): void {
    this._appStateSub?.remove();
    const unsub = this._notificationSub;
    if (unsub) typeof unsub === 'function' ? unsub() : unsub.remove();
    const unsub2 = this._tokenRefreshSub;
    if (unsub2) typeof unsub2 === 'function' ? unsub2() : unsub2.remove();

    this._state = {
      isInitialized: false,
      token: null,
      provider: 'unknown',
      permissionGranted: false,
      lastNotification: null,
      isForeground: true,
    };
  }

  // -----------------------------------------------------------------------
  // Token Management
  // -----------------------------------------------------------------------

  /**
   * Register for push notifications and retrieve the device token.
   *
   * This token should be sent to your backend server to subscribe
   * the device to WalletConnect relay notifications.
   *
   * @returns The push notification token (FCM or APNs), or null.
   */
  async registerToken(): Promise<string | null> {
    if (!this._state.isInitialized) {
      throw new Error('PushNotificationManager not initialized — call init() first');
    }

    try {
      let token: string | null = null;

      if (Platform.OS === 'ios') {
        // APNs token via react-native-push-notification or @react-native-firebase/messaging
        token = await this._getAPNSToken();
      } else {
        // FCM token via @react-native-firebase/messaging
        token = await this._getFCMToken();
      }

      if (token) {
        this._state.token = token;
      }

      return token;
    } catch (error) {
      console.warn('[PushNotificationManager] Failed to register token:', error);
      return null;
    }
  }

  /**
   * Unregister from push notifications (delete the token).
   */
  async unregisterToken(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await this._deleteAPNSToken();
      } else {
        await this._deleteFCMToken();
      }
      this._state.token = null;
    } catch {
      // ignore — token deletion is best-effort
    }
  }

  // -----------------------------------------------------------------------
  // Notification Handling
  // -----------------------------------------------------------------------

  /**
   * Handle an incoming WalletConnect relay notification.
   *
   * Parses the notification payload and calls the configured handler.
   *
   * @param notification - The notification payload.
   */
  handleNotification(notification: WCRelayNotification): void {
    const enriched: WCRelayNotification = {
      ...notification,
      foreground: this._state.isForeground,
      timestamp: notification.timestamp ?? Date.now(),
    };

    this._state.lastNotification = enriched;

    // Call user-defined handler
    if (this._config?.onNotification) {
      try {
        this._config.onNotification(enriched);
      } catch (error) {
        console.warn('[PushNotificationManager] onNotification handler threw:', error);
      }
    }

    // Auto-type detection from notification data
    if (enriched.type === 'unknown' && enriched.data) {
      enriched.type = this._detectNotificationType(enriched);
    }
  }

  /**
   * Parse a raw push notification payload into a WCRelayNotification.
   *
   * @param payload - Raw notification data from FCM/APNs.
   * @returns Parsed WCRelayNotification.
   */
  static parsePayload(payload: Record<string, unknown>): WCRelayNotification {
    const notification: WCRelayNotification = {
      title: payload.title as string,
      body: payload.body as string,
      data: {},
    };

    // Extract WalletConnect-specific fields
    if (payload.topic) {
      notification.topic = payload.topic as string;
    }
    if (payload.type) {
      notification.type = payload.type as WCRelayNotification['type'];
    }

    // Extract nested data
    if (payload.data && typeof payload.data === 'object') {
      notification.data = payload.data as Record<string, string>;
    }

    return notification;
  }

  // -----------------------------------------------------------------------
  // Permission Management
  // -----------------------------------------------------------------------

  /**
   * Request notification permission from the user.
   *
   * @returns Whether permission was granted.
   */
  async requestPermission(): Promise<boolean> {
    return this._requestPermission();
  }

  /**
   * Check current notification permission status.
   *
   * @returns Whether permission is granted.
   */
  async checkPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // Using react-native-permissions or similar
        const { checkNotifications } = await import('react-native-permissions');
        const result = await checkNotifications();
        return result.status === 'granted';
      } else {
        // Firebase messaging token check
        const messaging = await import('@react-native-firebase/messaging');
        const authStatus = await messaging.default().hasPermission();
        return (
          authStatus === messaging.default.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.default.AuthorizationStatus.PROVISIONAL
        );
      }
    } catch {
      return this._state.permissionGranted;
    }
  }

  // -----------------------------------------------------------------------
  // Internal Methods
  // -----------------------------------------------------------------------

  /** Request notification permission. */
  private async _requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const { checkNotifications, requestNotifications } = await import('react-native-permissions');
        const current = await checkNotifications();

        if (current.status === 'denied') {
          this._state.permissionGranted = false;
          return false;
        }

        const result = await requestNotifications(['alert', 'badge', 'sound']);
        this._state.permissionGranted = result.status === 'granted';
        return this._state.permissionGranted;
      } else {
        const messaging = await import('@react-native-firebase/messaging');
        const authStatus = await messaging.default().hasPermission();

        if (
          authStatus === messaging.default.AuthorizationStatus.NOT_DETERMINED
        ) {
          await messaging.default().requestPermission();
        }

        const newStatus = await messaging.default().hasPermission();
        this._state.permissionGranted =
          newStatus === messaging.default.AuthorizationStatus.AUTHORIZED ||
          newStatus === messaging.default.AuthorizationStatus.PROVISIONAL;

        return this._state.permissionGranted;
      }
    } catch {
      // Permission modules not available — assume granted
      this._state.permissionGranted = true;
      return true;
    }
  }

  /** Set up notification listeners. */
  private async _setupListeners(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await this._setupIOSListeners();
      } else {
        await this._setupAndroidListeners();
      }
    } catch {
      // Notification modules not available — use basic setup
      console.warn('[PushNotificationManager] Push notification modules not available');
    }
  }

  /** Set up iOS notification listeners (APNs). */
  private async _setupIOSListeners(): Promise<void> {
    try {
      const messaging = await import('@react-native-firebase/messaging');

      // Background/quit notifications
      messaging.default().setBackgroundMessageHandler(
        async (remoteMessage: unknown) => {
          const rm = remoteMessage as Record<string, any>;
          const notification = PushNotificationManager.parsePayload({
            title: rm.notification?.title,
            body: rm.notification?.body,
            ...rm.data,
          });
          this.handleNotification(notification);
        },
      );

      // Foreground notifications
      const unsubMsg = messaging.default().onMessage(async (remoteMessage: unknown) => {
        const rm = remoteMessage as Record<string, any>;
        const notification = PushNotificationManager.parsePayload({
          title: rm.notification?.title,
          body: rm.notification?.body,
          ...rm.data,
        });
        this.handleNotification(notification);
      });
      this._notificationSub = { remove: unsubMsg };

      // Token refresh
      const unsubToken = messaging.default().onTokenRefresh((token: string) => {
        this._state.token = token;
        this._config?.onTokenRefresh?.(token);
      });
      this._tokenRefreshSub = { remove: unsubToken };
    } catch {
      // FCM not available on iOS — try APNs directly
      try {
        const { requestNotifications } = await import('react-native-permissions');
        await requestNotifications(['alert', 'badge', 'sound']);
      } catch {
        // ignore
      }
    }
  }

  /** Set up Android notification listeners (FCM). */
  private async _setupAndroidListeners(): Promise<void> {
    try {
      const messaging = await import('@react-native-firebase/messaging');

      // Background/quit notifications
      messaging.default().setBackgroundMessageHandler(
        async (remoteMessage: unknown) => {
          const rm = remoteMessage as Record<string, any>;
          const notification = PushNotificationManager.parsePayload({
            title: rm.notification?.title,
            body: rm.notification?.body,
            ...rm.data,
          });
          this.handleNotification(notification);
        },
      );

      // Foreground notifications
      const unsubMsg = messaging.default().onMessage(async (remoteMessage: unknown) => {
        const rm = remoteMessage as Record<string, any>;
        const notification = PushNotificationManager.parsePayload({
          title: rm.notification?.title,
          body: rm.notification?.body,
          ...rm.data,
        });
        this.handleNotification(notification);
      });
      this._notificationSub = { remove: unsubMsg };

      // Token refresh
      const unsubToken = messaging.default().onTokenRefresh((token: string) => {
        this._state.token = token;
        this._config?.onTokenRefresh?.(token);
      });
      this._tokenRefreshSub = { remove: unsubToken };
    } catch {
      // FCM not available
      console.warn('[PushNotificationManager] FCM messaging not available');
    }
  }

  /** Get APNs token. */
  private async _getAPNSToken(): Promise<string | null> {
    try {
      const messaging = await import('@react-native-firebase/messaging');
      const token = await messaging.default().getToken();
      return token;
    } catch {
      // Try react-native-push-notification as fallback
      try {
        const PushNotification = (await import('react-native-push-notification')).default;
        return await new Promise<string | null>((resolve) => {
          PushNotification.registerPushNotification({
            onRegister: (token: { token: string }) => resolve(token.token),
            onNotRegistered: () => resolve(null),
          });
        });
      } catch {
        return null;
      }
    }
  }

  /** Get FCM token. */
  private async _getFCMToken(): Promise<string | null> {
    try {
      const messaging = await import('@react-native-firebase/messaging');
      const token = await messaging.default().getToken();
      return token;
    } catch {
      // FCM not available
      return null;
    }
  }

  /** Delete APNs token. */
  private async _deleteAPNSToken(): Promise<void> {
    try {
      const messaging = await import('@react-native-firebase/messaging');
      await messaging.default().deleteToken();
    } catch {
      // ignore
    }
  }

  /** Delete FCM token. */
  private async _deleteFCMToken(): Promise<void> {
    try {
      const messaging = await import('@react-native-firebase/messaging');
      await messaging.default().deleteToken();
    } catch {
      // ignore
    }
  }

  /** Handle app state changes. */
  private _handleAppStateChange = (state: AppStateStatus): void => {
    this._state.isForeground = state === 'active';
  };

  /** Detect notification type from WC relay data. */
  private _detectNotificationType(notification: WCRelayNotification): WCRelayNotification['type'] {
    const data = notification.data;
    if (!data) return 'unknown';

    if (data.type?.includes('session_proposal') || data.event?.includes('proposal')) {
      return 'session_proposal';
    }
    if (data.type?.includes('session_request') || data.event?.includes('request')) {
      return 'session_request';
    }
    if (data.type?.includes('session_delete') || data.event?.includes('delete')) {
      return 'session_delete';
    }
    if (data.type?.includes('session_event') || data.event?.includes('event')) {
      return 'session_event';
    }

    return 'unknown';
  }
}

/** Convenience: get the singleton instance. */
export const pushNotificationManager = PushNotificationManager.getInstance();
