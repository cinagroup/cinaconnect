/**
 * @cinacoin/kyc — KYC/AML compliance screening for transactions and payments.
 *
 * @packageDocumentation
 */
/* ── sanctions / risk lists ────────────────────────────────────── */
export { seedLists, isSanctioned, isMixer, isScamAddress, isRiskyExchange, getMatchedLists, listBasedRiskLevel, updateLists, } from './lists.js';
/* ── screening engine ──────────────────────────────────────────── */
export { screenAddress, screenTransaction, screenPayment, getRiskScore, getComplianceReport, } from './screening.js';
/* ── React hooks ───────────────────────────────────────────────── */
export { useKycScreening, usePaymentScreening } from './hooks/useKycScreening.js';
/* ── React components ──────────────────────────────────────────── */
export { KycBadge } from './components/KycBadge.js';
export { KycModal } from './components/KycModal.js';
//# sourceMappingURL=index.js.map