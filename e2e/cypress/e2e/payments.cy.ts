// ***************************************************************
// Payment Flow E2E Tests
// Tests for swap, token selection, quotes, and on-ramp
// ***************************************************************

describe('Payment Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.connectWallet('WalletConnect');
  });

  describe('Swap Modal', () => {
    it('should open swap modal', () => {
      cy.get('[data-testid="swap-btn"]').click();
      cy.get('[data-testid="swap-modal"]').should('be.visible');
    });

    it('should close swap modal when clicking outside', () => {
      cy.get('[data-testid="swap-btn"]').click();
      cy.get('[data-testid="swap-modal"]').should('be.visible');
      cy.get('[data-testid="swap-modal-backdrop"]').click();
      cy.get('[data-testid="swap-modal"]').should('not.exist');
    });

    it('should close swap modal on Escape key', () => {
      cy.get('[data-testid="swap-btn"]').click();
      cy.get('[data-testid="swap-modal"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('[data-testid="swap-modal"]').should('not.exist');
    });
  });

  describe('Token Selector', () => {
    beforeEach(() => {
      cy.get('[data-testid="swap-btn"]').click();
      cy.get('[data-testid="swap-modal"]').should('be.visible');
    });

    it('should display token selector', () => {
      cy.get('[data-testid="token-selector"]').should('be.visible');
    });

    it('should show token list with common tokens', () => {
      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').should('be.visible');

      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('ETH').should('exist');
        cy.contains('USDC').should('exist');
        cy.contains('USDT').should('exist');
        cy.contains('DAI').should('exist');
        cy.contains('WBTC').should('exist');
      });
    });

    it('should filter tokens by search', () => {
      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-search-input"]').type('USDC');

      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('USDC').should('exist');
        cy.contains('ETH').should('not.exist');
      });
    });

    it('should select a token and update swap input', () => {
      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('USDC').click();
      });

      cy.get('[data-testid="swap-modal"]').within(() => {
        cy.get('[data-testid="from-token-display"]').should('contain.text', 'USDC');
      });
    });

    it('should show token balance in selector', () => {
      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.get('[data-testid="token-balance"]').should('exist');
      });
    });
  });

  describe('Swap Quote', () => {
    beforeEach(() => {
      // Mock quote API
      cy.intercept('GET', '**/quote**', {
        statusCode: 200,
        body: {
          fromToken: {
            symbol: 'ETH',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
          },
          toToken: {
            symbol: 'USDC',
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
          },
          fromAmount: '1000000000000000000',
          toAmount: '3500000000',
          route: ['Uniswap V3', 'Uniswap V2'],
          priceImpact: '0.12',
          gasEstimate: '150000',
          slippage: '0.5',
        },
      }).as('swapQuote');
    });

    it('should show quote after token selection', () => {
      cy.get('[data-testid="swap-btn"]').click();

      // Select from token
      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('ETH').click();
      });

      // Enter amount
      cy.get('[data-testid="swap-amount-input"]').type('1');

      // Select to token
      cy.get('[data-testid="to-token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('USDC').click();
      });

      // Wait for quote
      cy.wait('@swapQuote');

      // Verify quote display
      cy.get('[data-testid="swap-quote"]').should('be.visible');
      cy.get('[data-testid="swap-quote"]').within(() => {
        cy.contains('3,500').should('exist');
        cy.contains('Price Impact').should('exist');
        cy.contains('Gas').should('exist');
      });
    });

    it('should show minimum received after slippage', () => {
      cy.get('[data-testid="swap-btn"]').click();

      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('ETH').click();
      });
      cy.get('[data-testid="swap-amount-input"]').type('1');
      cy.get('[data-testid="to-token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('USDC').click();
      });

      cy.wait('@swapQuote');

      cy.get('[data-testid="minimum-received"]').should('be.visible');
      cy.get('[data-testid="minimum-received"]').should('contain.text', '3,482');
    });

    it('should update quote when amount changes', () => {
      cy.get('[data-testid="swap-btn"]').click();

      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('ETH').click();
      });
      cy.get('[data-testid="swap-amount-input"]').type('1');
      cy.get('[data-testid="to-token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('USDC').click();
      });
      cy.wait('@swapQuote');

      // Change amount
      cy.get('[data-testid="swap-amount-input"]').clear().type('2');

      // Should fetch new quote
      cy.wait('@swapQuote');
      cy.get('[data-testid="swap-quote"]').should('contain.text', '7,000');
    });
  });

  describe('Swap Execution', () => {
    it('should handle swap failure gracefully', () => {
      // Mock failed swap
      cy.intercept('POST', '**/swap**', {
        statusCode: 400,
        body: {
          error: 'Swap failed: insufficient liquidity',
          code: 'INSUFFICIENT_LIQUIDITY',
        },
      }).as('failedSwap');

      cy.get('[data-testid="swap-btn"]').click();
      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('ETH').click();
      });
      cy.get('[data-testid="swap-amount-input"]').type('1');
      cy.get('[data-testid="to-token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('USDC').click();
      });
      cy.wait('@swapQuote');

      // Click swap button
      cy.get('[data-testid="execute-swap-btn"]').click();
      cy.wait('@failedSwap');

      // Should show error message
      cy.contains(/insufficient liquidity|swap failed|error/i, { timeout: 10000 }).should('exist');
      // Modal should still be open for retry
      cy.get('[data-testid="swap-modal"]').should('be.visible');
    });

    it('should handle user rejection of transaction', () => {
      cy.intercept('POST', '**/swap**', {
        statusCode: 200,
        body: {
          error: {
            code: 4001,
            message: 'User rejected the transaction.',
          },
        },
      }).as('userRejected');

      cy.get('[data-testid="swap-btn"]').click();
      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('ETH').click();
      });
      cy.get('[data-testid="swap-amount-input"]').type('1');
      cy.get('[data-testid="to-token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('USDC').click();
      });
      cy.wait('@swapQuote');

      cy.get('[data-testid="execute-swap-btn"]').click();
      cy.wait('@userRejected');

      cy.contains(/rejected|cancelled/i, { timeout: 10000 }).should('exist');
    });

    it('should show success confirmation after swap', () => {
      cy.intercept('POST', '**/swap**', {
        statusCode: 200,
        body: {
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          blockNumber: 18000000,
        },
      }).as('successfulSwap');

      cy.get('[data-testid="swap-btn"]').click();
      cy.get('[data-testid="token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('ETH').click();
      });
      cy.get('[data-testid="swap-amount-input"]').type('1');
      cy.get('[data-testid="to-token-selector"]').click();
      cy.get('[data-testid="token-list"]').within(() => {
        cy.contains('USDC').click();
      });
      cy.wait('@swapQuote');

      cy.get('[data-testid="execute-swap-btn"]').click();
      cy.wait('@successfulSwap');

      cy.get('[data-testid="swap-success"]').should('be.visible');
      cy.contains(/swap successful|confirmed/i).should('exist');
      cy.get('[data-testid="tx-hash"]').should('contain.text', '0x1234');
    });
  });

  describe('On-Ramp', () => {
    it('should open on-ramp modal', () => {
      cy.get('[data-testid="onramp-btn"]').click();
      cy.get('[data-testid="onramp-modal"]').should('be.visible');
    });

    it('should display exchange options in on-ramp modal', () => {
      cy.get('[data-testid="onramp-btn"]').click();
      cy.get('[data-testid="onramp-modal"]').should('be.visible');

      // Should show payment methods
      cy.get('[data-testid="onramp-modal"]').within(() => {
        cy.contains(/credit|card|debit/i).should('exist');
        cy.contains(/bank/i).should('exist');
        cy.contains(/apple|google|apple pay|google pay/i, { timeout: 5000 }).should('exist');
      });
    });

    it('should display supported currencies in on-ramp', () => {
      cy.get('[data-testid="onramp-btn"]').click();
      cy.get('[data-testid="onramp-modal"]').should('be.visible');

      cy.get('[data-testid="onramp-modal"]').within(() => {
        cy.contains(/USD|EUR|GBP/i).should('exist');
      });
    });

    it('should close on-ramp modal when clicking outside', () => {
      cy.get('[data-testid="onramp-btn"]').click();
      cy.get('[data-testid="onramp-modal"]').should('be.visible');
      cy.get('[data-testid="onramp-modal-backdrop"]').click();
      cy.get('[data-testid="onramp-modal"]').should('not.exist');
    });

    it('should show provider options (Stripe, MoonPay, etc.)', () => {
      cy.get('[data-testid="onramp-btn"]').click();
      cy.get('[data-testid="onramp-modal"]').should('be.visible');

      cy.get('[data-testid="onramp-providers"]').should('be.visible');
      cy.get('[data-testid="onramp-providers"]').within(() => {
        cy.contains(/moonpay|stripe|transak|ramp/i).should('exist');
      });
    });
  });
});
