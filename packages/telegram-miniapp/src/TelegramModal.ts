/**
 * Telegram-native wallet modal.
 *
 * Displays a wallet connection modal using Telegram's native UI
 * components (MainButton, showAlert, showConfirm) for a seamless
 * Mini App experience.
 */

import type { TelegramWebApp } from './types.js';
import { TelegramProvider } from './TelegramProvider.js';

/** Wallet option displayed in the modal. */
export interface WalletOption {
  /** Unique wallet identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Icon URL or emoji. */
  icon: string;
  /** Whether it's recommended. */
  recommended?: boolean;
}

/** Modal configuration. */
export interface TelegramModalConfig {
  /** Title shown in the modal. */
  title?: string;
  /** Wallet options to display. */
  wallets?: WalletOption[];
  /** Custom TelegramWebApp (for testing). */
  webApp?: TelegramWebApp;
}

/**
 * TelegramModal: Native-feeling wallet selection modal.
 *
 * Uses Telegram's MainButton and native dialogs to present
 * a wallet selection flow optimized for Mini Apps.
 */
export class TelegramModal {
  /** Provider instance. */
  private provider: TelegramProvider;
  /** Modal title. */
  private title: string;
  /** Available wallets. */
  private wallets: WalletOption[];
  /** Selected wallet ID. */
  private selectedWallet: string | null = null;

  /**
   * Create a new TelegramModal.
   *
   * @param config - Modal configuration.
   */
  constructor(config: TelegramModalConfig = {}) {
    this.provider = new TelegramProvider({ webApp: config.webApp });
    this.title = config.title ?? 'Connect Wallet';
    this.wallets = config.wallets ?? [];
  }

  /**
   * Initialize the modal.
   *
   * @returns True if available.
   */
  async initialize(): Promise<boolean> {
    return this.provider.initialize();
  }

  /**
   * Show the wallet selection modal.
   *
   * Sets up the main button to cycle through wallet options.
   *
   * @returns Promise resolving to selected wallet ID or null if cancelled.
   */
  show(): Promise<string | null> {
    return new Promise((resolve) => {
      if (this.wallets.length === 0) {
        this.provider.showAlert('No wallets available');
        resolve(null);
        return;
      }

      let index = 0;

      // Show first option
      this.updateMainButton(index);

      const handleClick = () => {
        if (index < this.wallets.length - 1) {
          index++;
          this.updateMainButton(index);
          this.provider.triggerHaptic('light');
        } else {
          // Last wallet selected
          const wallet = this.wallets[index];
          this.selectedWallet = wallet.id;
          this.cleanup();
          this.provider.triggerHaptic('success');
          resolve(wallet.id);
        }
      };

      this.provider.onMainButtonClick(handleClick);
    });
  }

  /**
   * Show a confirm dialog before connecting.
   *
   * @param walletName - Name of wallet to connect.
   * @returns True if user confirms.
   */
  async confirmConnection(walletName: string): Promise<boolean> {
    return this.provider.showConfirm(`Connect to ${walletName}?`);
  }

  /**
   * Get available wallet options.
   *
   * @returns Array of wallet options.
   */
  getWalletOptions(): WalletOption[] {
    return [...this.wallets];
  }

  /**
   * Get the selected wallet ID.
   *
   * @returns Wallet ID or null.
   */
  getSelectedWallet(): string | null {
    return this.selectedWallet;
  }

  /**
   * Get the provider instance.
   *
   * @returns TelegramProvider.
   */
  getProvider(): TelegramProvider {
    return this.provider;
  }

  /** Update main button text and color for current index. */
  private updateMainButton(index: number): void {
    const wallet = this.wallets[index];
    const text = `${wallet.name} (${index + 1}/${this.wallets.length})`;
    this.provider.setMainButtonText(text);
    this.provider.showMainButton();
  }

  /** Clean up button and listeners. */
  private cleanup(): void {
    this.provider.hideMainButton();
  }
}
