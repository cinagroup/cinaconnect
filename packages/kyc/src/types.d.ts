/**
 * KYC/AML compliance types for the @cinacoin/kyc package.
 */
/** Overall KYC compliance status for an entity. */
export type KycStatus = 'verified' | 'pending' | 'unverified' | 'flagged' | 'rejected';
/** Risk level assigned to an address or transaction. */
export type RiskLevel = 'low' | 'medium' | 'high' | 'sanctioned';
/** Result of a screening operation. */
export interface ScreeningResult {
    /** Address or identifier that was screened. */
    address: string;
    /** Overall risk level. */
    riskLevel: RiskLevel;
    /** Numeric risk score 0–100 (0 = safest, 100 = highest risk). */
    riskScore: number;
    /** Whether the address appears on any sanctions list. */
    isSanctioned: boolean;
    /** List of matched list names (e.g. "OFAC SDN", "EU Sanctions"). */
    matchedLists: string[];
    /** Additional context / reason codes. */
    flags: string[];
    /** ISO-8601 timestamp of the screening. */
    screenedAt: string;
}
/** Detailed risk profile for an address. */
export interface AddressRiskProfile {
    /** The address. */
    address: string;
    /** Risk score 0–100. */
    riskScore: number;
    /** Risk level bucket. */
    riskLevel: RiskLevel;
    /** Known entity label (exchange, mixer, etc.), if identified. */
    entityLabel?: string;
    /** Category of entity. */
    entityCategory?: 'exchange' | 'mixer' | 'gambling' | 'darknet' | 'defi' | 'individual' | 'unknown';
    /** Whether on sanctions lists. */
    sanctioned: boolean;
    /** Sanctioning bodies, if applicable. */
    sanctioningBodies: string[];
    /** Number of suspicious transactions observed. */
    suspiciousTxCount: number;
    /** ISO-8601 last update time. */
    lastUpdated: string;
}
/** Input for a transaction to be screened. */
export interface TransactionInput {
    /** Sender address. */
    from: string;
    /** Recipient address. */
    to: string;
    /** Transfer amount (in smallest unit or human-readable; document). */
    amount: string | number;
    /** Asset symbol or contract address. */
    asset: string;
    /** Optional network/chain identifier. */
    network?: string;
}
/** Output of transaction risk analysis. */
export interface TransactionRisk {
    /** Copy of the input transaction. */
    tx: TransactionInput;
    /** Composite risk score 0–100. */
    riskScore: number;
    /** Risk level. */
    riskLevel: RiskLevel;
    /** Sender-side screening result. */
    senderResult: ScreeningResult;
    /** Recipient-side screening result. */
    recipientResult: ScreeningResult;
    /** Pattern-based risk flags (e.g. "round-amount", "rapid-split"). */
    patternFlags: string[];
    /** Whether the transaction should be blocked. */
    shouldBlock: boolean;
    /** Human-readable recommendation. */
    recommendation: string;
    /** ISO-8601 timestamp. */
    screenedAt: string;
}
/** Parameters for a pre-payment screening. */
export interface PaymentScreeningParams {
    /** Recipient address. */
    recipient: string;
    /** Amount to send. */
    amount: string | number;
    /** Asset symbol or contract address. */
    asset: string;
    /** Optional sender address (defaults to zero-address if omitted). */
    sender?: string;
    /** Optional network. */
    network?: string;
}
/** Full compliance report for an address. */
export interface ComplianceReport {
    /** The address. */
    address: string;
    /** KYC status. */
    kycStatus: KycStatus;
    /** Risk profile. */
    riskProfile: AddressRiskProfile;
    /** Screening result. */
    screening: ScreeningResult;
    /** Historical sanctions matches. */
    sanctionsHistory: Array<{
        list: string;
        addedAt: string;
        removedAt?: string;
    }>;
    /** Recommended action. */
    recommendation: 'allow' | 'review' | 'block';
    /** ISO-8601 report generation time. */
    generatedAt: string;
}
//# sourceMappingURL=types.d.ts.map