/**
 * ConnectModal CDN component.
 *
 * For script-tag usage:
 * ```html
 * <script src="https://cdn.cinacoin.dev/connect.js"></script>
 * <script>
 *   Cinacoin.renderConnectModal('#my-modal', {
 *     projectId: 'your-project-id',
 *     theme: 'dark',
 *   });
 * </script>
 * ```
 */

import { getConfig, validateConfig } from "./config.js";
import type { CinacoinConfig } from "./config.js";

export type ModalView = "connect" | "connecting" | "connected" | "networks";

export interface ConnectModalOptions {
  /** WalletConnect Project ID */
  projectId?: string;
  /** Theme mode */
  theme?: "light" | "dark";
  /** Custom primary color */
  primaryColor?: string;
  /** Default view */
  defaultView?: ModalView;
  /** Callback when connected */
  onConnect?: (address: string) => void;
  /** Callback when closed */
  onClose?: () => void;
  /** Wallet list to display */
  wallets?: { id: string; name: string; icon?: string; installed?: boolean }[];
  /** Chain IDs to support */
  chains?: number[];
}

let _isOpen = false;
let _currentView: ModalView = "connect";
let _address: string | null = null;

/**
 * Render a ConnectModal into a DOM element.
 *
 * @param selector - CSS selector for the target element
 * @param options - Modal configuration options
 */
export function renderConnectModal(
  selector: string,
  options: ConnectModalOptions = {}
): void {
  const element = document.querySelector(selector);
  if (!element) {
    console.error(`[Cinacoin] Element "${selector}" not found`);
    return;
  }

  const config = { ...getConfig(), ...options };
  const missing = validateConfig(config);
  if (missing.length > 0) {
    console.warn(`[Cinacoin] Missing config: ${missing.join(", ")}`);
  }

  _isOpen = false;
  _currentView = options.defaultView ?? "connect";

  // Create modal container
  const modal = document.createElement("div");
  modal.className = "ocx-connect-modal";
  modal.style.cssText = getModalStyles(config.theme, config.primaryColor);
  modal.innerHTML = getModalContent(config, _currentView);

  (element as HTMLElement).innerHTML = "";
  element.appendChild(modal);

  // Bind close button
  const closeBtn = modal.querySelector(".ocx-modal-close");
  closeBtn?.addEventListener("click", () => {
    _isOpen = false;
    modal.style.display = "none";
    options.onClose?.();
  });

  // Bind wallet selection buttons
  modal.querySelectorAll(".ocx-wallet-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const walletId = (btn as HTMLElement).dataset.walletId;
      handleWalletSelect(walletId ?? "", config, modal, options);
    });
  });

  // Expose toggle function on the element
  (element as HTMLElement & { toggle: () => void }).toggle = () => {
    _isOpen = !_isOpen;
    modal.style.display = _isOpen ? "flex" : "none";
  };
}

/**
 * Show the modal.
 */
export function showModal(): void {
  const modal = document.querySelector(".ocx-connect-modal");
  if (modal) {
    _isOpen = true;
    (modal as HTMLElement).style.display = "flex";
  }
}

/**
 * Hide the modal.
 */
export function hideModal(): void {
  const modal = document.querySelector(".ocx-connect-modal");
  if (modal) {
    _isOpen = false;
    (modal as HTMLElement).style.display = "none";
  }
}

/**
 * Toggle modal visibility.
 */
export function toggleModal(): void {
  _isOpen ? hideModal() : showModal();
}

/**
 * Get current modal view.
 */
export function getCurrentView(): ModalView {
  return _currentView;
}

/**
 * Get connected address.
 */
export function getConnectedAddress(): string | null {
  return _address;
}

// ── Internal helpers ───────────────────────────────────────

function handleWalletSelect(
  walletId: string,
  config: CinacoinConfig & ConnectModalOptions,
  modal: HTMLElement,
  options: ConnectModalOptions
): void {
  _currentView = "connecting";
  modal.innerHTML = getModalContent(config, "connecting");

  // Simulate connection
  setTimeout(() => {
    _currentView = "connected";
    _address = "0x1234...5678";
    modal.innerHTML = getModalContent(config, "connected");

    // Bind disconnect button
    const disconnectBtn = modal.querySelector(".ocx-disconnect-btn");
    disconnectBtn?.addEventListener("click", () => {
      _address = null;
      _currentView = "connect";
      modal.innerHTML = getModalContent(config, "connect");
    });

    options.onConnect?.(_address!);
  }, 800);
}

function getModalContent(config: CinacoinConfig & ConnectModalOptions, view: ModalView): string {
  if (view === "connecting") {
    return `
      <div style="text-align:center;padding:40px 24px;">
        <div style="font-size:32px;margin-bottom:16px;">⏳</div>
        <h3 style="margin:0 0 8px;color:${getTextColor(config.theme)};">Connecting...</h3>
        <p style="margin:0;color:${getTextSecondary(config.theme)};font-size:14px;">Confirm in your wallet</p>
      </div>
    `;
  }

  if (view === "connected") {
    return `
      <div style="text-align:center;padding:40px 24px;">
        <div style="font-size:32px;margin-bottom:16px;">✅</div>
        <h3 style="margin:0 0 8px;color:${getTextColor(config.theme)};">Connected</h3>
        <p style="margin:0 0 16px;color:${getTextSecondary(config.theme)};font-size:14px;">${_address}</p>
        <button class="ocx-disconnect-btn" style="padding:8px 16px;background:transparent;border:1px solid ${getBorderColor(config.theme)};border-radius:8px;color:${getTextColor(config.theme)};cursor:pointer;">Disconnect</button>
      </div>
    `;
  }

  // Default: connect view
  const wallets = config.wallets ?? defaultWallets();
  return `
    <div style="padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="margin:0;font-size:18px;color:${getTextColor(config.theme)};">Connect Wallet</h3>
        <button class="ocx-modal-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:${getTextSecondary(config.theme)};">✕</button>
      </div>
      ${wallets.map((w) => `
        <button class="ocx-wallet-btn" data-wallet-id="${w.id}" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:1px solid ${getBorderColor(config.theme)};border-radius:12px;background:${getSurfaceColor(config.theme)};cursor:pointer;margin-bottom:8px;">
          <div style="width:32px;height:32px;border-radius:8px;background:${config.primaryColor || "#6366F1"};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">${w.name[0]}</div>
          <div style="text-align:left;">
            <div style="font-weight:600;font-size:14px;color:${getTextColor(config.theme)};">${w.name}</div>
            <div style="font-size:12px;color:${getTextSecondary(config.theme)};">${w.installed ? "Detected" : "Browser extension"}</div>
          </div>
        </button>
      `).join("")}
    </div>
  `;
}

function defaultWallets() {
  return [
    { id: "metamask", name: "MetaMask", installed: true },
    { id: "walletconnect", name: "WalletConnect", installed: false },
    { id: "coinbase", name: "Coinbase Wallet", installed: false },
    { id: "rainbow", name: "Rainbow", installed: false },
  ];
}

function getModalStyles(theme: "light" | "dark", primaryColor?: string): string {
  const bg = theme === "dark" ? "#1E293B" : "#FFFFFF";
  const border = theme === "dark" ? "#334155" : "#E2E8F0";
  return `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${bg};
    border: 1px solid ${border};
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    max-width: 380px;
    width: 100%;
    display: none;
    z-index: 9999;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
}

function getTextColor(theme: "light" | "dark"): string {
  return theme === "dark" ? "#F8FAFC" : "#0F172A";
}

function getTextSecondary(theme: "light" | "dark"): string {
  return theme === "dark" ? "#94A3B8" : "#64748B";
}

function getBorderColor(theme: "light" | "dark"): string {
  return theme === "dark" ? "#334155" : "#E2E8F0";
}

function getSurfaceColor(theme: "light" | "dark"): string {
  return theme === "dark" ? "#0F172A" : "#F8FAFC";
}
