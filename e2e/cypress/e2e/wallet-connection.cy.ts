// ***************************************************************
// Wallet Connection E2E Tests
// Tests for wallet connect/disconnect flow in Cinacoin
// ***************************************************************

describe('Wallet Connection', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Initial State', () => {
    it('should display connect button when not connected', () => {
      cy.get('[data-testid="connect-wallet-btn"]')
        .should('be.visible')
        .and('contain.text', 'Connect');
    });

    it('should not show account button when not connected', () => {
      cy.get('[data-testid="account-btn"]').should('not.exist');
    });
  });

  describe('Wallet Modal', () => {
    it('should open modal on connect button click', () => {
      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-modal"]').should('be.visible');
    });

    it('should show wallet list in modal', () => {
      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-modal"]').should('be.visible');
      cy.get('[data-testid="wallet-list"]').should('be.visible');

      // Verify common wallet options are listed
      cy.get('[data-testid="wallet-list"]').within(() => {
        cy.contains('MetaMask').should('exist');
        cy.contains('WalletConnect').should('exist');
        cy.contains('Coinbase Wallet').should('exist');
      });
    });

    it('should close modal when clicking outside', () => {
      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-modal"]').should('be.visible');
      cy.get('[data-testid="modal-backdrop"]').click();
      cy.get('[data-testid="wallet-modal"]').should('not.exist');
    });

    it('should close modal when pressing Escape', () => {
      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-modal"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('[data-testid="wallet-modal"]').should('not.exist');
    });
  });

  describe('WalletConnect Connection (Mocked)', () => {
    beforeEach(() => {
      // Mock WalletConnect RPC calls
      cy.intercept('POST', '**/rpc**', {
        statusCode: 200,
        body: {
          jsonrpc: '2.0',
          id: 1,
          result: '0x0000000000000000000000000000000000000000000000000000000000000001',
        },
      }).as('walletConnectRpc');

      // Mock WalletConnect session proposal
      cy.intercept('**/wc**', {
        statusCode: 200,
        body: {
          topic: 'mock-wc-topic-123',
          pairingTopic: 'mock-pairing-topic',
          expiry: Date.now() + 3600000,
          namespaces: {
            eip155: {
              accounts: ['eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'],
              chains: ['eip155:1', 'eip155:11155111'],
              methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'],
              events: ['accountsChanged', 'chainChanged'],
            },
          },
        },
      }).as('wcSession');
    });

    it('should connect to WalletConnect (mocked)', () => {
      cy.connectWallet('WalletConnect');

      // Verify QR code or connection UI appeared during flow
      // After connection, verify account button is shown
      cy.get('[data-testid="account-btn"]')
        .should('be.visible')
        .and('contain.text', '0x742d');
    });

    it('should show account button when connected', () => {
      cy.connectWallet('WalletConnect');
      cy.get('[data-testid="account-btn"]').should('be.visible');
    });

    it('should display connected address in account menu', () => {
      cy.connectWallet('WalletConnect');
      cy.get('[data-testid="account-btn"]').click();
      cy.get('[data-testid="account-dropdown"]').should('be.visible');
      cy.get('[data-testid="wallet-address"]').should(
        'contain.text',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'
      );
    });
  });

  describe('Disconnect', () => {
    beforeEach(() => {
      cy.connectWallet('WalletConnect');
    });

    it('should disconnect wallet', () => {
      cy.disconnectWallet();
      cy.get('[data-testid="connect-wallet-btn"]').should('be.visible');
      cy.get('[data-testid="account-btn"]').should('not.exist');
    });

    it('should return to initial state after disconnect', () => {
      cy.disconnectWallet();
      cy.get('[data-testid="connect-wallet-btn"]')
        .should('be.visible')
        .and('contain.text', 'Connect');
    });
  });

  describe('Connection Rejection', () => {
    it('should handle connection rejection', () => {
      // Mock a rejected connection
      cy.intercept('POST', '**/rpc**', {
        statusCode: 200,
        body: {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: 4001,
            message: 'User rejected the request.',
          },
        },
      }).as('rejectedRequest');

      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-modal"]').should('be.visible');

      cy.get('[data-testid="wallet-list"]')
        .should('be.visible')
        .within(() => {
          cy.contains('MetaMask').click();
        });

      // Wait for rejection handling
      cy.wait('@rejectedRequest');

      // Should show error or return to wallet list
      cy.get('[data-testid="wallet-modal"]').within(() => {
        cy.get('body').then(($body) => {
          const hasError = $body.text().includes('rejected') || $body.text().includes('error');
          const hasWalletList = $body.find('[data-testid="wallet-list"]').length > 0;
          expect(hasError || hasWalletList).to.be.true;
        });
      });
    });

    it('should show user-friendly error message on rejection', () => {
      cy.intercept('POST', '**/rpc**', {
        statusCode: 200,
        body: {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: 4001,
            message: 'User rejected the request.',
          },
        },
      }).as('rejectError');

      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-list"]').within(() => {
        cy.contains('MetaMask').click();
      });

      cy.wait('@rejectError');

      // Verify error message is shown
      cy.contains(/rejected|cancelled|denied/i, { timeout: 5000 }).should('exist');
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Simulate network failure
      cy.intercept('POST', '**/rpc**', {
        forceNetworkError: true,
      }).as('networkError');

      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-list"]').within(() => {
        cy.contains('MetaMask').click();
      });

      // Should show network error, not crash
      cy.wait('@networkError');
      cy.contains(/network|connection|timeout|unavailable/i, { timeout: 10000 }).should('exist');
    });

    it('should handle RPC timeout gracefully', () => {
      cy.intercept('POST', '**/rpc**', {
        statusCode: 200,
        delay: 30000, // Will exceed command timeout
        body: {},
      }).as('timeoutRequest');

      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-list"]').within(() => {
        cy.contains('WalletConnect').click();
      });

      // Should timeout and show loading/error state
      cy.contains(/loading|connecting|timeout/i, { timeout: 15000 }).should('exist');
    });

    it('should handle invalid chain configuration', () => {
      cy.intercept('POST', '**/rpc**', {
        statusCode: 200,
        body: {
          jsonrpc: '2.0',
          id: 1,
          result: null,
        },
      }).as('invalidChain');

      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-list"]').within(() => {
        cy.contains('MetaMask').click();
      });

      cy.wait('@invalidChain');
      cy.contains(/chain|network|configuration|unsupported/i, { timeout: 10000 }).should('exist');
    });
  });

  describe('MetaMask Connection (Mocked)', () => {
    it('should connect to MetaMask with mocked provider', () => {
      // Inject mock Ethereum provider
      cy.window().then((win) => {
        win.ethereum = {
          isMetaMask: true,
          request: cy.stub().resolves(['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18']),
          on: cy.stub(),
          removeListener: cy.stub(),
        };
      });

      cy.connectWallet('MetaMask');
      cy.get('[data-testid="account-btn"]').should('be.visible');
    });
  });
});
