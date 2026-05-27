// ***************************************************************
// Custom Cypress Commands for Cinacoin
// ***************************************************************

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      /**
       * Connect a wallet by name.
       * Supports: MetaMask, WalletConnect, Coinbase Wallet, etc.
       * @example cy.connectWallet('MetaMask')
       * @example cy.connectWallet('WalletConnect')
       */
      connectWallet(walletName: string): Chainable<void>;

      /**
       * Disconnect the currently connected wallet.
       * @example cy.disconnectWallet()
       */
      disconnectWallet(): Chainable<void>;

      /**
       * Switch to a different blockchain network by chainId.
       * @example cy.switchNetwork(1)        // Ethereum Mainnet
       * @example cy.switchNetwork(11155111) // Sepolia
       */
      switchNetwork(chainId: number): Chainable<void>;

      /**
       * Sign a test transaction using the connected wallet.
       * @example cy.signTransaction()
       */
      signTransaction(): Chainable<Cypress.ObjectLike>;

      /**
       * Get the current wallet balance.
       * Yields an object with balance info.
       * @example cy.getBalance().then(b => cy.log(b.balance))
       */
      getBalance(): Chainable<{ balance: string; currency: string; chainId: number }>;
    }
  }
}

/**
 * cy.connectWallet(walletName)
 *
 * Opens the wallet connection modal, finds the specified wallet in the list,
 * clicks it, and waits for the connection to complete.
 */
Cypress.Commands.add('connectWallet', (walletName: string) => {
  // Open the connect wallet modal
  cy.get('[data-testid="connect-wallet-btn"]').click();

  // Wait for modal to appear
  cy.get('[data-testid="wallet-modal"]').should('be.visible');

  // Find and click the wallet option
  cy.get('[data-testid="wallet-list"]')
    .should('be.visible')
    .within(() => {
      cy.contains(walletName, { matchCase: false }).click();
    });

  // Wait for connection process to complete
  cy.get('[data-testid="wallet-modal"]', { timeout: 15000 }).should('not.exist');

  // Verify wallet is connected by checking for account button
  cy.get('[data-testid="account-btn"]').should('be.visible');
});

/**
 * cy.disconnectWallet()
 *
 * Opens the account menu and clicks disconnect.
 */
Cypress.Commands.add('disconnectWallet', () => {
  // Open account menu
  cy.get('[data-testid="account-btn"]').click();

  // Wait for dropdown
  cy.get('[data-testid="account-dropdown"]').should('be.visible');

  // Click disconnect
  cy.get('[data-testid="disconnect-btn"]').click();

  // Wait for dropdown to close
  cy.get('[data-testid="account-dropdown"]').should('not.exist');

  // Verify connect button is visible again
  cy.get('[data-testid="connect-wallet-btn"]').should('be.visible');
});

/**
 * cy.switchNetwork(chainId)
 *
 * Opens the network selector, switches to the target network, and verifies.
 */
Cypress.Commands.add('switchNetwork', (chainId: number) => {
  // Open network selector
  cy.get('[data-testid="network-selector"]').click();

  // Wait for network list
  cy.get('[data-testid="network-list"]').should('be.visible');

  // Click the target network
  cy.get(`[data-testid="network-option-${chainId}"]`).click();

  // Wait for network switch to complete
  cy.get('[data-testid="network-list"]').should('not.exist');

  // Verify the network selector shows the new network
  cy.get('[data-testid="network-selector"]').should(
    'have.attr',
    'data-active-chain-id',
    String(chainId)
  );
});

/**
 * cy.signTransaction()
 *
 * Triggers a test transaction signature and waits for completion.
 * Yields the transaction result object.
 */
Cypress.Commands.add('signTransaction', () => {
  // Trigger a test transaction (e.g., click a sign button or send a 0-value tx)
  cy.get('[data-testid="sign-tx-btn"]').click();

  // Wait for transaction to be processed
  cy.get('[data-testid="tx-status"]', { timeout: 20000 })
    .should('exist')
    .and(($el) => {
      const text = $el.text().toLowerCase();
      expect(text).to.match(/confirmed|success|completed|pending/);
    });

  // Return transaction details
  cy.get('[data-testid="tx-result"]').then(($el) => {
    try {
      const txData = JSON.parse($el.text());
      return cy.wrap(txData);
    } catch {
      return cy.wrap({ raw: $el.text() });
    }
  });
});

/**
 * cy.getBalance()
 *
 * Reads the current wallet balance from the UI.
 * Yields an object with balance, currency, and chainId.
 */
Cypress.Commands.add('getBalance', () => {
  // Open account menu to view balance
  cy.get('[data-testid="account-btn"]').click();
  cy.get('[data-testid="account-dropdown"]').should('be.visible');

  // Read balance information and chain ID, then close dropdown
  cy.get('[data-testid="wallet-balance"]')
    .invoke('text')
    .then((balanceText) => {
      const text = balanceText.trim();
      const match = text.match(/^([\d,.]+)\s*([A-Za-z]+)$/);
      return {
        balance: match ? match[1] : text,
        currency: match ? match[2] : 'ETH',
      };
    })
    .then((balanceInfo) => {
      cy.get('[data-testid="network-selector"]')
        .invoke('attr', 'data-active-chain-id')
        .then((chainIdStr) => {
          const chainId = chainIdStr ? parseInt(chainIdStr, 10) : 1;
          // Close dropdown
          cy.get('body').click(0, 0);
          cy.wrap({ ...balanceInfo, chainId });
        });
    });
});

export {};
