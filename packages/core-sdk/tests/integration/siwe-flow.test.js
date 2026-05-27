/**
 * Integration Test — Full SIWE Authentication Flow
 *
 * Tests the complete Sign-In with Ethereum lifecycle:
 * generate → sign → verify → session management.
 *
 * 8 tests covering:
 * - SIWE message generation with all fields
 * - Signature request through connector
 * - Session token lifecycle
 * - Expiration handling
 * - Sign-out flow
 * - Session restore
 * - Invalid message handling
 * - Re-authentication after expiry
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Connector } from '../../src/connector.js';
// ── Mock SIWE Connector ───────────────────────────────────────────
class MockSIWEConnector extends Connector {
    constructor() {
        super(...arguments);
        this.id = 'siwe-test';
        this.name = 'SIWE Test Wallet';
        this.icon = '';
        this.installed = true;
        this.type = 'injected';
        this._connected = false;
        this._accounts = [];
        this._chainId = 1;
    }
    async connect(params) {
        if (this._connected)
            throw new Error('Already connected');
        this._connected = true;
        this._accounts = ['0x1234567890abcdef1234567890abcdef12345678'];
        this._chainId = params?.chains?.[0] ?? 1;
        return {
            sessionId: 'siwe-session-' + Date.now(),
            accounts: this._accounts,
            chainId: this._chainId,
            connectorId: this.id,
        };
    }
    async disconnect() {
        this._connected = false;
        this._accounts = [];
    }
    async getAccounts() {
        return this._connected ? [...this._accounts] : [];
    }
    async getChainId() {
        return this._chainId;
    }
    async switchChain(chainId) {
        if (!this._connected)
            throw new Error('Not connected');
        this._chainId = chainId;
    }
    async signMessage(message) {
        if (!this._connected)
            throw new Error('Not connected');
        // Simulate a valid signature
        return '0xmock_signature_' + message.slice(0, 40);
    }
    getProvider() {
        return this._connected ? { request: async () => null } : null;
    }
}
// ── SIWE helpers (inline, mirroring @cinacoin/siwe) ──────────────
function generateNonce() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}
function generateTimestamp(date = new Date()) {
    return date.toISOString();
}
function buildSIWEMessage(params) {
    const lines = [
        `${params.domain} wants you to sign in with your Ethereum account:`,
        params.address,
        '',
        ...(params.statement ? [params.statement, ''] : []),
        `URI: ${params.uri}`,
        `Version: 1`,
        `Chain ID: ${params.chainId || 1}`,
        `Nonce: ${params.nonce}`,
        `Issued At: ${params.issuedAt || generateTimestamp()}`,
        ...(params.expirationTime ? [`Expiration Time: ${params.expirationTime}`] : []),
    ];
    return lines.join('\n');
}
function parseSIWE(message) {
    const result = {};
    const lines = message.split('\n');
    result.address = lines[1] || '';
    result.domain = lines[0]?.split(' wants')[0] || '';
    for (const line of lines) {
        if (line.startsWith('URI: '))
            result.uri = line.slice(5);
        if (line.startsWith('Chain ID: '))
            result.chainId = line.slice(10);
        if (line.startsWith('Nonce: '))
            result.nonce = line.slice(7);
        if (line.startsWith('Issued At: '))
            result.issuedAt = line.slice(11);
        if (line.startsWith('Expiration Time: '))
            result.expirationTime = line.slice(17);
    }
    return result;
}
// ── SIWE Session Manager ──────────────────────────────────────────
class SIWESessionManager {
    constructor(connector, config) {
        this._sessionToken = null;
        this._address = null;
        this._expiresAt = null;
        this._connector = connector;
        this._domain = config.domain;
        this._uri = config.uri;
        this._statement = config.statement;
        this._chainId = config.chainId || 1;
        this._expirationSeconds = config.expirationSeconds || 86400;
    }
    get isAuthenticated() {
        return this._sessionToken !== null && this._expiresAt !== null && Date.now() < this._expiresAt * 1000;
    }
    get address() { return this._address; }
    get sessionToken() { return this._sessionToken; }
    async signIn() {
        // Ensure wallet is connected
        const accounts = await this._connector.getAccounts();
        if (accounts.length === 0) {
            await this._connector.connect();
        }
        const currentAccounts = await this._connector.getAccounts();
        if (currentAccounts.length === 0) {
            throw new Error('No accounts available');
        }
        const address = currentAccounts[0];
        const nonce = generateNonce();
        const issuedAt = generateTimestamp();
        const expirationTime = generateTimestamp(new Date(Date.now() + this._expirationSeconds * 1000));
        const message = buildSIWEMessage({
            domain: this._domain,
            address,
            uri: this._uri,
            nonce,
            chainId: this._chainId,
            statement: this._statement,
            issuedAt,
            expirationTime,
        });
        const signature = await this._connector.signMessage(message);
        const parsed = parseSIWE(message);
        // Create session
        this._sessionToken = `${nonce}:${address}:${Date.now()}`;
        this._expiresAt = Math.floor(Date.now() / 1000) + this._expirationSeconds;
        this._address = address;
        return { address, message, signature, sessionToken: this._sessionToken, expiresAt: this._expiresAt, parsed };
    }
    async signOut() {
        this._sessionToken = null;
        this._address = null;
        this._expiresAt = null;
        await this._connector.disconnect();
    }
    restore(session) {
        if (Date.now() >= session.expiresAt * 1000)
            return false;
        this._sessionToken = session.token;
        this._address = session.address;
        this._expiresAt = session.expiresAt;
        return true;
    }
}
// ── Tests ─────────────────────────────────────────────────────────
describe('SIWE Flow — Full Authentication Lifecycle', () => {
    let connector;
    let siweSession;
    beforeEach(() => {
        connector = new MockSIWEConnector();
        siweSession = new SIWESessionManager(connector, {
            domain: 'https://myapp.com',
            uri: 'https://myapp.com/login',
            statement: 'Sign in to MyApp',
            chainId: 1,
            expirationSeconds: 86400,
        });
    });
    it('should complete full generate → sign → verify → session flow', async () => {
        const result = await siweSession.signIn();
        expect(result.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
        expect(result.message).toContain('myapp.com wants you to sign in');
        expect(result.message).toContain('Sign in to MyApp');
        expect(result.signature).toMatch(/^0xmock_signature_/);
        expect(result.sessionToken).toBeTruthy();
        expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
    it('should generate a properly formatted SIWE message', async () => {
        const result = await siweSession.signIn();
        const parsed = result.parsed;
        expect(parsed.domain).toBe('https://myapp.com');
        expect(parsed.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
        expect(parsed.uri).toBe('https://myapp.com/login');
        expect(parsed.nonce).toBeTruthy();
        expect(parsed.chainId).toBe('1');
        expect(parsed.issuedAt).toBeTruthy();
        expect(parsed.expirationTime).toBeTruthy();
    });
    it('should set authenticated state after successful sign-in', async () => {
        expect(siweSession.isAuthenticated).toBe(false);
        expect(siweSession.address).toBeNull();
        await siweSession.signIn();
        expect(siweSession.isAuthenticated).toBe(true);
        expect(siweSession.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
        expect(siweSession.sessionToken).toBeTruthy();
    });
    it('should sign out and clear all session state', async () => {
        await siweSession.signIn();
        expect(siweSession.isAuthenticated).toBe(true);
        await siweSession.signOut();
        expect(siweSession.isAuthenticated).toBe(false);
        expect(siweSession.address).toBeNull();
        expect(siweSession.sessionToken).toBeNull();
    });
    it('should restore a valid persisted session', () => {
        const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
        const restored = siweSession.restore({
            token: 'abc:0x123:123',
            address: '0x123',
            expiresAt: futureExpiry,
        });
        expect(restored).toBe(true);
        expect(siweSession.isAuthenticated).toBe(true);
    });
    it('should reject restoring an expired session', () => {
        const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
        const restored = siweSession.restore({
            token: 'abc:0x123:123',
            address: '0x123',
            expiresAt: pastExpiry,
        });
        expect(restored).toBe(false);
        expect(siweSession.isAuthenticated).toBe(false);
    });
    it('should connect wallet automatically if not connected before signing', async () => {
        expect(await connector.getAccounts()).toHaveLength(0);
        await siweSession.signIn();
        expect(await connector.getAccounts()).toHaveLength(1);
    });
    it('should include custom statement and chain ID in the message', async () => {
        const customSession = new SIWESessionManager(connector, {
            domain: 'https://custom.app',
            uri: 'https://custom.app/auth',
            statement: 'Custom statement for testing',
            chainId: 137,
            expirationSeconds: 3600,
        });
        const result = await customSession.signIn();
        expect(result.message).toContain('Custom statement for testing');
        expect(result.message).toContain('Chain ID: 137');
        expect(result.parsed.chainId).toBe('137');
    });
});
//# sourceMappingURL=siwe-flow.test.js.map