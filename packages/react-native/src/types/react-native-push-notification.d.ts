declare module 'react-native-push-notification' {
  export interface PushNotificationPermissions {
    alert: boolean;
    badge: boolean;
    sound: boolean;
  }

  export interface PushNotificationConfig {
    onRegister?: (token: { token: string; os: string }) => void;
    onNotRegistered?: () => void;
    onNotification?: (notification: Record<string, unknown>) => void;
    onAction?: (notification: Record<string, unknown>) => void;
    permissions?: PushNotificationPermissions;
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  const PushNotification: {
    configure(config: PushNotificationConfig): void;
    registerPushNotification(config?: Partial<PushNotificationConfig>): void;
    requestPermissions(permissions?: PushNotificationPermissions): PushNotificationPermissions;
    abandonPermissions(): void;
    presentLocalNotification(details: Record<string, unknown>): void;
    scheduleLocalNotification(details: Record<string, unknown>): void;
    cancelLocalNotification(id: number): void;
    cancelAllLocalNotifications(): void;
    unregister(): void;
  };

  export default PushNotification;
}
