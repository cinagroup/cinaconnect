/**
 * Push Notification Registration for Cinacoin React Native.
 *
 * Real FCM/APNs token registration for:
 * - Transaction status updates
 * - Wallet connection events
 * - Price alerts
 *
 * Requires:
 * - @react-native-firebase/messaging (Android: FCM)
 * - @react-native-firebase/app
 * - react-native-push-notification (iOS: APNs)
 */
export declare function registerPushNotifications(): Promise<string>;
/**
 * Handle incoming push notification.
 */
export declare function handlePushNotification(notification: any): void;
//# sourceMappingURL=pushNotifications.d.ts.map