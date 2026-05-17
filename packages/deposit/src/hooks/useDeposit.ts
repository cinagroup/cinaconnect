import { useState, useCallback, useEffect, useRef } from "react";
import {
  DepositRequest,
  DepositResult,
  DepositStatus,
  TrackDepositParams,
} from "../types";
import { DepositService, depositService as defaultService } from "../provider";

export interface UseDepositReturn {
  /** Whether a deposit is currently in progress. */
  isLoading: boolean;
  /** The most recent deposit result (if any). */
  deposit: DepositResult | null;
  /** Error from the last operation (if any). */
  error: Error | null;
  /** Initiate a deposit — sets loading, returns a result with redirect URL. */
  initiateDeposit: (request: DepositRequest) => Promise<DepositResult>;
  /** Track deposit status by ID. */
  trackDeposit: (params: TrackDepositParams) => Promise<DepositResult>;
  /** Clear the current deposit state. */
  reset: () => void;
}

export interface UseDepositOptions {
  /** Override the default DepositService instance. */
  service?: DepositService;
  /** Polling interval in ms for status tracking. Default: 5000. */
  pollIntervalMs?: number;
  /** Maximum number of polling attempts before stopping. Default: 60 (5 min at 5s). */
  maxPolls?: number;
}

/**
 * Hook to manage deposit initiation and status tracking.
 *
 * @example
 * ```tsx
 * const { initiateDeposit, deposit, isLoading, error } = useDeposit();
 *
 * const handleDeposit = async () => {
 *   const result = await initiateDeposit({
 *     exchangeId: "binance",
 *     asset: "USDC",
 *     network: "base",
 *     amount: 100,
 *   });
 *   // redirect user: window.open(result.depositUrl)
 * };
 * ```
 */
export function useDeposit(options: UseDepositOptions = {}): UseDepositReturn {
  const {
    service = defaultService,
    pollIntervalMs = 5000,
    maxPolls = 60,
  } = options;

  const [deposit, setDeposit] = useState<DepositResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pollCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /** Start polling for deposit status updates. */
  const startPolling = useCallback(
    (params: TrackDepositParams) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      pollCount.current = 0;

      intervalRef.current = setInterval(async () => {
        pollCount.current += 1;
        if (pollCount.current > maxPolls) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }

        try {
          const result = service.trackDeposit(params);
          setDeposit(result);

          // Stop polling on terminal status
          if (
            result.status === DepositStatus.COMPLETED ||
            result.status === DepositStatus.FAILED
          ) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        } catch (err) {
          setError(err instanceof Error ? err : new Error(String(err)));
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, pollIntervalMs);
    },
    [service, pollIntervalMs, maxPolls]
  );

  const initiateDeposit = useCallback(
    async (request: DepositRequest): Promise<DepositResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = service.initiateDeposit(request);
        setDeposit(result);
        // Start polling after a brief delay (user needs time to redirect)
        setTimeout(() => {
          startPolling({ depositId: result.depositId, exchangeId: request.exchangeId });
        }, 3000);
        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [service, startPolling]
  );

  const trackDeposit = useCallback(
    async (params: TrackDepositParams): Promise<DepositResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = service.trackDeposit(params);
        setDeposit(result);
        startPolling(params);
        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [service, startPolling]
  );

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    pollCount.current = 0;
    setDeposit(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    deposit,
    error,
    initiateDeposit,
    trackDeposit,
    reset,
  };
}
