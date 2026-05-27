/**
 * @cinacoin/kyc — KYC/AML compliance screening for transactions and payments.
 *
 * @packageDocumentation
 */

/* ── types ─────────────────────────────────────────────────────── */

export type {
  KycStatus,
  ScreeningResult,
  RiskLevel,
  TransactionRisk,
  TransactionInput,
  AddressRiskProfile,
  PaymentScreeningParams,
  ComplianceReport,
} from './types.js';

/* ── sanctions / risk lists ────────────────────────────────────── */

export {
  seedLists,
  isSanctioned,
  isMixer,
  isScamAddress,
  isRiskyExchange,
  getMatchedLists,
  listBasedRiskLevel,
  updateLists,
} from './lists.js';

export type { ListUpdate } from './lists.js';

/* ── screening engine ──────────────────────────────────────────── */

export {
  screenAddress,
  screenTransaction,
  screenPayment,
  getRiskScore,
  getComplianceReport,
} from './screening.js';

/* ── React hooks ───────────────────────────────────────────────── */

export { useKycScreening, usePaymentScreening } from './hooks/useKycScreening.js';

export type {
  UseKycScreeningReturn,
  UsePaymentScreeningReturn,
} from './hooks/useKycScreening.js';

/* ── React components ──────────────────────────────────────────── */

export { KycBadge } from './components/KycBadge.js';

export type { KycBadgeProps } from './components/KycBadge.js';

export { KycModal } from './components/KycModal.js';

export type {
  KycModalProps,
  KycSubmissionPayload,
} from './components/KycModal.js';
