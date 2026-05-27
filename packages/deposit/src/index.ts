/**
 * @cinacoin/deposit
 *
 * Deposit with Exchange feature — initiate, track, and manage
 * crypto deposits via major exchanges (Binance, OKX, Bybit, KuCoin, Coinbase).
 *
 * @packageDocumentation
 */

// Types
export {
  DepositStatus,
} from "./types";
export type {
  ExchangeInfo,
  AssetInfo,
  NetworkInfo,
  FeeStructure,
  DepositUrlParams,
  DepositRequest,
  DepositResult,
  TrackDepositParams,
} from "./types";

// Service
export { DepositService, depositService } from "./provider";

// Exchange configs
export { EXCHANGES } from "./exchanges";

// Hooks
export { useDeposit, type UseDepositOptions, type UseDepositReturn } from "./hooks/useDeposit";
export {
  useAvailableExchanges,
  type UseAvailableExchangesOptions,
} from "./hooks/useAvailableExchanges";

// Components
export { DepositModal, type DepositModalProps } from "./components/DepositModal";
export { DepositButton, type DepositButtonProps } from "./components/DepositButton";
