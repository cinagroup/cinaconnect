/**
 * @cinacoin/payment-flow
 *
 * Complete payment UI components — Buy, Send, Receive flow.
 * Production-ready React components with Tailwind CSS styling.
 */

// ---- Types ----
export type {
  Token,
  ChainId,
  ProviderId,
  PaymentProvider,
  TransactionStatus,
  TransactionType,
  Transaction,
  AssetBalance,
  PaymentConfig,
  UsePaymentReturn,
  BuyParams,
  SendParams,
  ReceiveParams,
  ReceiveResult,
} from "./types";

// ---- Hooks ----
export { usePayment } from "./hooks/usePayment";

// ---- Components ----

/** Buy (onramp) page */
export { BuyPage } from "./components/Buy/BuyPage";
export type { BuyPageProps } from "./components/Buy/BuyPage";

/** Send page */
export { SendPage } from "./components/Send/SendPage";
export type { SendPageProps } from "./components/Send/SendPage";

/** Receive page */
export { ReceivePage } from "./components/Receive/ReceivePage";
export type { ReceivePageProps } from "./components/Receive/ReceivePage";

/** Asset inventory */
export { AssetInventory } from "./components/AssetInventory/AssetInventory";
export type { AssetInventoryProps } from "./components/AssetInventory/AssetInventory";

/** Profile page */
export { ProfilePage } from "./components/Profile/ProfilePage";
export type { ProfilePageProps, LinkedProvider } from "./components/Profile/ProfilePage";

/** Connected (account overview) page */
export { ConnectedPage } from "./components/Connected/ConnectedPage";
export type { ConnectedPageProps } from "./components/Connected/ConnectedPage";
