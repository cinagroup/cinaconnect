/**
 * siwe/tests/siwe.test.ts
 *
 * Tests for SIWE (Sign-In with Ethereum) message generation, parsing, and validation.
 */

import { generateMessage, parseMessage } from '../src/siwe.js';
import { generateNonce, isValidEthereumAddress, isValidUri, normalizeAddress, getOrigin } from '../src/utils.js';
import { validateSIWEParams, validateDomainMatch } from '../src/validator.js';
import type { SIWEParams } from '../src/types.js';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validParams: SIWEParams = {
  domain: 'https://example.com',
  address: '0xabcDEF0123456789abcdef0123456789ABCDEF01',
  statement: 'Sign in to continue.',
  uri: 'https://example.com/login',
  version: '1',
  chainId: 1,
  nonce: 'abc123def456',
  issuedAt: '2024-01-15T12:00:00.000Z',
  expirationTime: '2024-01-15T13:00:00.000Z',
  notBefore: '2024-01-15T11:00:00.000Z',
  requestId: 'req-001',
  resources: ['https://example.com/resource1', 'https://example.com/resource2'],
};

// ---------------------------------------------------------------------------
// generateMessage
// ---------------------------------------------------------------------------

function testGenerateMessageBasics() {
  const msg = generateMessage(validParams);
  assert(msg.startsWith('https://example.com wants you to sign in with your Ethereum account:'), 'preamble');
  assert(msg.includes('0xabcDEF0123456789abcdef0123456789ABCDEF01'), 'address');
  assert(msg.includes('Sign in to continue.'), 'statement');
  assert(msg.includes('URI: https://example.com/login'), 'uri');
  assert(msg.includes('Version: 1'), 'version');
  assert(msg.includes('Chain ID: 1'), 'chainId');
  assert(msg.includes('Nonce: abc123def456'), 'nonce');
  assert(msg.includes('Issued At: 2024-01-15T12:00:00.000Z'), 'issuedAt');
  assert(msg.includes('Expiration Time: 2024-01-15T13:00:00.000Z'), 'expirationTime');
  assert(msg.includes('Not Before: 2024-01-15T11:00:00.000Z'), 'notBefore');
  assert(msg.includes('Request ID: req-001'), 'requestId');
  console.log('✓ generateMessage full params');
}

function testGenerateMessageMinimal() {
  const minimal: SIWEParams = {
    domain: 'https://app.io',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    uri: 'https://app.io',
    version: '1',
    chainId: 1,
    nonce: 'abcdefgh',
  };
  const msg = generateMessage(minimal);
  assert(msg.startsWith('https://app.io wants you to sign in with your Ethereum account:'), 'preamble');
  assert(msg.includes('URI: https://app.io'), 'uri');
  assert(msg.includes('Version: 1'), 'version');
  assert(msg.includes('Chain ID: 1'), 'chainId');
  assert(msg.includes('Nonce: abcdefgh'), 'nonce');
  assert(!msg.includes('Expiration Time'), 'no expiration');
  assert(!msg.includes('Resources:'), 'no resources');
  console.log('✓ generateMessage minimal');
}

function testGenerateMessageAutoIssuedAt() {
  const params: SIWEParams = {
    domain: 'https://test.com',
    address: '0x1111111111111111111111111111111111111111',
    uri: 'https://test.com',
    version: '1',
    chainId: 1,
    nonce: 'nonce1234567',
  };
  const msg = generateMessage(params);
  assert(msg.includes('Issued At:'), 'auto-issuedAt should be present');
  console.log('✓ generateMessage auto issuedAt');
}

function testGenerateMessageNoStatement() {
  const params: SIWEParams = {
    domain: 'https://nos.com',
    address: '0x2222222222222222222222222222222222222222',
    uri: 'https://nos.com',
    version: '1',
    chainId: 1,
    nonce: 'nonce1234567',
  };
  const msg = generateMessage(params);
  assert(!msg.includes('Sign in'), 'no statement text');
  console.log('✓ generateMessage no statement');
}

function testGenerateMessageResources() {
  const params: SIWEParams = {
    domain: 'https://res.com',
    address: '0x3333333333333333333333333333333333333333',
    uri: 'https://res.com',
    version: '1',
    chainId: 1,
    nonce: 'nonce1234567',
    resources: ['ipfs://bafy123', 'https://res.com/doc'],
  };
  const msg = generateMessage(params);
  assert(msg.includes('Resources:'), 'resources header');
  assert(msg.includes('- ipfs://bafy123'), 'resource 1');
  assert(msg.includes('- https://res.com/doc'), 'resource 2');
  console.log('✓ generateMessage resources');
}

function testGenerateMessageInvalidParams() {
  // Missing domain
  const bad: SIWEParams = {
    domain: '',
    address: '0x1111111111111111111111111111111111111111',
    uri: 'https://x.com',
    version: '1',
    chainId: 1,
    nonce: 'n',
  };
  try {
    generateMessage(bad);
    assert(false, 'Should throw for empty domain');
  } catch (e: any) {
    assert(e.message.includes('Invalid SIWE parameters'), 'should report invalid params');
  }
  console.log('✓ generateMessage rejects invalid params');
}

// ---------------------------------------------------------------------------
// parseMessage
// ---------------------------------------------------------------------------

function testParseMessage() {
  const msg = generateMessage(validParams);
  const parsed = parseMessage(msg);

  assert(parsed.domain === 'https://example.com', 'domain');
  assert(parsed.address === '0xabcDEF0123456789abcdef0123456789ABCDEF01', 'address');
  assert(parsed.statement === 'Sign in to continue.', 'statement');
  assert(parsed.uri === 'https://example.com/login', 'uri');
  assert(parsed.version === '1', 'version');
  assert(parsed.chainId === 1, 'chainId');
  assert(parsed.nonce === 'abc123def456', 'nonce');
  assert(parsed.issuedAt === '2024-01-15T12:00:00.000Z', 'issuedAt');
  assert(parsed.expirationTime === '2024-01-15T13:00:00.000Z', 'expirationTime');
  assert(parsed.notBefore === '2024-01-15T11:00:00.000Z', 'notBefore');
  assert(parsed.requestId === 'req-001', 'requestId');
  assert(parsed.resources?.length === 2, 'resources length');
  assert(parsed.resources?.[0] === 'https://example.com/resource1', 'resource 0');
  assert(parsed.resources?.[1] === 'https://example.com/resource2', 'resource 1');
  console.log('✓ parseMessage full');
}

function testParseMessageMinimal() {
  const params: SIWEParams = {
    domain: 'https://min.io',
    address: '0x4444444444444444444444444444444444444444',
    uri: 'https://min.io',
    version: '1',
    chainId: 5,
    nonce: 'abcdefgh',
  };
  const msg = generateMessage(params);
  const parsed = parseMessage(msg);

  assert(parsed.domain === 'https://min.io', 'domain');
  assert(parsed.chainId === 5, 'chainId');
  assert(parsed.statement === undefined, 'no statement');
  assert(parsed.expirationTime === undefined, 'no expirationTime');
  assert(parsed.resources?.length === 0, 'no resources');
  console.log('✓ parseMessage minimal');
}

function testParseMessageInvalid() {
  try {
    parseMessage('This is not a SIWE message');
    assert(false, 'Should throw for invalid message');
  } catch (e: any) {
    assert(e.message.includes('Invalid SIWE message'), 'should report invalid');
  }
  console.log('✓ parseMessage rejects invalid');
}

function testParseMessageMissingAddress() {
  try {
    parseMessage('example.com wants you to sign in with your Ethereum account:\nnoaddress\n\nURI: https://x\nVersion: 1\nChain ID: 1\nNonce: n\nIssued At: 2024-01-01T00:00:00.000Z');
    assert(false, 'Should throw for missing 0x address');
  } catch (e: any) {
    assert(e.message.includes('Invalid SIWE message'), 'should report invalid');
  }
  console.log('✓ parseMessage rejects missing address');
}

// ---------------------------------------------------------------------------
// Round-trip: generate → parse → compare
// ---------------------------------------------------------------------------

function testRoundTrip() {
  const params: SIWEParams = {
    domain: 'https://roundtrip.app',
    address: '0x5555555555555555555555555555555555555555',
    statement: 'Round trip test',
    uri: 'https://roundtrip.app',
    version: '1',
    chainId: 137,
    nonce: 'rt-' + Date.now().toString(36) + Date.now().toString(36),
    issuedAt: '2024-06-01T00:00:00.000Z',
    expirationTime: '2024-06-02T00:00:00.000Z',
    resources: ['https://roundtrip.app/res'],
  };

  const msg = generateMessage(params);
  const parsed = parseMessage(msg);

  assert(parsed.domain === params.domain, 'domain round-trip');
  assert(parsed.address === params.address, 'address round-trip');
  assert(parsed.statement === params.statement, 'statement round-trip');
  assert(parsed.uri === params.uri, 'uri round-trip');
  assert(parsed.chainId === params.chainId, 'chainId round-trip');
  assert(parsed.nonce === params.nonce, 'nonce round-trip');
  assert(parsed.resources?.[0] === params.resources?.[0], 'resource round-trip');
  console.log('✓ round-trip generate → parse');
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function testGenerateNonce() {
  const n1 = generateNonce();
  const n2 = generateNonce();
  assert(n1.length > 0, 'nonce should not be empty');
  assert(n1 !== n2, 'nonces should be unique');
  console.log('✓ generateNonce');
}

function testIsValidEthereumAddress() {
  assert(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef12345678') === true, 'valid');
  assert(isValidEthereumAddress('0x1234') === false, 'too short');
  assert(isValidEthereumAddress('nope') === false, 'no prefix');
  assert(isValidEthereumAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG') === false, 'invalid hex');
  console.log('✓ isValidEthereumAddress');
}

function testIsValidUri() {
  assert(isValidUri('https://example.com') === true, 'https valid');
  assert(isValidUri('http://localhost:3000') === true, 'http valid');
  assert(isValidUri('not-a-uri') === false, 'invalid');
  console.log('✓ isValidUri');
}

function testNormalizeAddress() {
  const addr = '0xABCDEF0123456789abcdef0123456789ABCDEF01';
  const lower = normalizeAddress(addr);
  assert(lower === addr.toLowerCase(), 'should lowercase');
  assert(normalizeAddress('0x0000') === '0x0000', 'passthrough short');
  console.log('✓ normalizeAddress');
}

function testGetOrigin() {
  assert(getOrigin('https://example.com/path?query=1') === 'https://example.com', 'extracts origin');
  assert(getOrigin('http://localhost:3000/app') === 'http://localhost:3000', 'localhost origin');
  console.log('✓ getOrigin');
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function testValidateSIWEParams() {
  const errors = validateSIWEParams(validParams);
  assert(errors.length === 0, `valid params should have no errors, got: ${JSON.stringify(errors)}`);
  console.log('✓ validateSIWEParams valid');

  const badParams: SIWEParams = {
    domain: '',
    address: '0xshort',
    uri: 'nope',
    version: '1',
    chainId: 1,
    nonce: '',
  };
  const badErrors = validateSIWEParams(badParams);
  assert(badErrors.length > 0, 'invalid params should have errors');
  console.log('✓ validateSIWEParams invalid');
}

function testValidateDomainMatch() {
  assert(validateDomainMatch('https://example.com', 'https://example.com/login') === true, 'match');
  assert(validateDomainMatch('example.com', 'https://other.com/login') === false, 'mismatch');
  console.log('✓ validateDomainMatch');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  const tests = [
    testGenerateMessageBasics,
    testGenerateMessageMinimal,
    testGenerateMessageAutoIssuedAt,
    testGenerateMessageNoStatement,
    testGenerateMessageResources,
    testGenerateMessageInvalidParams,
    testParseMessage,
    testParseMessageMinimal,
    testParseMessageInvalid,
    testParseMessageMissingAddress,
    testRoundTrip,
    testGenerateNonce,
    testIsValidEthereumAddress,
    testIsValidUri,
    testNormalizeAddress,
    testGetOrigin,
    testValidateSIWEParams,
    testValidateDomainMatch,
  ];

  let passed = 0;
  let failed = 0;

  for (const fn of tests) {
    try {
      fn();
      passed++;
    } catch (e: any) {
      console.error(`✗ ${fn.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed (${tests.length} total)`);
  if (failed > 0) process.exit(1);
}

run();
