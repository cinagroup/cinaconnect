/**
 * @cinacoin/travel-rule
 *
 * FATF Travel Rule compliance engine for virtual asset transfers.
 *
 * Implements the FATF Recommendation 16 data format for cross-VASP
 * (Virtual Asset Service Provider) information exchange. Supports
 * originator/beneficiary data validation, compliance screening,
 * and integration with Chainalysis/Elliptic for risk scoring.
 *
 * ## Usage
 *
 * ```typescript
 * import { TravelRuleEngine, VaspRegistry } from '@cinacoin/travel-rule';
 *
 * const engine = new TravelRuleEngine({
 *   thresholdUsd: 1000,
 *   vaspRegistry: myVaspRegistry,
 *   screeningProvider: 'chainalysis',
 * });
 *
 * const result = await engine.evaluate({
 *   originator: { /* ... * / },
 *   beneficiary: { /* ... * / },
 *   amount: '5000',
 *   asset: 'ETH',
 * });
 *
 * console.log(result.status); // 'approved' | 'rejected' | 'review'
 * ```
 *
 * ## Compliance Notes
 *
 * - Threshold: FATF requires originator/beneficiary data for transfers
 *   above USD/EUR 1,000 (jurisdictions may set lower limits).
 * - Data retention: PII must be retained for 5 years minimum.
 * - Encryption: All data in transit must use TLS 1.3+ with mutual auth.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Geographic region code (ISO 3166-1 alpha-2). */
export type CountryCode = string;

/** Asset ticker symbol. */
export type AssetSymbol = 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'SOL' | 'BNB' | 'XRP' | string;

/** Compliance check result status. */
export type ComplianceStatus = 'approved' | 'rejected' | 'review' | 'pending';

/** Screening provider name identifier. */
export type ScreeningProviderName = 'chainalysis' | 'elliptic' | 'ciphertrace' | 'none';

/** Transfer direction. */
export type TransferDirection = 'inbound' | 'outbound' | 'internal';

// ─── Individual / Entity Identification ─────────────────────────────────

/** Natural person identification data. */
export interface NaturalPerson {
  /** Full legal name (given + surname). */
  name: string;
  /** Date of birth (ISO 8601: YYYY-MM-DD). */
  dateOfBirth?: string;
  /** Place of birth (city, country). */
  placeOfBirth?: string;
  /** National identification number. */
  nationalId?: string;
  /** National ID type (e.g., "passport", "national_id", "drivers_license"). */
  nationalIdType?: string;
  /** Country of issuance for national ID. */
  nationalIdCountry?: CountryCode;
  /** Customer identification number assigned by the VASP. */
  customerId?: string;
}

/** Legal entity identification data. */
export interface LegalEntity {
  /** Registered legal name. */
  name: string;
  /** Registration number (company registry). */
  registrationNumber?: string;
  /** Registered address. */
  registeredAddress?: string;
  /** Country of incorporation. */
  countryOfIncorporation?: CountryCode;
  /** Legal entity identifier (LEI). */
  lei?: string;
  /** Tax identification number. */
  taxId?: string;
}

/** Originator or beneficiary data container. */
export interface TravelRuleParty {
  /** Whether this party is a natural person or legal entity. */
  type: 'natural_person' | 'legal_entity';
  /** Natural person data (if type is natural_person). */
  naturalPerson?: NaturalPerson;
  /** Legal entity data (if type is legal_entity). */
  legalEntity?: LegalEntity;
  /** Virtual asset wallet address. */
  walletAddress: string;
  /** Additional geographic address. */
  geographicAddress?: string;
  /** Country of residence (ISO 3166-1 alpha-2). */
  country?: CountryCode;
  /** Phone number (E.164 format). */
  phoneNumber?: string;
  /** Email address. */
  email?: string;
}

// ─── Travel Rule Payload ────────────────────────────────────────────────

/**
 * Complete FATF Travel Rule data payload.
 *
 * Conforms to the FATF Recommendation 16 wire transfer information
 * requirements for virtual asset transfers between VASPs.
 */
export interface TravelRulePayload {
  /** Unique transfer identifier (UUID v4 recommended). */
  transferId: string;
  /** Direction of the transfer. */
  direction: TransferDirection;
  /** Originator (sender) information. */
  originator: TravelRuleParty;
  /** Originator's VASP identifier (LEI or DID). */
  originatorVasp: string;
  /** Beneficiary (receiver) information. */
  beneficiary: TravelRuleParty;
  /** Beneficiary's VASP identifier (LEI or DID). */
  beneficiaryVasp: string;
  /** Transfer amount as a string (to preserve precision). */
  amount: string;
  /** Asset ticker symbol. */
  asset: AssetSymbol;
  /** On-chain transaction hash (when available). */
  txId?: string;
  /** Purpose of transfer (free text, optional). */
  purpose?: string;
  /** Timestamp of transfer initiation (ISO 8601). */
  timestamp: string;
  /** Jurisdiction-specific additional data. */
  jurisdictionData?: Record<string, unknown>;
}

// ─── Screening Result ───────────────────────────────────────────────────

/** Result from a compliance screening provider. */
export interface ScreeningResult {
  /** Provider that performed the screening. */
  provider: ScreeningProviderName;
  /** Risk score (0 = clean, 100 = highest risk). */
  riskScore: number;
  /** Risk category label. */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Whether the address is on a sanctions list. */
  sanctioned: boolean;
  /** Sanctions list name(s) if sanctioned. */
  sanctionsLists?: string[];
  ///** Whether the address is associated with illicit activity. */
  illicitActivity: boolean;
  /** Illicit category labels (e.g., "darknet", "ransomware"). */
  illicitCategories?: string[];
  /** Screening timestamp. */
  screenedAt: string;
  /** Raw provider response (opaque). */
  rawResponse?: Record<string, unknown>;
}

// ─── Compliance Check ───────────────────────────────────────────────────

/** Result of a single compliance check step. */
export interface ComplianceCheck {
  /** Check identifier. */
  checkId: string;
  /** Human-readable description. */
  description: string;
  /** Pass/fail/pending status. */
  status: 'pass' | 'fail' | 'pending' | 'skipped';
  /** Risk score contribution (0-100). */
  riskContribution: number;
  /** Details or failure reason. */
  details?: string;
}

// ─── Evaluation Result ──────────────────────────────────────────────────

/**
 * Complete compliance evaluation result for a Travel Rule payload.
 */
export interface TravelRuleResult {
  /** Overall compliance status. */
  status: ComplianceStatus;
  /** Whether the transfer amount exceeds the regulatory threshold. */
  aboveThreshold: boolean;
  /** Required regulatory threshold in USD. */
  thresholdUsd: number;
  /** Estimated USD value of the transfer. */
  estimatedUsdValue: number;
  /** List of compliance checks performed. */
  checks: ComplianceCheck[];
  /** Screening result for the originator address. */
  originatorScreening?: ScreeningResult;
  /** Screening result for the beneficiary address. */
  beneficiaryScreening?: ScreeningResult;
  /** Overall risk score (0-100). */
  overallRiskScore: number;
  /** Human-readable compliance reason. */
  reason: string;
  /** Timestamp of evaluation. */
  evaluatedAt: string;
  /** Serialized Travel Rule payload (for audit trail). */
  payload?: TravelRulePayload;
}

// ─── VASP Registry ──────────────────────────────────────────────────────

/**
 * Virtual Asset Service Provider (VASP) record.
 */
export interface VaspRecord {
  /** Unique VASP identifier (LEI, DID, or internal ID). */
  id: string;
  /** Legal name of the VASP. */
  name: string;
  /** Website URL. */
  website: string;
  /** Jurisdiction of incorporation. */
  jurisdiction: CountryCode;
  /** Whether the VASP is licensed/registered. */
  licensed: boolean;
  /** License number. */
  licenseNumber?: string;
  /** Supported assets. */
  supportedAssets: AssetSymbol[];
  /** API endpoint for Travel Rule data exchange. */
  travelRuleEndpoint?: string;
  /** Public key for encrypted data exchange. */
  publicKey?: string;
  /** Compliance contact email. */
  complianceEmail?: string;
}

/**
 * VASP registry interface. Implement to connect to a real registry
 * (e.g., IVMS101, TRISA directory, or a custom internal registry).
 */
export interface VaspRegistry {
  /** Look up a VASP by ID. */
  lookup(id: string): Promise<VaspRecord | null>;
  /** Look up a VASP by wallet address ownership. */
  lookupByWallet(address: string): Promise<VaspRecord | null>;
  /** List all registered VASPs. */
  listAll(): Promise<VaspRecord[]>;
  /** Check if a VASP is licensed. */
  isLicensed(id: string): Promise<boolean>;
}

// ─── Screening Provider Interface ───────────────────────────────────────

/**
 * Abstract interface for blockchain screening providers.
 * Implement for Chainalysis, Elliptic, CipherTrace, etc.
 */
export interface ScreeningProvider {
  /** Screen a single address for risk. */
  screenAddress(address: string): Promise<ScreeningResult>;
  /** Screen multiple addresses in batch. */
  screenBatch(addresses: string[]): Promise<ScreeningResult[]>;
  /** Get the provider name. */
  getProviderName(): ScreeningProviderName;
}

// ─── Engine Configuration ───────────────────────────────────────────────

/** Configuration options for the TravelRuleEngine. */
export interface TravelRuleConfig {
  /** USD threshold below which minimal data is required. Default: 1000. */
  thresholdUsd?: number;
  /** VASP registry instance. */
  vaspRegistry: VaspRegistry;
  /** Screening provider instance to use. Default: none (skip screening). */
  screeningProvider?: ScreeningProvider;
  /** Whether to reject transfers with sanctioned addresses. */
  rejectSanctioned?: boolean;
  /** Whether to require VASP licensing verification. */
  requireLicensedVasp?: boolean;
  /** Maximum acceptable risk score (0-100). */
  maxRiskScore?: number;
}

// ---------------------------------------------------------------------------
// JSON Schema
// ---------------------------------------------------------------------------

/**
 * FATF Travel Rule JSON Schema (IVMS101-compatible).
 * Used for validating incoming/outgoing travel rule payloads.
 */
export const TRAVEL_RULE_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://cinacoin.dev/schemas/travel-rule/v1',
  title: 'FATF Travel Rule Payload',
  description: 'IVMS101-compatible travel rule data format for VASP-to-VASP transfers',
  type: 'object',
  required: ['transferId', 'direction', 'originator', 'originatorVasp', 'beneficiary', 'beneficiaryVasp', 'amount', 'asset', 'timestamp'],
  properties: {
    transferId: { type: 'string', format: 'uuid', description: 'Unique transfer identifier' },
    direction: { type: 'string', enum: ['inbound', 'outbound', 'internal'] },
    originator: {
      type: 'object',
      required: ['type', 'walletAddress'],
      properties: {
        type: { type: 'string', enum: ['natural_person', 'legal_entity'] },
        naturalPerson: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 350 },
            dateOfBirth: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            placeOfBirth: { type: 'string', maxLength: 200 },
            nationalId: { type: 'string', maxLength: 100 },
            nationalIdType: { type: 'string' },
            nationalIdCountry: { type: 'string', pattern: '^[A-Z]{2}$' },
            customerId: { type: 'string', maxLength: 100 },
          },
        },
        legalEntity: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 350 },
            registrationNumber: { type: 'string', maxLength: 50 },
            registeredAddress: { type: 'string', maxLength: 350 },
            countryOfIncorporation: { type: 'string', pattern: '^[A-Z]{2}$' },
            lei: { type: 'string', pattern: '^[A-Z0-9]{20}$' },
            taxId: { type: 'string', maxLength: 50 },
          },
        },
        walletAddress: { type: 'string', minLength: 1, maxLength: 200 },
        geographicAddress: { type: 'string', maxLength: 350 },
        country: { type: 'string', pattern: '^[A-Z]{2}$' },
        phoneNumber: { type: 'string', pattern: '^\\+[1-9]\\d{6,14}$' },
        email: { type: 'string', format: 'email' },
      },
    },
    originatorVasp: { type: 'string', minLength: 1 },
    beneficiary: {
      type: 'object',
      required: ['type', 'walletAddress'],
      properties: {
        type: { type: 'string', enum: ['natural_person', 'legal_entity'] },
        naturalPerson: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 350 },
            dateOfBirth: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            placeOfBirth: { type: 'string', maxLength: 200 },
            nationalId: { type: 'string', maxLength: 100 },
            nationalIdType: { type: 'string' },
            nationalIdCountry: { type: 'string', pattern: '^[A-Z]{2}$' },
            customerId: { type: 'string', maxLength: 100 },
          },
        },
        legalEntity: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 350 },
            registrationNumber: { type: 'string', maxLength: 50 },
            registeredAddress: { type: 'string', maxLength: 350 },
            countryOfIncorporation: { type: 'string', pattern: '^[A-Z]{2}$' },
            lei: { type: 'string', pattern: '^[A-Z0-9]{20}$' },
            taxId: { type: 'string', maxLength: 50 },
          },
        },
        walletAddress: { type: 'string', minLength: 1, maxLength: 200 },
        geographicAddress: { type: 'string', maxLength: 350 },
        country: { type: 'string', pattern: '^[A-Z]{2}$' },
        phoneNumber: { type: 'string', pattern: '^\\+[1-9]\\d{6,14}$' },
        email: { type: 'string', format: 'email' },
      },
    },
    beneficiaryVasp: { type: 'string', minLength: 1 },
    amount: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    asset: { type: 'string', minLength: 1, maxLength: 20 },
    txId: { type: 'string', maxLength: 200 },
    purpose: { type: 'string', maxLength: 500 },
    timestamp: { type: 'string', format: 'date-time' },
    jurisdictionData: { type: 'object' },
  },
} as const;

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/** Validate an EVM address (0x + 40 hex chars). */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/** Validate a Solana address (base58, 32-44 chars). */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/** Validate a generic wallet address (EVM or Solana). */
export function isValidWalletAddress(address: string): boolean {
  return isValidEvmAddress(address) || isValidSolanaAddress(address);
}

/** Validate an ISO 8601 date string (YYYY-MM-DD). */
export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/** Validate a country code (ISO 3166-1 alpha-2). */
export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

/** Validate a phone number (E.164 format). */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/** Validate an email address. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Validation Pipeline
// ---------------------------------------------------------------------------

/** Validation error with field path and message. */
export interface ValidationError {
  /** JSON path to the invalid field (e.g., "originator.naturalPerson.name"). */
  field: string;
  /** Human-readable error message. */
  message: string;
}

/**
 * Validate a TravelRuleParty object.
 * Returns an array of validation errors (empty = valid).
 */
export function validateParty(
  party: TravelRuleParty,
  prefix: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Wallet address
  if (!party.walletAddress) {
    errors.push({ field: `${prefix}.walletAddress`, message: 'walletAddress is required' });
  } else if (!isValidWalletAddress(party.walletAddress)) {
    errors.push({ field: `${prefix}.walletAddress`, message: 'Invalid wallet address format' });
  }

  // Type discriminator
  if (!party.type) {
    errors.push({ field: `${prefix}.type`, message: 'type is required' });
  } else if (party.type !== 'natural_person' && party.type !== 'legal_entity') {
    errors.push({ field: `${prefix}.type`, message: 'type must be "natural_person" or "legal_entity"' });
  }

  // Natural person
  if (party.type === 'natural_person') {
    if (!party.naturalPerson?.name) {
      errors.push({ field: `${prefix}.naturalPerson.name`, message: 'name is required for natural persons' });
    }
    if (party.naturalPerson?.dateOfBirth && !isValidDate(party.naturalPerson.dateOfBirth)) {
      errors.push({ field: `${prefix}.naturalPerson.dateOfBirth`, message: 'dateOfBirth must be YYYY-MM-DD format' });
    }
    if (party.naturalPerson?.nationalIdCountry && !isValidCountryCode(party.naturalPerson.nationalIdCountry)) {
      errors.push({ field: `${prefix}.naturalPerson.nationalIdCountry`, message: 'nationalIdCountry must be ISO 3166-1 alpha-2' });
    }
  }

  // Legal entity
  if (party.type === 'legal_entity') {
    if (!party.legalEntity?.name) {
      errors.push({ field: `${prefix}.legalEntity.name`, message: 'name is required for legal entities' });
    }
    if (party.legalEntity?.countryOfIncorporation && !isValidCountryCode(party.legalEntity.countryOfIncorporation)) {
      errors.push({ field: `${prefix}.legalEntity.countryOfIncorporation`, message: 'countryOfIncorporation must be ISO 3166-1 alpha-2' });
    }
    if (party.legalEntity?.lei && !/^[A-Z0-9]{20}$/.test(party.legalEntity.lei)) {
      errors.push({ field: `${prefix}.legalEntity.lei`, message: 'LEI must be 20 alphanumeric characters' });
    }
  }

  // Optional fields format validation
  if (party.country && !isValidCountryCode(party.country)) {
    errors.push({ field: `${prefix}.country`, message: 'country must be ISO 3166-1 alpha-2' });
  }
  if (party.phoneNumber && !isValidPhone(party.phoneNumber)) {
    errors.push({ field: `${prefix}.phoneNumber`, message: 'phoneNumber must be E.164 format' });
  }
  if (party.email && !isValidEmail(party.email)) {
    errors.push({ field: `${prefix}.email`, message: 'Invalid email format' });
  }

  return errors;
}

/**
 * Validate a complete TravelRulePayload.
 * Returns an array of validation errors (empty = valid).
 */
export function validateTravelRulePayload(
  payload: TravelRulePayload,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!payload.transferId) {
    errors.push({ field: 'transferId', message: 'transferId is required' });
  }
  if (!payload.amount) {
    errors.push({ field: 'amount', message: 'amount is required' });
  } else if (!/^[0-9]+(\.[0-9]+)?$/.test(payload.amount)) {
    errors.push({ field: 'amount', message: 'amount must be a positive number string' });
  }
  if (!payload.asset) {
    errors.push({ field: 'asset', message: 'asset is required' });
  }
  if (!payload.timestamp) {
    errors.push({ field: 'timestamp', message: 'timestamp is required' });
  }
  if (!payload.originatorVasp) {
    errors.push({ field: 'originatorVasp', message: 'originatorVasp is required' });
  }
  if (!payload.beneficiaryVasp) {
    errors.push({ field: 'beneficiaryVasp', message: 'beneficiaryVasp is required' });
  }
  if (!payload.direction) {
    errors.push({ field: 'direction', message: 'direction is required' });
  }

  // Party validation
  errors.push(...validateParty(payload.originator, 'originator'));
  errors.push(...validateParty(payload.beneficiary, 'beneficiary'));

  return errors;
}

// ---------------------------------------------------------------------------
// Compliance Check Pipeline
// ---------------------------------------------------------------------------

/** Build a compliance check object. */
function makeCheck(
  checkId: string,
  description: string,
  status: ComplianceCheck['status'],
  riskContribution: number,
  details?: string,
): ComplianceCheck {
  return { checkId, description, status, riskContribution, details };
}

/**
 * Run the full compliance check pipeline on a Travel Rule payload.
 *
 * Checks performed:
 * 1. TR-001: Payload validation (schema compliance)
 * 2. TR-002: Threshold check (amount vs regulatory minimum)
 * 3. TR-003: VASP licensing verification
 * 4. TR-004: Originator address screening
 * 5. TR-005: Beneficiary address screening
 * 6. TR-006: Sanctions list check
 * 7. TR-007: Illicit activity check
 * 8. TR-008: Same-VASP internal transfer check
 */
export async function runCompliancePipeline(
  payload: TravelRulePayload,
  config: TravelRuleConfig,
): Promise<ComplianceCheck[]> {
  const checks: ComplianceCheck[] = [];
  const threshold = config.thresholdUsd ?? 1000;

  // TR-001: Payload validation
  const validationErrors = validateTravelRulePayload(payload);
  checks.push(makeCheck(
    'TR-001',
    'Payload schema validation',
    validationErrors.length === 0 ? 'pass' : 'fail',
    validationErrors.length === 0 ? 0 : 100,
    validationErrors.length > 0
      ? `${validationErrors.length} validation error(s): ${validationErrors.map(e => e.message).join('; ')}`
      : undefined,
  ));

  // TR-002: Threshold check
  const amountNum = parseFloat(payload.amount);
  // In production, fetch real USD price from an oracle
  const estimatedUsd = amountNum * 2000; // placeholder ETH price
  const aboveThreshold = estimatedUsd >= threshold;

  checks.push(makeCheck(
    'TR-002',
    `Threshold check ($${threshold} USD minimum)`,
    aboveThreshold ? 'pass' : 'skipped',
    0,
    aboveThreshold
      ? `Transfer value ($${estimatedUsd.toFixed(2)}) exceeds threshold`
      : `Transfer value ($${estimatedUsd.toFixed(2)}) below threshold; minimal data required`,
  ));

  // TR-003: VASP licensing
  if (config.requireLicensedVasp) {
    const originatorLicensed = await config.vaspRegistry.isLicensed(payload.originatorVasp);
    const beneficiaryLicensed = await config.vaspRegistry.isLicensed(payload.beneficiaryVasp);
    const bothLicensed = originatorLicensed && beneficiaryLicensed;

    checks.push(makeCheck(
      'TR-003',
      'VASP licensing verification',
      bothLicensed ? 'pass' : 'fail',
      bothLicensed ? 0 : 50,
      bothLicensed ? undefined : 'One or both VASPs are not licensed',
    ));
  }

  // TR-004: Originator screening
  if (config.screeningProvider) {
    const originatorScreening = await config.screeningProvider.screenAddress(
      payload.originator.walletAddress,
    );

    checks.push(makeCheck(
      'TR-004',
      'Originator address screening',
      originatorScreening.riskLevel === 'low' ? 'pass' : originatorScreening.riskLevel === 'high' || originatorScreening.riskLevel === 'critical' ? 'fail' : 'pending',
      originatorScreening.riskScore,
      `Risk score: ${originatorScreening.riskScore}/100 (${originatorScreening.riskLevel})`,
    ));

    // TR-006: Sanctions check
    checks.push(makeCheck(
      'TR-006',
      'Originator sanctions list check',
      originatorScreening.sanctioned ? 'fail' : 'pass',
      originatorScreening.sanctioned ? 100 : 0,
      originatorScreening.sanctioned
        ? `Address found on sanctions list(s): ${originatorScreening.sanctionsLists?.join(', ')}`
        : 'No sanctions match found',
    ));

    // TR-007: Illicit activity check
    checks.push(makeCheck(
      'TR-007',
      'Originator illicit activity check',
      originatorScreening.illicitActivity ? 'fail' : 'pass',
      originatorScreening.illicitActivity ? 80 : 0,
      originatorScreening.illicitActivity
        ? `Address associated with: ${originatorScreening.illicitCategories?.join(', ')}`
        : 'No illicit activity detected',
    ));
  }

  // TR-005: Beneficiary screening
  if (config.screeningProvider) {
    const beneficiaryScreening = await config.screeningProvider.screenAddress(
      payload.beneficiary.walletAddress,
    );

    checks.push(makeCheck(
      'TR-005',
      'Beneficiary address screening',
      beneficiaryScreening.riskLevel === 'low' ? 'pass' : beneficiaryScreening.riskLevel === 'high' || beneficiaryScreening.riskLevel === 'critical' ? 'fail' : 'pending',
      beneficiaryScreening.riskScore,
      `Risk score: ${beneficiaryScreening.riskScore}/100 (${beneficiaryScreening.riskLevel})`,
    ));
  }

  // TR-008: Internal transfer check
  const isInternal = payload.originatorVasp === payload.beneficiaryVasp;
  checks.push(makeCheck(
    'TR-008',
    'Internal transfer detection',
    'pass',
    0,
    isInternal ? 'Internal VASP transfer (reduced requirements)' : 'Cross-VASP transfer',
  ));

  return checks;
}

// ---------------------------------------------------------------------------
// TravelRuleEngine
// ---------------------------------------------------------------------------

/**
 * Main Travel Rule compliance engine.
 *
 * Coordinates payload validation, VASP lookup, address screening,
 * and the compliance check pipeline to produce an evaluation result.
 */
export class TravelRuleEngine {
  private readonly config: Required<TravelRuleConfig>;

  constructor(config: TravelRuleConfig) {
    this.config = {
      thresholdUsd: config.thresholdUsd ?? 1000,
      vaspRegistry: config.vaspRegistry,
      screeningProvider: config.screeningProvider ?? (undefined as unknown as ScreeningProvider),
      // Note: screeningProvider is typed as `Required<>` below but may be undefined at runtime.
      // The code guards with `if (this.config.screeningProvider)` before calling methods.
      rejectSanctioned: config.rejectSanctioned ?? true,
      requireLicensedVasp: config.requireLicensedVasp ?? false,
      maxRiskScore: config.maxRiskScore ?? 70,
    };
  }

  /**
   * Evaluate a travel rule payload through the full compliance pipeline.
   */
  async evaluate(payload: TravelRulePayload): Promise<TravelRuleResult> {
    const threshold = this.config.thresholdUsd;

    // Step 1: Validate payload
    const validationErrors = validateTravelRulePayload(payload);
    if (validationErrors.length > 0) {
      return {
        status: 'rejected',
        aboveThreshold: false,
        thresholdUsd: threshold,
        estimatedUsdValue: 0,
        checks: [makeCheck('TR-001', 'Payload validation', 'fail', 100,
          `${validationErrors.length} error(s): ${validationErrors.map(e => e.message).join('; ')}`)],
        overallRiskScore: 100,
        reason: `Invalid payload: ${validationErrors.length} validation error(s)`,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Step 2: Estimate USD value
    const amountNum = parseFloat(payload.amount);
    const estimatedUsd = amountNum * 2000; // placeholder; use oracle in production
    const aboveThreshold = estimatedUsd >= threshold;

    // Step 3: Run compliance pipeline
    const checks = await runCompliancePipeline(payload, this.config);

    // Step 4: Run screening (if configured)
    let originatorScreening: ScreeningResult | undefined;
    let beneficiaryScreening: ScreeningResult | undefined;

    if (this.config.screeningProvider) {
      originatorScreening = await this.config.screeningProvider.screenAddress(
        payload.originator.walletAddress,
      );
      beneficiaryScreening = await this.config.screeningProvider.screenAddress(
        payload.beneficiary.walletAddress,
      );

      // Auto-reject sanctioned addresses
      if (this.config.rejectSanctioned) {
        if (originatorScreening.sanctioned) {
          return this.makeRejectedResult(
            threshold, estimatedUsd, aboveThreshold, checks,
            originatorScreening, beneficiaryScreening,
            'Originator address is on a sanctions list',
          );
        }
        if (beneficiaryScreening.sanctioned) {
          return this.makeRejectedResult(
            threshold, estimatedUsd, aboveThreshold, checks,
            originatorScreening, beneficiaryScreening,
            'Beneficiary address is on a sanctions list',
          );
        }
      }
    }

    // Step 5: Calculate overall risk score
    const maxRisk = Math.max(...checks.map(c => c.riskContribution), 0);
    const avgRisk = checks.reduce((sum, c) => sum + c.riskContribution, 0) / checks.length;
    const overallRisk = Math.round(Math.max(maxRisk, avgRisk));

    // Step 6: Determine status
    const hasFailures = checks.some(c => c.status === 'fail');
    const hasPending = checks.some(c => c.status === 'pending');

    let status: ComplianceStatus;
    let reason: string;

    if (hasFailures || overallRisk > this.config.maxRiskScore) {
      status = 'rejected';
      reason = `Compliance failed: risk score ${overallRisk}/100 exceeds maximum ${this.config.maxRiskScore}`;
    } else if (hasPending) {
      status = 'review';
      reason = 'Manual review required: some checks are pending';
    } else if (!aboveThreshold) {
      status = 'approved';
      reason = `Transfer below $${threshold} threshold; minimal requirements met`;
    } else {
      status = 'approved';
      reason = 'All compliance checks passed';
    }

    return {
      status,
      aboveThreshold,
      thresholdUsd: threshold,
      estimatedUsdValue: estimatedUsd,
      checks,
      originatorScreening,
      beneficiaryScreening,
      overallRiskScore: overallRisk,
      reason,
      evaluatedAt: new Date().toISOString(),
      payload,
    };
  }

  private makeRejectedResult(
    threshold: number,
    estimatedUsd: number,
    aboveThreshold: boolean,
    checks: ComplianceCheck[],
    originatorScreening?: ScreeningResult,
    beneficiaryScreening?: ScreeningResult,
    reason?: string,
  ): TravelRuleResult {
    return {
      status: 'rejected',
      aboveThreshold,
      thresholdUsd: threshold,
      estimatedUsdValue: estimatedUsd,
      checks,
      originatorScreening,
      beneficiaryScreening,
      overallRiskScore: 100,
      reason: reason ?? 'Transfer rejected due to sanctions compliance',
      evaluatedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// In-Memory VASP Registry (for testing / development)
// ---------------------------------------------------------------------------

/** Simple in-memory VASP registry implementation. */
export class InMemoryVaspRegistry implements VaspRegistry {
  private readonly vasps = new Map<string, VaspRecord>();
  private readonly walletToVasp = new Map<string, string>();

  /** Register a VASP. */
  register(vasp: VaspRecord): void {
    this.vasps.set(vasp.id, vasp);
  }

  /** Associate a wallet address with a VASP. */
  registerWallet(address: string, vaspId: string): void {
    this.walletToVasp.set(address.toLowerCase(), vaspId);
  }

  async lookup(id: string): Promise<VaspRecord | null> {
    return this.vasps.get(id) ?? null;
  }

  async lookupByWallet(address: string): Promise<VaspRecord | null> {
    const vaspId = this.walletToVasp.get(address.toLowerCase());
    if (!vaspId) return null;
    return this.vasps.get(vaspId) ?? null;
  }

  async listAll(): Promise<VaspRecord[]> {
    return Array.from(this.vasps.values());
  }

  async isLicensed(id: string): Promise<boolean> {
    const vasp = this.vasps.get(id);
    return vasp?.licensed ?? false;
  }
}

// ---------------------------------------------------------------------------
// Mock Screening Provider (for testing)
// ---------------------------------------------------------------------------

/** Mock screening provider that returns configurable results. */
export class MockScreeningProvider implements ScreeningProvider {
  private readonly knownRisky = new Set<string>();
  private readonly knownSanctioned = new Set<string>();

  /** Mark an address as risky. */
  flagRisky(address: string): void {
    this.knownRisky.add(address.toLowerCase());
  }

  /** Mark an address as sanctioned. */
  flagSanctioned(address: string): void {
    this.knownSanctioned.add(address.toLowerCase());
  }

  async screenAddress(address: string): Promise<ScreeningResult> {
    const addr = address.toLowerCase();
    const sanctioned = this.knownSanctioned.has(addr);
    const risky = this.knownRisky.has(addr);

    return {
      provider: 'chainalysis',
      riskScore: sanctioned ? 100 : risky ? 65 : 5,
      riskLevel: sanctioned ? 'critical' : risky ? 'high' : 'low',
      sanctioned,
      sanctionsLists: sanctioned ? ['OFAC SDN'] : [],
      illicitActivity: risky,
      illicitCategories: risky ? ['mixer'] : [],
      screenedAt: new Date().toISOString(),
    };
  }

  async screenBatch(addresses: string[]): Promise<ScreeningResult[]> {
    return Promise.all(addresses.map(a => this.screenAddress(a)));
  }

  getProviderName(): ScreeningProviderName {
    return 'chainalysis';
  }
}

// ---------------------------------------------------------------------------
// Default Exports
// ---------------------------------------------------------------------------

export {
  TRAVEL_RULE_JSON_SCHEMA as TravelRuleJsonSchema,
};
