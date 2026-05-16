/**
 * Pairing protocol for WalletConnect v2.
 *
 * Handles pairing URI generation, parsing, and the pairing lifecycle.
 * A pairing is the first step before session establishment — it creates
 * a secure, encrypted channel for exchanging session proposals.
 */

import { generateSymKey, generateTopic, bytesToHex, hexToBytes, encrypt, decrypt } from './crypto.js';
import type { Pairing, ParsedWcUri, RelayConfig } from './types.js';
import { WcRelay } from './relay.js';

/** Configuration for creating a pairing. */
export interface PairingConfig {
  /** Relay server URL. */
  relayUrl: string;
  /** Optional existing relay instance (reuses connection). */
  relay?: WcRelay;
  /** Pairing expiry in seconds (default: 300 = 5 minutes). */
  expiry?: number;
}

/**
 * Parse a WalletConnect v2 URI into its components.
 *
 * Format: `wc:<topic>@<version>?relay-protocol=<protocol>&relay-url=<url>&symKey=<key>&methods=<methods>`
 *
 * @param uri - WalletConnect URI string.
 * @returns Parsed components.
 */
export function parseWcUri(uri: string): ParsedWcUri {
  // Remove "wc:" prefix
  const withoutPrefix = uri.startsWith('wc:') ? uri.slice(3) : uri;

  // Split topic@version from query params
  const [topicVersion, queryString] = withoutPrefix.split('?');
  const [topic, versionStr] = topicVersion.split('@');

  const version = parseInt(versionStr, 10);
  if (version !== 2) {
    throw new Error(`Unsupported WalletConnect version: ${version}. Expected 2.`);
  }

  // Parse query params
  const params = new URLSearchParams(queryString);
  const relayProtocol = params.get('relay-protocol') ?? 'waku';
  const relayUrl = decodeURIComponent(params.get('relay-url') ?? '');
  const symKey = params.get('symKey') ?? '';

  if (!topic || !symKey) {
    throw new Error('Invalid WC URI: missing topic or symKey');
  }

  const methods = params.get('methods');

  return {
    version: 2,
    topic,
    relayProtocol,
    relayUrl,
    symKey,
    methods: methods ? methods.split(',').map((m) => m.trim()) : undefined,
  };
}

/**
 * Format a WalletConnect v2 URI from parsed components.
 *
 * @param params - Parsed WC URI components.
 * @returns Formatted WC URI string.
 */
export function formatWcUri(params: ParsedWcUri): string {
  const query = new URLSearchParams();
  query.set('relay-protocol', params.relayProtocol);
  query.set('relay-url', encodeURIComponent(params.relayUrl));
  query.set('symKey', params.symKey);
  if (params.methods?.length) {
    query.set('methods', params.methods.join(','));
  }

  return `wc:${params.topic}@${params.version}?${query.toString()}`;
}

/**
 * Create a new pairing and generate a WC v2 URI.
 *
 * This creates a random topic and symmetric key, connects to the relay,
 * and subscribes to the pairing topic to wait for wallet response.
 *
 * @param config - Pairing configuration.
 * @returns The pairing object with the URI to display as QR code.
 */
export async function createPairing(config: PairingConfig): Promise<{
  pairing: Pairing;
  relay: WcRelay;
}> {
  const topic = generateTopic();
  const symKey = generateSymKey();
  const expiry = Date.now() + (config.expiry ?? 300) * 1000;

  const relay = config.relay ?? new WcRelay({ url: config.relayUrl });
  await relay.connect();

  // Subscribe to the pairing topic to receive wallet messages
  relay.subscribe(topic);

  const uri = formatWcUri({
    version: 2,
    topic,
    relayProtocol: 'waku',
    relayUrl: config.relayUrl,
    symKey,
  });

  const pairing: Pairing = {
    topic,
    uri,
    active: true,
    expiry,
  };

  return { pairing, relay };
}

/**
 * Encrypt a JSON payload for the pairing channel using the symmetric key.
 *
 * @param symKey - Symmetric key (64-char hex).
 * @param payload - JSON-serializable data to encrypt.
 * @returns Base64-encoded encrypted payload.
 */
export function encryptPairingMessage(symKey: string, payload: unknown): string {
  const key = hexToBytes(symKey);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  return encrypt(key, plaintext);
}

/**
 * Decrypt a message from the pairing channel.
 *
 * @param symKey - Symmetric key (64-char hex).
 * @param encrypted - Base64-encoded encrypted payload.
 * @returns Decrypted JSON object.
 */
export function decryptPairingMessage(symKey: string, encrypted: string): unknown {
  const key = hexToBytes(symKey);
  const plaintext = decrypt(key, encrypted);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/**
 * Validate a WC v2 URI string.
 *
 * @param uri - URI to validate.
 * @returns Whether the URI is valid.
 */
export function isValidWcUri(uri: string): boolean {
  try {
    const parsed = parseWcUri(uri);
    return (
      parsed.version === 2 &&
      parsed.topic.length === 64 &&
      parsed.symKey.length === 64 &&
      parsed.relayUrl.length > 0
    );
  } catch {
    return false;
  }
}
