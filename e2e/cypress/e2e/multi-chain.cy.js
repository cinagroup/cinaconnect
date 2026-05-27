"use strict";
// ***************************************************************
// Multi-Chain E2E Tests
// Tests for network switching and multi-chain support
// ***************************************************************
describe('Multi-Chain Support', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.connectWallet('WalletConnect');
    });
    describe('Network Switching', () => {
        it('should switch between Ethereum mainnet and testnets', () => {
            // Start on mainnet
            cy.get('[data-testid="network-selector"]').should('have.attr', 'data-active-chain-id', '1');
            // Switch to Sepolia testnet
            cy.switchNetwork(11155111);
            cy.get('[data-testid="network-selector"]').should('have.attr', 'data-active-chain-id', '11155111');
            // Switch back to mainnet
            cy.switchNetwork(1);
            cy.get('[data-testid="network-selector"]').should('have.attr', 'data-active-chain-id', '1');
        });
        it('should switch to Goerli testnet', () => {
            cy.switchNetwork(5);
            cy.get('[data-testid="network-selector"]').should('have.attr', 'data-active-chain-id', '5');
        });
        it('should switch to Polygon network', () => {
            cy.switchNetwork(137);
            cy.get('[data-testid="network-selector"]').should('have.attr', 'data-active-chain-id', '137');
        });
    });
    describe('Network Display', () => {
        it('should show correct network name after switch to mainnet', () => {
            cy.switchNetwork(1);
            cy.get('[data-testid="network-selector"]').should('contain.text', 'Ethereum');
        });
        it('should show correct network name after switch to Sepolia', () => {
            cy.switchNetwork(11155111);
            cy.get('[data-testid="network-selector"]').should('contain.text', 'Sepolia');
        });
        it('should show correct network name after switch to Polygon', () => {
            cy.switchNetwork(137);
            cy.get('[data-testid="network-selector"]').should('contain.text', 'Polygon');
        });
        it('should show correct network name after switch to Arbitrum', () => {
            cy.switchNetwork(42161);
            cy.get('[data-testid="network-selector"]').should('contain.text', 'Arbitrum');
        });
        it('should show correct network name after switch to Optimism', () => {
            cy.switchNetwork(10);
            cy.get('[data-testid="network-selector"]').should('contain.text', 'Optimism');
        });
    });
    describe('Unsupported Chain Handling', () => {
        it('should handle unsupported chain gracefully', () => {
            // Mock an unsupported chain response
            cy.intercept('POST', '**/rpc**', {
                statusCode: 200,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: null,
                },
            }).as('unsupportedChainRpc');
            // Try to switch to an unsupported chain
            cy.get('[data-testid="network-selector"]').click();
            cy.get('[data-testid="network-list"]').should('be.visible');
            // Click an unsupported/unknown chain option (if available)
            cy.get('[data-testid="network-list"]').within(() => {
                cy.get('body').then(($body) => {
                    const hasUnsupportedOption = $body.text().includes('Unsupported') ||
                        $body.text().includes('Unknown');
                    if (hasUnsupportedOption) {
                        cy.contains(/unsupported|unknown/i).click();
                    }
                });
            });
            // Should show warning or error
            cy.contains(/unsupported|not supported|unavailable/i, { timeout: 5000 }).should('exist');
        });
        it('should not crash when wallet is on unsupported chain', () => {
            // Simulate wallet connected to an unsupported chain
            cy.window().then((win) => {
                win.ethereum = {
                    request: cy.stub().resolves(['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18']),
                    on: cy.stub().callsFake((event, cb) => {
                        if (event === 'chainChanged') {
                            cb('0x' + (999999).toString(16)); // Unsupported chain ID
                        }
                    }),
                    removeListener: cy.stub(),
                };
            });
            // App should show a warning but remain functional
            cy.contains(/unsupported|wrong network|switch network/i, { timeout: 10000 }).should('exist');
            cy.get('[data-testid="connect-wallet-btn"]').should('not.exist'); // Still connected
        });
    });
    describe('Custom Network', () => {
        it('should add custom network', () => {
            cy.get('[data-testid="network-selector"]').click();
            cy.get('[data-testid="network-list"]').should('be.visible');
            // Click "Add Network" or similar
            cy.get('[data-testid="add-network-btn"]').should('exist').click();
            // Fill in custom network details
            cy.get('[data-testid="custom-network-form"]').should('be.visible');
            cy.get('[data-testid="network-name-input"]').type('Cinacoin Testnet');
            cy.get('[data-testid="network-rpc-input"]').type('https://testnet.cinacoin.io/rpc');
            cy.get('[data-testid="network-chain-id-input"]').type('900001');
            cy.get('[data-testid="network-currency-input"]').type('CIN');
            cy.get('[data-testid="network-explorer-input"]').type('https://testnet.cinacoin.io');
            // Submit
            cy.get('[data-testid="add-network-submit"]').click();
            // Verify network was added and selected
            cy.get('[data-testid="network-selector"]').should('have.attr', 'data-active-chain-id', '900001');
            cy.get('[data-testid="network-selector"]').should('contain.text', 'Cinacoin Testnet');
        });
        it('should validate custom network RPC URL', () => {
            cy.get('[data-testid="network-selector"]').click();
            cy.get('[data-testid="add-network-btn"]').click();
            cy.get('[data-testid="network-rpc-input"]').type('not-a-valid-url');
            cy.get('[data-testid="add-network-submit"]').click();
            cy.contains(/invalid.*url|valid.*url/i).should('exist');
        });
        it('should validate custom network chain ID', () => {
            cy.get('[data-testid="network-selector"]').click();
            cy.get('[data-testid="add-network-btn"]').click();
            cy.get('[data-testid="network-name-input"]').type('Test');
            cy.get('[data-testid="network-rpc-input"]').type('https://test.rpc');
            cy.get('[data-testid="network-chain-id-input"]').type('not-a-number');
            cy.get('[data-testid="add-network-submit"]').click();
            cy.contains(/invalid.*chain|number/i).should('exist');
        });
    });
    describe('Chain-Specific Features', () => {
        it('should show layer-2 badge for Arbitrum', () => {
            cy.switchNetwork(42161);
            cy.get('[data-testid="network-selector"]').within(() => {
                cy.get('[data-testid="l2-badge"]').should('exist');
            });
        });
        it('should show layer-2 badge for Optimism', () => {
            cy.switchNetwork(10);
            cy.get('[data-testid="network-selector"]').within(() => {
                cy.get('[data-testid="l2-badge"]').should('exist');
            });
        });
        it('should not show layer-2 badge for Ethereum mainnet', () => {
            cy.switchNetwork(1);
            cy.get('[data-testid="network-selector"]').within(() => {
                cy.get('[data-testid="l2-badge"]').should('not.exist');
            });
        });
    });
    describe('Network Persistence', () => {
        it('should remember last used network after page reload', () => {
            cy.switchNetwork(11155111);
            cy.reload();
            // Should still be on Sepolia
            cy.get('[data-testid="network-selector"]').should('have.attr', 'data-active-chain-id', '11155111');
        });
    });
});
//# sourceMappingURL=multi-chain.cy.js.map