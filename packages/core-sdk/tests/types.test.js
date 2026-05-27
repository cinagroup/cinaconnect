/**
 * Core type validation tests for the Cinacoin SDK.
 *
 * Tests type utilities and validation helpers defined in types.ts.
 */
import { describe, it, expect } from 'vitest';
// ============================================================
// ChainNamespace validation
// ============================================================
describe('ChainNamespace type', () => {
    it('accepts valid namespace values', () => {
        const namespaces = [
            'eip155',
            'solana',
            'bip121',
            'bip122',
            'tron',
            'ton',
            'polkadot',
        ];
        expect(namespaces.length).toBe(7);
    });
    it('ChainNamespace is a union of known values', () => {
        // TypeScript compile-time check: these should all typecheck
        const _eip155 = 'eip155';
        const _solana = 'solana';
        const _ton = 'ton';
        expect(_eip155).toBe('eip155');
        expect(_solana).toBe('solana');
        expect(_ton).toBe('ton');
    });
});
// ============================================================
// ChainReference validation
// ============================================================
describe('ChainReference', () => {
    it('creates valid chain reference', () => {
        const ref = {
            namespace: 'eip155',
            reference: '1',
        };
        expect(ref.namespace).toBe('eip155');
        expect(ref.reference).toBe('1');
    });
    it('supports Solana references', () => {
        const ref = {
            namespace: 'solana',
            reference: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        };
        expect(ref.namespace).toBe('solana');
    });
});
// ============================================================
// Chain validation
// ============================================================
describe('Chain interface', () => {
    it('creates a valid chain object', () => {
        const chain = {
            id: 'eip155:1',
            name: 'Ethereum Mainnet',
            rpcUrl: 'https://eth.llamarpc.com',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
            },
            explorerUrl: 'https://etherscan.io',
            iconUrl: 'https://icons.llamao.fi/icons/chains/ethereum.svg',
        };
        expect(chain.id).toBe('eip155:1');
        expect(chain.nativeCurrency?.decimals).toBe(18);
    });
    it('supports minimal chain (no optional fields)', () => {
        const chain = {
            id: 'eip155:137',
            name: 'Polygon',
            rpcUrl: 'https://polygon-rpc.com',
        };
        expect(chain.explorerUrl).toBeUndefined();
        expect(chain.iconUrl).toBeUndefined();
        expect(chain.nativeCurrency).toBeUndefined();
    });
});
// ============================================================
// ConnectParams validation
// ============================================================
describe('ConnectParams', () => {
    it('creates empty connect params', () => {
        const params = {};
        expect(Object.keys(params).length).toBe(0);
    });
    it('supports all optional fields', () => {
        const params = {
            topic: 'abc123',
            relayUrl: 'wss://relay.example.com',
            uri: 'wc:abc@2?relay-protocol=waku&relay-url=wss%3A%2F%2Frelay.example.com&symKey=abc',
            chains: [1, 137, 56],
            metadata: {
                name: 'Test dApp',
                description: 'A test dApp',
                url: 'https://test.example.com',
                icons: ['https://test.example.com/icon.png'],
            },
        };
        expect(params.chains).toHaveLength(3);
        expect(params.metadata?.name).toBe('Test dApp');
    });
});
// ============================================================
// AppMetadata validation
// ============================================================
describe('AppMetadata', () => {
    it('creates valid metadata', () => {
        const metadata = {
            name: 'My dApp',
            description: 'Decentralized application',
            url: 'https://mydapp.com',
            icons: ['https://mydapp.com/icon.png', 'https://mydapp.com/favicon.ico'],
        };
        expect(metadata.name).toBe('My dApp');
        expect(metadata.icons).toHaveLength(2);
    });
});
// ============================================================
// ConnectionResult validation
// ============================================================
describe('ConnectionResult', () => {
    it('creates valid connection result', () => {
        const result = {
            sessionId: 'session-123',
            accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
            chainId: 1,
            connectorId: 'walletconnect',
        };
        expect(result.sessionId).toBe('session-123');
        expect(result.chainId).toBe(1);
    });
});
// ============================================================
// TransactionRequest validation
// ============================================================
describe('TransactionRequest', () => {
    it('creates a minimal transaction', () => {
        const tx = {
            from: '0x1234567890abcdef1234567890abcdef12345678',
            to: '0xabcdef1234567890abcdef1234567890abcdef12',
        };
        expect(tx.from).toBeDefined();
        expect(tx.to).toBeDefined();
    });
    it('supports full EIP-1559 transaction', () => {
        const tx = {
            from: '0x1234',
            to: '0x5678',
            value: '0xde0b6b3a7640000',
            data: '0x',
            gas: '0x5208',
            maxFeePerGas: '0x9502f900',
            maxPriorityFeePerGas: '0x3b9aca00',
            nonce: '0x1',
            chainId: 1,
        };
        expect(tx.value).toBe('0xde0b6b3a7640000');
        expect(tx.maxFeePerGas).toBeDefined();
    });
    it('supports legacy gasPrice transaction', () => {
        const tx = {
            from: '0x1234',
            to: '0x5678',
            gasPrice: '0x4a817c800',
        };
        expect(tx.gasPrice).toBeDefined();
        expect(tx.maxFeePerGas).toBeUndefined();
    });
});
// ============================================================
// PairingData validation
// ============================================================
describe('PairingData', () => {
    it('creates valid pairing data', () => {
        const pairing = {
            topic: 'abc123',
            uri: 'wc:abc@2?relay-protocol=waku&relay-url=wss://x&symKey=abc',
            active: true,
            expiry: Date.now() + 300000,
            peerMetadata: {
                name: 'MetaMask',
                description: 'MetaMask Wallet',
                url: 'https://metamask.io',
                icons: ['https://metamask.io/icon.png'],
            },
        };
        expect(pairing.active).toBe(true);
        expect(pairing.peerMetadata?.name).toBe('MetaMask');
    });
});
// ============================================================
// SessionProposal validation
// ============================================================
describe('SessionProposal', () => {
    it('creates valid session proposal', () => {
        const proposal = {
            id: 1,
            requiredNamespaces: {
                eip155: {
                    chains: ['eip155:1'],
                    methods: ['eth_sendTransaction', 'personal_sign'],
                    events: ['chainChanged', 'accountsChanged'],
                },
            },
            relays: [{ protocol: 'waku' }],
            proposer: {
                publicKey: '0xabc',
                metadata: {
                    name: 'Test dApp',
                    description: '',
                    url: 'https://test.example.com',
                    icons: [],
                },
            },
        };
        expect(proposal.id).toBe(1);
        expect(proposal.requiredNamespaces.eip155.methods).toContain('eth_sendTransaction');
    });
});
// ============================================================
// RequiredNamespace validation
// ============================================================
describe('RequiredNamespace', () => {
    it('creates valid required namespace', () => {
        const ns = {
            chains: ['eip155:1', 'eip155:137'],
            methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'],
            events: ['chainChanged', 'accountsChanged'],
        };
        expect(ns.chains).toHaveLength(2);
        expect(ns.methods).toHaveLength(3);
        expect(ns.events).toHaveLength(2);
    });
});
//# sourceMappingURL=types.test.js.map