/**
 * React hook for wallet recovery using Shamir's Secret Sharing.
 *
 * Provides a complete share creation and recovery flow with state management
 * for multi-provider wallet recovery.
 */

import { useState, useCallback } from 'react';
import {
  WalletRecovery,
  hexToBytes,
  bytesToHex,
  encryptShare,
  decryptShare,
  splitSecret,
  combineShares,
  deriveKeyFromPassword,
} from './WalletRecovery.js';
import type {
  RecoveryShare,
  RecoverySetupConfig,
  RecoverySetupResult,
  AddRecoveryProviderParams,
  RecoveryResult,
  RecoveryProviderType,
  PasswordStrengthResult,
  EncryptedShareBundle,
} from './types.js';
import { randomBytes } from '@noble/hashes/utils.js';

export interface UseWalletRecoveryReturn {
  /** The wallet recovery manager instance. */
  recovery: WalletRecovery;
  /** Current wallet ID (set after creating recovery shares). */
  walletId: string | null;
  /** Whether an async operation is in progress. */
  isLoading: boolean;
  /** Any error from the last operation. */
  error: string | null;
  /** Generated recovery shares (if available). */
  shares: RecoveryShare[];
  /** The threshold for recovery. */
  threshold: number;
  /** Total shares created. */
  totalShares: number;

  /** Create recovery shares for a wallet. */
  createRecoveryShares: (walletId: string, config: RecoverySetupConfig) => RecoverySetupResult;
  /** Add a recovery provider to the wallet. */
  addRecoveryProvider: (params: AddRecoveryProviderParams) => RecoveryShare;
  /** Recover wallet using collected shares. */
  recoverWithProviders: (shares: RecoveryShare[]) => Promise<RecoveryResult>;
  /** Recover wallet using password. */
  recoverWithPassword: (walletId: string, password: string) => Promise<RecoveryResult>;
  /** Set a password for recovery. */
  setPassword: (walletId: string, password: string) => Promise<boolean>;
  /** Analyze password strength. */
  analyzePassword: (password: string) => PasswordStrengthResult;
  /** Clear current state and error. */
  reset: () => void;
}

/**
 * React hook for wallet recovery with Shamir's Secret Sharing.
 *
 * @param initialRecovery - Optional WalletRecovery instance (creates a new one if omitted).
 * @returns Wallet recovery state and operations.
 *
 * @example
 * ```tsx
 * function WalletRecoverySetup() {
 *   const {
 *     createRecoveryShares,
 *     addRecoveryProvider,
 *     recoverWithProviders,
 *     isLoading,
 *     error,
 *   } = useWalletRecovery();
 *
 *   const handleSetup = () => {
 *     const result = createRecoveryShares(walletId, {
 *       totalShares: 5,
 *       threshold: 3,
 *       walletSecret: seedHex,
 *     });
 *     // Distribute shares to providers...
 *   };
 * }
 * ```
 */
export function useWalletRecovery(
  initialRecovery?: WalletRecovery
): UseWalletRecoveryReturn {
  const [recovery] = useState(() => initialRecovery || new WalletRecovery());
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<RecoveryShare[]>([]);
  const [threshold, setThreshold] = useState(0);
  const [totalShares, setTotalShares] = useState(0);

  const createRecoveryShares = useCallback(
    (walletId: string, config: RecoverySetupConfig): RecoverySetupResult => {
      try {
        setError(null);
        const result = recovery.createRecoveryShares(walletId, config);
        setWalletId(result.walletId);
        setShares(result.shares);
        setThreshold(result.threshold);
        setTotalShares(result.totalShares);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create recovery shares';
        setError(message);
        throw err;
      }
    },
    [recovery]
  );

  const addRecoveryProvider = useCallback(
    (params: AddRecoveryProviderParams): RecoveryShare => {
      try {
        setError(null);
        const share = recovery.addRecoveryProvider(params.walletId, params);
        setShares((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((s) => s.shareIndex === share.shareIndex);
          if (idx >= 0) {
            updated[idx] = share;
          } else {
            updated.push(share);
          }
          return updated;
        });
        return share;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add recovery provider';
        setError(message);
        throw err;
      }
    },
    [recovery]
  );

  const recoverWithProviders = useCallback(
    async (shares: RecoveryShare[]): Promise<RecoveryResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await recovery.recoverWithProviders({ shares });
        if (result.success) {
          setWalletId(walletId);
        } else {
          setError(result.error || 'Recovery failed');
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Recovery failed';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [recovery, walletId]
  );

  const recoverWithPassword = useCallback(
    async (walletId: string, password: string): Promise<RecoveryResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await recovery.recoverWithPassword({ walletId, password });
        if (!result.success) {
          setError(result.error || 'Password recovery failed');
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Password recovery failed';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [recovery]
  );

  const setPassword = useCallback(
    async (walletId: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await recovery.setPassword({ walletId, password });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set password';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [recovery]
  );

  const analyzePassword = useCallback(
    (password: string): PasswordStrengthResult => {
      return recovery.analyzePasswordStrength(password);
    },
    [recovery]
  );

  const reset = useCallback(() => {
    setWalletId(null);
    setError(null);
    setShares([]);
    setThreshold(0);
    setTotalShares(0);
  }, []);

  return {
    recovery,
    walletId,
    isLoading,
    error,
    shares,
    threshold,
    totalShares,
    createRecoveryShares,
    addRecoveryProvider,
    recoverWithProviders,
    recoverWithPassword,
    setPassword,
    analyzePassword,
    reset,
  };
}

export default useWalletRecovery;
