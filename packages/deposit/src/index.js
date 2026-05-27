/**
 * @cinacoin/deposit
 *
 * Deposit with Exchange feature — initiate, track, and manage
 * crypto deposits via major exchanges (Binance, OKX, Bybit, KuCoin, Coinbase).
 *
 * @packageDocumentation
 */
// Types
export { DepositStatus, } from "./types";
// Service
export { DepositService, depositService } from "./provider";
// Exchange configs
export { EXCHANGES } from "./exchanges";
// Hooks
export { useDeposit } from "./hooks/useDeposit";
export { useAvailableExchanges, } from "./hooks/useAvailableExchanges";
// Components
export { DepositModal } from "./components/DepositModal";
export { DepositButton } from "./components/DepositButton";
//# sourceMappingURL=index.js.map