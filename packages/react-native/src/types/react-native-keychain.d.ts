declare module 'react-native-keychain' {
  export interface KeychainOptions {
    service?: string;
    accessControl?: string;
    storage?: string;
    rules?: string;
    prompt?: string | {
      title?: string;
      subtitle?: string;
      description?: string;
      cancel?: string;
      fallback?: string;
    };
  }

  export interface Credentials {
    username: string;
    password: string;
    service: string;
    storage: string;
  }

  export function setGenericPassword(
    username: string,
    password: string,
    options?: KeychainOptions,
  ): Promise<Credentials | false>;

  export function getGenericPassword(
    options?: KeychainOptions,
  ): Promise<Credentials | false | null>;

  export function resetGenericPassword(
    options?: KeychainOptions,
  ): Promise<boolean>;

  export function getSupportedBiometryType(): Promise<string | null>;
}
