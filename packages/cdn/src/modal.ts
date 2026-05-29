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

// ── XSS Prevention ───────────────────────────────────────
/** Escape HTML entities to prevent DOM XSS */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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
  renderModalView(modal, config, _currentView, options);

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
  renderModalView(modal, config, "connecting", options);

  // Simulate connection
  setTimeout(() => {
    _currentView = "connected";
    _address = "0x1234...5678";
    renderModalView(modal, config, "connected", options);

    // Bind disconnect button
    const disconnectBtn = modal.querySelector(".ocx-disconnect-btn");
    disconnectBtn?.addEventListener("click", () => {
      _address = null;
      _currentView = "connect";
      renderModalView(modal, config, "connect", options);
    });

    options.onConnect?.(_address!);
  }, 800);
}

// ── Safe DOM rendering helpers ───────────────────────────────────────

/**
 * Render a modal view into the given container using safe DOM APIs (no innerHTML).
 */
function renderModalView(
  container: HTMLElement,
  config: CinacoinConfig & ConnectModalOptions,
  view: ModalView,
  options: ConnectModalOptions
): void {
  // Clear existing children safely
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (view === "connecting") {
    renderConnectingView(container, config);
  } else if (view === "connected") {
    renderConnectedView(container, config, options);
  } else {
    renderConnectView(container, config, options);
  }
}

function renderConnectingView(container: HTMLElement, config: CinacoinConfig & ConnectModalOptions): void {
  const wrapper = document.createElement("div");
  wrapper.style.textAlign = "center";
  wrapper.style.padding = "40px 24px";

  const icon = document.createElement("div");
  icon.style.fontSize = "32px";
  icon.style.marginBottom = "16px";
  icon.textContent = "⏳";

  const heading = document.createElement("h3");
  heading.style.margin = "0 0 8px";
  heading.style.color = getTextColor(config.theme);
  heading.textContent = "Connecting...";

  const text = document.createElement("p");
  text.style.margin = "0";
  text.style.color = getTextSecondary(config.theme);
  text.style.fontSize = "14px";
  text.textContent = "Confirm in your wallet";

  wrapper.appendChild(icon);
  wrapper.appendChild(heading);
  wrapper.appendChild(text);
  container.appendChild(wrapper);
}

function renderConnectedView(
  container: HTMLElement,
  config: CinacoinConfig & ConnectModalOptions,
  options: ConnectModalOptions
): void {
  const wrapper = document.createElement("div");
  wrapper.style.textAlign = "center";
  wrapper.style.padding = "40px 24px";

  const icon = document.createElement("div");
  icon.style.fontSize = "32px";
  icon.style.marginBottom = "16px";
  icon.textContent = "✅";

  const heading = document.createElement("h3");
  heading.style.margin = "0 0 8px";
  heading.style.color = getTextColor(config.theme);
  heading.textContent = "Connected";

  const addressText = document.createElement("p");
  addressText.style.margin = "0 0 16px";
  addressText.style.color = getTextSecondary(config.theme);
  addressText.style.fontSize = "14px";
  addressText.textContent = _address ?? "";

  const disconnectBtn = document.createElement("button");
  disconnectBtn.className = "ocx-disconnect-btn";
  disconnectBtn.style.padding = "8px 16px";
  disconnectBtn.style.background = "transparent";
  disconnectBtn.style.border = `1px solid ${getBorderColor(config.theme)}`;
  disconnectBtn.style.borderRadius = "8px";
  disconnectBtn.style.color = getTextColor(config.theme);
  disconnectBtn.style.cursor = "pointer";
  disconnectBtn.textContent = "Disconnect";
  disconnectBtn.addEventListener("click", () => {
    _address = null;
    _currentView = "connect";
    renderModalView(container, config, "connect", options);
  });

  wrapper.appendChild(icon);
  wrapper.appendChild(heading);
  wrapper.appendChild(addressText);
  wrapper.appendChild(disconnectBtn);
  container.appendChild(wrapper);
}

function renderConnectView(
  container: HTMLElement,
  config: CinacoinConfig & ConnectModalOptions,
  options: ConnectModalOptions
): void {
  const wrapper = document.createElement("div");
  wrapper.style.padding = "24px";

  // Header row
  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  headerRow.style.marginBottom = "20px";

  const heading = document.createElement("h3");
  heading.style.margin = "0";
  heading.style.fontSize = "18px";
  heading.style.color = getTextColor(config.theme);
  heading.textContent = "Connect Wallet";

  const closeBtn = document.createElement("button");
  closeBtn.className = "ocx-modal-close";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.fontSize = "20px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.color = getTextSecondary(config.theme);
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => {
    _isOpen = false;
    container.style.display = "none";
    options.onClose?.();
  });

  headerRow.appendChild(heading);
  headerRow.appendChild(closeBtn);
  wrapper.appendChild(headerRow);

  // Wallet list
  const wallets = config.wallets ?? defaultWallets();
  for (const w of wallets) {
    const btn = document.createElement("button");
    btn.className = "ocx-wallet-btn";
    btn.dataset.walletId = w.id;
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.gap = "12px";
    btn.style.width = "100%";
    btn.style.padding = "12px";
    btn.style.border = `1px solid ${getBorderColor(config.theme)}`;
    btn.style.borderRadius = "12px";
    btn.style.background = getSurfaceColor(config.theme);
    btn.style.cursor = "pointer";
    btn.style.marginBottom = "8px";

    // Avatar circle
    const avatar = document.createElement("div");
    avatar.style.width = "32px";
    avatar.style.height = "32px";
    avatar.style.borderRadius = "8px";
    avatar.style.background = config.primaryColor || "#6366F1";
    avatar.style.display = "flex";
    avatar.style.alignItems = "center";
    avatar.style.justifyContent = "center";
    avatar.style.color = "white";
    avatar.style.fontSize = "14px";
    avatar.style.fontWeight = "bold";
    avatar.textContent = w.name[0];

    // Text container
    const textContainer = document.createElement("div");
    textContainer.style.textAlign = "left";

    const walletName = document.createElement("div");
    walletName.style.fontWeight = "600";
    walletName.style.fontSize = "14px";
    walletName.style.color = getTextColor(config.theme);
    walletName.textContent = w.name;

    const walletStatus = document.createElement("div");
    walletStatus.style.fontSize = "12px";
    walletStatus.style.color = getTextSecondary(config.theme);
    walletStatus.textContent = w.installed ? "Detected" : "Browser extension";

    textContainer.appendChild(walletName);
    textContainer.appendChild(walletStatus);
    btn.appendChild(avatar);
    btn.appendChild(textContainer);

    btn.addEventListener("click", () => {
      handleWalletSelect(w.id, config, container, options);
    });

    wrapper.appendChild(btn);
  }

  container.appendChild(wrapper);
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
