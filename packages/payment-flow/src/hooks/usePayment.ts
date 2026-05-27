import { useState, useCallback } from "react";
import type {
  UsePaymentReturn,
  BuyParams,
  SendParams,
  ReceiveParams,
  ReceiveResult,
  Transaction,
  AssetBalance,
  PaymentConfig,
} from "../types";

/**
 * Default stub balances shown when no SDK data is available.
 * Consumers should wire real data via the core-sdk integration.
 */
function defaultBalances(): AssetBalance[] {
  return [];
}

/**
 * Default stub transactions shown when no SDK data is available.
 */
function defaultTransactions(): Transaction[] {
  return [];
}

/**
 * React hook that exposes the full payment surface: buy, send, receive,
 * balances, and transaction history.
 *
 * Currently provides a mock/stub implementation. Connect to
 * `@cinacoin/core-sdk` for real on-chain execution.
 *
 * @example
 * ```tsx
 * const { buy, send, loading } = usePayment(config);
 * ```
 */
export function usePayment(config: PaymentConfig): UsePaymentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [balances] = useState<AssetBalance[]>(defaultBalances);

  /** On-ramp: purchase crypto with fiat through a third-party provider. */
  const buy = useCallback(
    async (params: BuyParams): Promise<Transaction> => {
      setLoading(true);
      setError(null);
      try {
        // TODO: integrate with core-sdk for real provider iframe / redirect
        const tx: Transaction = {
          hash: `0xbuy_${Date.now()}`,
          type: "buy",
          status: "pending",
          token: params.token,
          amount: params.fiatAmount,
          fiatValue: `${params.fiatAmount} ${params.currency}`,
          from: "fiat",
          to: config.walletAddress,
          timestamp: Date.now(),
          providerId: params.providerId,
        };
        setTransactions((prev: Transaction[]) => [tx, ...prev]);
        return tx;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Buy failed";
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [config.walletAddress],
  );

  /** Send tokens to a recipient address on-chain. */
  const send = useCallback(
    async (params: SendParams): Promise<Transaction> => {
      setLoading(true);
      setError(null);
      try {
        // TODO: integrate with core-sdk for real transaction signing
        const tx: Transaction = {
          hash: `0xsend_${Date.now()}`,
          type: "send",
          status: "pending",
          token: params.token,
          amount: params.amount,
          from: config.walletAddress,
          to: params.recipientAddress,
          timestamp: Date.now(),
        };
        setTransactions((prev: Transaction[]) => [tx, ...prev]);
        return tx;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Send failed";
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [config.walletAddress],
  );

  /** Generate a receive address / QR payload. */
  const receive = useCallback(
    async (_params: ReceiveParams): Promise<ReceiveResult> => {
      setLoading(true);
      setError(null);
      try {
        return {
          address: config.walletAddress,
          qrData: config.walletAddress,
        };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Receive failed";
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [config.walletAddress],
  );

  return {
    buy,
    send,
    receive,
    balances,
    transactions,
    loading,
    error,
  };
}
