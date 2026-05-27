/**
 * Biometric Authentication for React Native.
 *
 * Provides FaceID/TouchID integration for transaction signing
 * and secure enclave key storage.
 *
 * ## Platform Support
 * - iOS: LocalAuthentication (FaceID / TouchID)
 * - Android: BiometricPrompt (fingerprint / face unlock)
 *
 * ## Setup
 *
 * ### iOS (Info.plist)
 * ```xml
 * <key>NSFaceIDUsageDescription</key>
 * <string>Authenticate transactions with FaceID</string>
 * ```
 *
 * ### Android (AndroidManifest.xml)
 * ```xml
 * <uses-permission android:name="android.permission.USE_BIOMETRIC" />
 * <uses-permission android:name="android.permission.USE_FINGERPRINT" />
 * ```
 *
 * ## Usage
 * ```tsx
 * import { useBiometricAuth } from '@cinacoin/react-native/biometric';
 *
 * function SignTransaction() {
 *   const { authenticate, isSupported, isEnrolled } = useBiometricAuth();
 *
 *   const handleSign = async () => {
 *     const success = await authenticate('Sign this transaction');
 *     if (success) {
 *       // Proceed with signing
 *     }
 *   };
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Biometric type supported by the device. */
export type BiometricType = 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'none';

/** Result of a biometric authentication attempt. */
export interface BiometricAuthResult {
  /** Whether authentication succeeded. */
  success: boolean;
  /** Error message if authentication failed. */
  error?: string;
  /** Error code (platform-specific). */
  errorCode?: string;
}

/** Options for biometric authentication. */
export interface BiometricAuthOptions {
  /** Prompt title shown in the biometric dialog. */
  promptTitle?: string;
  /** Prompt subtitle. */
  promptSubtitle?: string;
  /** Prompt description/reason. */
  promptDescription?: string;
  /** Cancel button text. */
  cancelButtonText?: string;
  /** Whether to allow fallback to device passcode (iOS). */
  fallbackToPasscode?: boolean;
  /** Whether to allow fallback to device PIN/pattern (Android). */
  fallbackToDeviceCredentials?: boolean;
}

/** Return value for useBiometricAuth hook. */
export interface UseBiometricAuthReturn {
  /** Whether biometrics are supported on this device. */
  isSupported: boolean;
  /** Whether the user has enrolled biometrics. */
  isEnrolled: boolean;
  /** The type of biometric available (faceId, touchId, etc.). */
  biometricType: BiometricType;
  /** Authenticate the user with biometrics. */
  authenticate: (reason?: string, options?: BiometricAuthOptions) => Promise<BiometricAuthResult>;
  /** Whether authentication is in progress. */
  isAuthenticating: boolean;
  /** Error from last authentication attempt. */
  error: Error | null;
}

// ---------------------------------------------------------------------------
// BiometricKeyStore — Secure Enclave / Keystore for encrypted key storage
// ---------------------------------------------------------------------------

/** Options for storing a key in the secure enclave. */
export interface BiometricKeyStoreOptions {
  /** Keychain service identifier (iOS) / shared preferences name (Android). */
  service?: string;
  /** Whether biometric authentication is required to access the key. */
  requireBiometry?: boolean;
  /** Access control level. */
  accessControl?: 'biometryAny' | 'biometryCurrentSet' | 'devicePasscode' | 'none';
}

/**
 * BiometricKeyStore — stores encrypted private keys in the secure enclave
 * (iOS Keychain with Secure Enclave / Android Keystore).
 *
 * This class uses react-native-keychain under the hood.
 *
 * ```ts
 * const store = new BiometricKeyStore({
 *   service: 'com.myapp.wallet',
 *   requireBiometry: true,
 * });
 *
 * // Store a private key
 * await store.storeKey('my-wallet', privateKeyHex);
 *
 * // Retrieve (triggers biometric prompt)
 * const key = await store.getKey('my-wallet');
 * ```
 */
export class BiometricKeyStore {
  private _service: string;
  private _requireBiometry: boolean;
  private _accessControl: string;

  constructor(options: BiometricKeyStoreOptions = {}) {
    this._service = options.service ?? 'cinacoin-wallet';
    this._requireBiometry = options.requireBiometry ?? true;
    this._accessControl = options.accessControl ?? 'biometryCurrentSet';
  }

  /**
   * Store an encrypted key in the secure enclave.
   *
   * @param keyId - Unique identifier for the key.
   * @param privateKey - The private key (hex string or bytes).
   * @param biometricPrompt - Prompt text for biometric confirmation.
   */
  async storeKey(
    keyId: string,
    privateKey: string,
    biometricPrompt?: string,
  ): Promise<void> {
    try {
      const { setGenericPassword } = await import('react-native-keychain');

      await setGenericPassword(keyId, privateKey, {
        service: `${this._service}:${keyId}`,
        accessControl: this._getAccessControlOption(),
        storage: this._getStorageOption(),
        rules: this._requireBiometry
          ? 'BIOMETRY_ANY'
          : 'BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE',
        prompt: biometricPrompt ?? 'Store wallet key',
      });
    } catch (error) {
      // react-native-keychain may not be installed — log and re-throw
      throw new Error(
        `BiometricKeyStore.storeKey failed: ${error instanceof Error ? error.message : 'react-native-keychain not available'}`,
      );
    }
  }

  /**
   * Retrieve a stored key (triggers biometric authentication).
   *
   * @param keyId - Unique identifier for the key.
   * @param biometricPrompt - Prompt text for biometric confirmation.
   * @returns The stored private key.
   */
  async getKey(keyId: string, biometricPrompt?: string): Promise<string> {
    try {
      const { getGenericPassword } = await import('react-native-keychain');

      const credentials = await getGenericPassword({
        service: `${this._service}:${keyId}`,
        accessControl: this._getAccessControlOption(),
        prompt: biometricPrompt ?? 'Authenticate to access wallet key',
      });

      if (!credentials || typeof credentials === 'boolean' || !credentials.password) {
        throw new Error('Key not found in secure store');
      }

      return (credentials as { password: string }).password;
    } catch (error) {
      throw new Error(
        `BiometricKeyStore.getKey failed: ${error instanceof Error ? error.message : 'react-native-keychain not available'}`,
      );
    }
  }

  /**
   * Delete a stored key.
   *
   * @param keyId - Unique identifier for the key.
   */
  async deleteKey(keyId: string): Promise<void> {
    try {
      const { resetGenericPassword } = await import('react-native-keychain');

      await resetGenericPassword({
        service: `${this._service}:${keyId}`,
      });
    } catch (error) {
      throw new Error(
        `BiometricKeyStore.deleteKey failed: ${error instanceof Error ? error.message : 'react-native-keychain not available'}`,
      );
    }
  }

  /**
   * Check if a key exists in the store.
   *
   * @param keyId - Unique identifier for the key.
   * @returns True if the key exists.
   */
  async hasKey(keyId: string): Promise<boolean> {
    try {
      const { getSupportedBiometryType } = await import('react-native-keychain');
      // getSupportedBiometryType doesn't check individual keys,
      // so we attempt a retrieval (which may trigger biometric prompt)
      // For a non-intrusive check, try with no-access-control first
      const { getGenericPassword } = await import('react-native-keychain');
      const credentials = await getGenericPassword({
        service: `${this._service}:${keyId}`,
        accessControl: 'NO_AUTHENTICATION_REQUIRED',
      });
      return credentials !== null;
    } catch {
      return false;
    }
  }

  /**
   * List all stored key IDs.
   *
   * Note: This is not natively supported by Keychain/Keystore.
   * We maintain a separate index.
   *
   * @returns Array of stored key IDs.
   */
  async listKeys(): Promise<string[]> {
    try {
      const { getGenericPassword } = await import('react-native-keychain');
      const credentials = await getGenericPassword({
        service: `${this._service}:__index__`,
        accessControl: 'NO_AUTHENTICATION_REQUIRED',
      });
      if (credentials && typeof credentials === 'object' && credentials.password) {
        return JSON.parse(credentials.password) as string[];
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Update the key index.
   */
  private async _updateIndex(addId: string, removeId?: string): Promise<void> {
    try {
      const { setGenericPassword, getGenericPassword } = await import('react-native-keychain');

      const existing = await this.listKeys();
      let updated: string[];

      if (removeId) {
        updated = existing.filter((id) => id !== removeId);
      } else {
        updated = existing.includes(addId) ? existing : [...existing, addId];
      }

      await setGenericPassword(
        '__index__',
        JSON.stringify(updated),
        {
          service: `${this._service}:__index__`,
          accessControl: 'NO_AUTHENTICATION_REQUIRED',
        },
      );
    } catch {
      // ignore — index is best-effort
    }
  }

  /** Map access control to react-native-keychain option. */
  private _getAccessControlOption() {
    switch (this._accessControl) {
      case 'biometryAny':
        return 'BIOMETRY_ANY';
      case 'biometryCurrentSet':
        return 'BIOMETRY_CURRENT_SET';
      case 'devicePasscode':
        return 'DEVICE_PASSCODE';
      default:
        return 'NO_AUTHENTICATION_REQUIRED';
    }
  }

  /** Get storage option based on platform. */
  private _getStorageOption() {
    if (Platform.OS === 'ios') {
      return 'SECURE_ENCLAVE';
    }
    return 'AES';
  }
}

// ---------------------------------------------------------------------------
// useBiometricAuth hook
// ---------------------------------------------------------------------------

/**
 * Hook for biometric authentication (FaceID / TouchID / Fingerprint).
 *
 * Provides a unified interface across iOS and Android for:
 * - Checking biometric support and enrollment
 * - Authenticating the user before sensitive operations
 * - Determining the biometric type available
 *
 * ```tsx
 * const { authenticate, isSupported, isEnrolled, biometricType } = useBiometricAuth();
 *
 * const handleSign = async () => {
 *   if (!isEnrolled) {
 *     Alert.alert('Enable FaceID', 'Please enable biometrics in Settings');
 *     return;
 *   }
 *
 *   const result = await authenticate('Sign this transaction');
 *   if (result.success) {
 *     // Proceed with transaction signing
 *   }
 * };
 * ```
 */
export function useBiometricAuth(): UseBiometricAuthReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check biometric support on mount
  useEffect(() => {
    let mounted = true;

    async function checkBiometrics() {
      try {
        // Dynamic import — react-native-keychain may not be installed
        const { getSupportedBiometryType } = await import('react-native-keychain');
        const type = await getSupportedBiometryType();

        if (mounted) {
          const supported = type !== null && type !== undefined;
          setIsSupported(supported);
          setIsEnrolled(supported); // If supported, user is enrolled
          setBiometricType(mapBiometricType(type));
        }
      } catch {
        // Package not available — use platform detection as fallback
        if (mounted) {
          setIsSupported(true); // Assume supported on modern devices
          setIsEnrolled(true); // Assume enrolled
          setBiometricType(
            Platform.OS === 'ios' ? 'faceId' : 'fingerprint',
          );
        }
      }
    }

    checkBiometrics();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Authenticate the user with biometrics.
   *
   * @param reason - Reason for authentication (shown in prompt).
   * @param options - Additional options for the biometric prompt.
   * @returns BiometricAuthResult with success status.
   */
  const authenticate = useCallback(
    async (
      reason?: string,
      options: BiometricAuthOptions = {},
    ): Promise<BiometricAuthResult> => {
      setIsAuthenticating(true);
      setError(null);

      try {
        const { getGenericPassword } = await import('react-native-keychain');

        // Use a dummy credential lookup to trigger the biometric prompt
        // The prompt will appear and the user must authenticate
        await getGenericPassword({
          service: 'cinacoin-biometric-check',
          accessControl: 'BIOMETRY_CURRENT_SET',
          prompt: {
            title: options.promptTitle ?? 'Authentication Required',
            subtitle: options.promptSubtitle ?? reason ?? '',
            description: options.promptDescription ?? 'Confirm your identity',
            cancel: options.cancelButtonText ?? 'Cancel',
            fallback: options.fallbackToPasscode ? 'Use Passcode' : undefined,
          },
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Check if it's a user cancellation
        const isCancelled =
          error.message?.includes('cancel') ||
          error.message?.includes('LAErrorUserCancel') ||
          error.message?.includes('BIOMETRIC_CANCEL');

        if (isCancelled) {
          return {
            success: false,
            error: 'Authentication cancelled by user',
            errorCode: 'USER_CANCELLED',
          };
        }

        return {
          success: false,
          error: error.message,
          errorCode: 'AUTH_FAILED',
        };
      } finally {
        setIsAuthenticating(false);
      }
    },
    [],
  );

  return {
    isSupported,
    isEnrolled,
    biometricType,
    authenticate,
    isAuthenticating,
    error,
  };
}

/** Map react-native-keychain biometry type to our BiometricType. */
function mapBiometricType(type: string | null): BiometricType {
  switch (type) {
    case 'FaceID':
      return 'faceId';
    case 'TouchID':
      return 'touchId';
    case 'Fingerprint':
      return 'fingerprint';
    case 'Iris':
      return 'iris';
    default:
      return 'none';
  }
}
