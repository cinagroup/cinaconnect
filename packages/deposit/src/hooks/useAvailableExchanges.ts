import { useMemo } from "react";
import { ExchangeInfo } from "../types";
import { depositService as defaultService } from "../provider";

export interface UseAvailableExchangesOptions {
  /** Filter to exchanges that support this chain/network. */
  network?: string;
  /** Filter to exchanges that support this address format. */
  address?: string;
}

/**
 * Hook that returns a filtered list of available exchanges
 * based on the user's target chain and/or address.
 *
 * @example
 * ```tsx
 * const { exchanges, isAvailable } = useAvailableExchanges({ network: "base" });
 * ```
 */
export function useAvailableExchanges(
  options: UseAvailableExchangesOptions = {}
): {
  /** Filtered list of exchanges matching the criteria. */
  exchanges: ExchangeInfo[];
  /** Whether a specific exchange ID is available. */
  isAvailable: (exchangeId: string) => boolean;
} {
  const { network, address } = options;

  const allExchanges = defaultService.getAllExchanges();

  const exchanges = useMemo(() => {
    return allExchanges.filter((ex) => {
      // Network filter: only show exchanges that support this network
      if (network && !ex.supportedNetworks.includes(network)) {
        return false;
      }

      // Address filter: Solana addresses are base58 (not 0x-prefixed)
      // so we can filter out non-Solana exchanges for Solana addresses
      if (address) {
        const isSolanaAddress =
          !address.startsWith("0x") && address.length >= 32;
        if (isSolanaAddress && !ex.supportedNetworks.includes("solana")) {
          return false;
        }
        const isEvmAddress = address.startsWith("0x");
        if (
          isEvmAddress &&
          !ex.supportedNetworks.some(
            (n) => n !== "solana"
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allExchanges, network, address]);

  const isAvailable = useMemo(() => {
    const availableIds = new Set(exchanges.map((e) => e.id));
    return (exchangeId: string) => availableIds.has(exchangeId);
  }, [exchanges]);

  return { exchanges, isAvailable };
}
