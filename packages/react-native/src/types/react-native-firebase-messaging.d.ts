declare module '@react-native-firebase/messaging' {
  export enum AuthorizationStatus {
    NOT_DETERMINED = -1,
    AUTHORIZED = 1,
    DENIED = 0,
    PROVISIONAL = 2,
  }

  export interface RemoteMessage {
    messageId?: string;
    data?: Record<string, string>;
    notification?: {
      title?: string;
      body?: string;
    };
  }

  interface Messaging {
    getToken(): Promise<string>;
    deleteToken(): Promise<void>;
    hasPermission(): Promise<number>;
    requestPermission(): Promise<number>;
    onMessage(callback: (message: RemoteMessage) => void): () => void;
    onTokenRefresh(callback: (token: string) => void): () => void;
    setBackgroundMessageHandler(handler: (message: RemoteMessage) => Promise<void>): void;
  }

  const messaging: {
    (): Messaging;
    AuthorizationStatus: typeof AuthorizationStatus;
  };

  export default messaging;
}
