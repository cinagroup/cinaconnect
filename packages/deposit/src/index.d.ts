/**
 * @cinacoin/deposit
 *
 * Deposit with Exchange feature — initiate, track, and manage
 * crypto deposits via major exchanges (Binance, OKX, Bybit, KuCoin, Coinbase).
 *
 * @packageDocumentation
 */
export { DepositStatus, ExchangeInfo, AssetInfo, NetworkInfo, FeeStructure, DepositUrlParams, DepositRequest, DepositResult, TrackDepositParams, } from "./types";
export { DepositService, depositService } from "./provider";
export { EXCHANGES } from "./exchanges";
export { useDeposit, type UseDepositOptions, type UseDepositReturn } from "./hooks/useDeposit";
export { useAvailableExchanges, type UseAvailableExchangesOptions, } from "./hooks/useAvailableExchanges";
export { DepositModal, type DepositModalProps } from "./components/DepositModal";
export { DepositButton, type DepositButtonProps } from "./components/DepositButton";
//# sourceMappingURL=index.d.ts.map