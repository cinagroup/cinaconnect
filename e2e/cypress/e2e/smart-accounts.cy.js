"use strict";
// ***************************************************************
// Smart Account E2E Tests
// Tests for smart account detection, deployment, batch execution,
// and paymaster sponsorship in Cinacoin
// ***************************************************************
describe('Smart Accounts', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.connectWallet('WalletConnect');
    });
    describe('Smart Account Detection', () => {
        it('should detect smart account capability', () => {
            // Mock smart account detection response
            cy.intercept('POST', '**/rpc**', (req) => {
                if (req.body.method === 'eth_call' && req.body.params?.[0]?.data?.includes('isSmartAccount')) {
                    req.reply({
                        statusCode: 200,
                        body: {
                            jsonrpc: '2.0',
                            id: req.body.id,
                            result: '0x0000000000000000000000000000000000000000000000000000000000000001',
                        },
                    });
                }
                else {
                    req.reply({
                        statusCode: 200,
                        body: {
                            jsonrpc: '2.0',
                            id: req.body.id,
                            result: '0x0',
                        },
                    });
                }
            }).as('smartAccountCheck');
            // Navigate to smart account section
            cy.get('[data-testid="smart-account-btn"]').should('be.visible').click();
            // Should detect and show smart account capabilities
            cy.get('[data-testid="smart-account-status"]').should('be.visible');
            cy.contains(/smart account|account abstraction|ERC-4337/i).should('exist');
        });
        it('should show EOA status when no smart account exists', () => {
            cy.intercept('POST', '**/rpc**', {
                statusCode: 200,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0x0000000000000000000000000000000000000000000000000000000000000000',
                },
            }).as('eoaCheck');
            cy.get('[data-testid="smart-account-btn"]').click();
            cy.wait('@eoaCheck');
            cy.get('[data-testid="smart-account-status"]').should('contain.text', 'Not Deployed');
            cy.get('[data-testid="deploy-smart-account-btn"]').should('be.visible');
        });
        it('should show smart account features when detected', () => {
            // Simulate already-deployed smart account
            cy.intercept('POST', '**/rpc**', (req) => {
                if (req.body.method === 'eth_call') {
                    req.reply({
                        statusCode: 200,
                        body: {
                            jsonrpc: '2.0',
                            id: req.body.id,
                            result: '0x0000000000000000000000000000000000000000000000000000000000000001',
                        },
                    });
                }
                else {
                    req.reply({
                        statusCode: 200,
                        body: {
                            jsonrpc: '2.0',
                            id: req.body.id,
                            result: '0x0',
                        },
                    });
                }
            }).as('existingSmartAccount');
            cy.get('[data-testid="smart-account-btn"]').click();
            cy.get('[data-testid="smart-account-features"]').should('be.visible');
            cy.get('[data-testid="batch-execution-toggle"]').should('exist');
            cy.get('[data-testid="paymaster-toggle"]').should('exist');
        });
    });
    describe('Smart Account Deployment', () => {
        it('should deploy smart account', () => {
            cy.get('[data-testid="smart-account-btn"]').click();
            cy.get('[data-testid="deploy-smart-account-btn"]').click();
            // Should show deployment modal
            cy.get('[data-testid="deploy-modal"]').should('be.visible');
            // Confirm deployment
            cy.get('[data-testid="confirm-deploy-btn"]').click();
            // Wait for deployment transaction
            cy.intercept('POST', '**/rpc**', {
                statusCode: 200,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                },
            }).as('deployTx');
            cy.wait('@deployTx');
            // Should show success
            cy.get('[data-testid="deploy-success"]').should('be.visible');
            cy.contains(/deployed|smart account ready/i).should('exist');
        });
        it('should show deployment cost estimate', () => {
            cy.get('[data-testid="smart-account-btn"]').click();
            cy.get('[data-testid="deploy-smart-account-btn"]').click();
            cy.get('[data-testid="deploy-modal"]').within(() => {
                cy.get('[data-testid="deploy-cost"]').should('be.visible');
                cy.contains(/gas|fee|cost/i).should('exist');
            });
        });
        it('should handle deployment failure gracefully', () => {
            cy.get('[data-testid="smart-account-btn"]').click();
            cy.get('[data-testid="deploy-smart-account-btn"]').click();
            cy.intercept('POST', '**/rpc**', {
                statusCode: 200,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    error: {
                        code: -32000,
                        message: 'execution reverted',
                    },
                },
            }).as('deployFailed');
            cy.get('[data-testid="confirm-deploy-btn"]').click();
            cy.wait('@deployFailed');
            cy.contains(/deployment failed|reverted|error/i, { timeout: 10000 }).should('exist');
            cy.get('[data-testid="deploy-modal"]').should('be.visible'); // Modal stays open for retry
        });
        it('should show deployment progress', () => {
            cy.get('[data-testid="smart-account-btn"]').click();
            cy.get('[data-testid="deploy-smart-account-btn"]').click();
            cy.get('[data-testid="confirm-deploy-btn"]').click();
            // Should show loading/progress indicator
            cy.get('[data-testid="deploy-progress"]').should('be.visible');
            cy.contains(/deploying|confirming|waiting/i).should('exist');
        });
    });
    describe('Batch Execution', () => {
        beforeEach(() => {
            // Navigate to smart account with batch UI
            cy.get('[data-testid="smart-account-btn"]').click();
        });
        it('should show batch execution UI', () => {
            cy.get('[data-testid="batch-execution-section"]').should('be.visible');
            cy.get('[data-testid="batch-add-action-btn"]').should('exist');
        });
        it('should add multiple actions to batch', () => {
            cy.get('[data-testid="batch-add-action-btn"]').click();
            cy.get('[data-testid="batch-action-0"]').should('exist');
            // Add another action
            cy.get('[data-testid="batch-add-action-btn"]').click();
            cy.get('[data-testid="batch-action-1"]').should('exist');
            // Each action should have configurable fields
            cy.get('[data-testid="batch-action-0"]').within(() => {
                cy.get('[data-testid="action-recipient-input"]').should('exist');
                cy.get('[data-testid="action-amount-input"]').should('exist');
                cy.get('[data-testid="action-data-input"]').should('exist');
            });
        });
        it('should remove actions from batch', () => {
            cy.get('[data-testid="batch-add-action-btn"]').click();
            cy.get('[data-testid="batch-add-action-btn"]').click();
            cy.get('[data-testid="batch-action-1"]').should('exist');
            // Remove second action
            cy.get('[data-testid="batch-action-1"]')
                .find('[data-testid="remove-action-btn"]')
                .click();
            cy.get('[data-testid="batch-action-1"]').should('not.exist');
            cy.get('[data-testid="batch-action-0"]').should('exist');
        });
        it('should estimate batch execution gas', () => {
            cy.get('[data-testid="batch-add-action-btn"]').click();
            cy.get('[data-testid="batch-action-0"]')
                .find('[data-testid="action-recipient-input"]')
                .type('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
            cy.get('[data-testid="batch-action-0"]')
                .find('[data-testid="action-amount-input"]')
                .type('0.01');
            cy.intercept('POST', '**/rpc**', {
                statusCode: 200,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0x186a0', // 100000 gas
                },
            }).as('batchGasEstimate');
            cy.get('[data-testid="batch-estimate-btn"]').click();
            cy.wait('@batchGasEstimate');
            cy.get('[data-testid="batch-gas-estimate"]').should('be.visible');
            cy.contains(/100,000|gas/i).should('exist');
        });
        it('should execute batch transaction', () => {
            cy.get('[data-testid="batch-add-action-btn"]').click();
            cy.get('[data-testid="batch-action-0"]')
                .find('[data-testid="action-recipient-input"]')
                .type('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
            cy.intercept('POST', '**/rpc**', {
                statusCode: 200,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0x1234',
                },
            }).as('batchExecute');
            cy.get('[data-testid="batch-execute-btn"]').click();
            cy.wait('@batchExecute');
            cy.get('[data-testid="batch-success"]').should('be.visible');
        });
    });
    describe('Paymaster Sponsorship', () => {
        beforeEach(() => {
            cy.get('[data-testid="smart-account-btn"]').click();
        });
        it('should handle paymaster sponsorship', () => {
            // Mock paymaster availability check
            cy.intercept('POST', '**/rpc**', (req) => {
                if (req.body.method === 'pm_getPaymasterStubData') {
                    req.reply({
                        statusCode: 200,
                        body: {
                            jsonrpc: '2.0',
                            id: req.body.id,
                            result: {
                                paymaster: '0xPaymaster1234567890abcdef1234567890abcdef12',
                                paymasterData: '0x',
                                isFinal: true,
                            },
                        },
                    });
                }
                else {
                    req.reply({
                        statusCode: 200,
                        body: {
                            jsonrpc: '2.0',
                            id: req.body.id,
                            result: '0x0',
                        },
                    });
                }
            }).as('paymasterCheck');
            // Enable paymaster sponsorship
            cy.get('[data-testid="paymaster-toggle"]').click();
            cy.wait('@paymasterCheck');
            // Should show sponsorship active
            cy.get('[data-testid="paymaster-status"]').should('contain.text', 'Sponsored');
            cy.get('[data-testid="gas-fee-display"]').should('contain.text', '0');
            cy.contains(/gas free|sponsored|covered/i).should('exist');
        });
        it('should show paymaster eligibility criteria', () => {
            cy.get('[data-testid="paymaster-info-btn"]').click();
            cy.get('[data-testid="paymaster-info-modal"]').should('be.visible');
            cy.get('[data-testid="paymaster-info-modal"]').within(() => {
                cy.contains(/eligible|criteria|require/i).should('exist');
                cy.contains(/token|sponsorship|limit/i).should('exist');
            });
        });
        it('should handle paymaster rejection gracefully', () => {
            cy.intercept('POST', '**/rpc**', {
                statusCode: 200,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    error: {
                        code: -32603,
                        message: 'Paymaster rejected: insufficient balance',
                    },
                },
            }).as('paymasterRejected');
            cy.get('[data-testid="paymaster-toggle"]').click();
            cy.wait('@paymasterRejected');
            // Should show error but allow fallback to self-pay
            cy.contains(/paymaster rejected|not eligible|insufficient/i, { timeout: 10000 }).should('exist');
            cy.get('[data-testid="fallback-pay-btn"]').should('exist');
        });
        it('should toggle paymaster on/off', () => {
            cy.get('[data-testid="paymaster-toggle"]').should('not.be.checked');
            cy.get('[data-testid="paymaster-toggle"]').click();
            cy.get('[data-testid="paymaster-toggle"]').should('be.checked');
            cy.get('[data-testid="paymaster-toggle"]').click();
            cy.get('[data-testid="paymaster-toggle"]').should('not.be.checked');
        });
    });
    describe('Session Key', () => {
        it('should support session key creation', () => {
            cy.get('[data-testid="smart-account-btn"]').click();
            cy.get('[data-testid="session-keys-btn"]').should('exist').click();
            cy.get('[data-testid="session-key-modal"]').should('be.visible');
            cy.get('[data-testid="create-session-key-btn"]').should('exist');
        });
        it('should show active session keys', () => {
            cy.get('[data-testid="smart-account-btn"]').click();
            cy.get('[data-testid="session-keys-btn"]').click();
            // Should list any existing session keys
            cy.get('[data-testid="session-keys-list"]').should('exist');
        });
    });
});
//# sourceMappingURL=smart-accounts.cy.js.map