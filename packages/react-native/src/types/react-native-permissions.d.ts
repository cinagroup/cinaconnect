declare module 'react-native-permissions' {
  export type PermissionStatus = 'unavailable' | 'denied' | 'limited' | 'granted' | 'blocked';
  export type iOSPermission = 'alert' | 'badge' | 'sound' | 'carPlay' | 'criticalAlert' | 'provisional';

  export interface PermissionResponse {
    status: PermissionStatus;
    type: string;
  }

  export function checkNotifications(): Promise<{ status: PermissionStatus; settings: Record<string, unknown> }>;
  export function requestNotifications(permissions: iOSPermission[]): Promise<{ status: PermissionStatus; settings: Record<string, unknown> }>;
}
