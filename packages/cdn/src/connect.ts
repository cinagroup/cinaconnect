/**
 * ConnectButton CDN component.
 *
 * For script-tag usage:
 * ```html
 * <script src="https://cdn.cinacoin.dev/connect.js"></script>
 * <script>
 *   Cinacoin.renderConnectButton('#my-button', {
 *     projectId: 'your-project-id',
 *     theme: 'dark',
 *   });
 * </script>
 * ```
 */

import { getConfig, validateConfig } from "./config.js";
import type { CinacoinConfig } from "./config.js";

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonVariant = "primary" | "outline";

export interface ConnectButtonOptions {
  /** WalletConnect Project ID */
  projectId?: string;
  /** Theme mode */
  theme?: "light" | "dark";
  /** Custom primary color */
  primaryColor?: string;
  /** Button size */
  size?: ButtonSize;
  /** Button variant */
  variant?: ButtonVariant;
  /** Custom button text */
  label?: string;
  /** Callback when connected */
  onConnect?: (address: string) => void;
  /** Callback when disconnected */
  onDisconnect?: () => void;
}

/**
 * State of the ConnectButton.
 */
export type ConnectButtonState = "disconnected" | "connecting" | "connected";

let _state: ConnectButtonState = "disconnected";
let _address: string | null = null;
let _options: ConnectButtonOptions | null = null;

/**
 * Render a ConnectButton into a DOM element.
 *
 * @param selector - CSS selector for the target element
 * @param options - Button configuration options
 */
export function renderConnectButton(
  selector: string,
  options: ConnectButtonOptions = {}
): void {
  const element = document.querySelector(selector);
  if (!element) {
    console.error(`[Cinacoin] Element "${selector}" not found`);
    return;
  }

  const config = { ...getConfig(), ...options };
  _options = options;

  const missing = validateConfig(config);
  if (missing.length > 0) {
    console.warn(`[Cinacoin] Missing config: ${missing.join(", ")}`);
  }

  const btn = document.createElement("button");
  btn.className = "ocx-connect-button";
  Object.assign(btn.style, getButtonStyles(config.theme, config.size, config.variant, config.primaryColor));
  btn.textContent = options.label ?? "Connect Wallet";

  btn.addEventListener("click", async () => {
    if (_state === "connected") {
      handleDisconnect(btn, config);
      return;
    }
    await handleConnect(btn, config);
  });

  // Clear previous content and append
  (element as HTMLElement).innerHTML = "";
  element.appendChild(btn);
}

/**
 * Get the current button state.
 */
export function getConnectButtonState(): ConnectButtonState {
  return _state;
}

/**
 * Get the connected address.
 */
export function getConnectedAddress(): string | null {
  return _address;
}

/**
 * Programmatically disconnect.
 */
export function disconnect(): void {
  const btn = document.querySelector(".ocx-connect-button");
  if (btn) {
    handleDisconnect(btn as HTMLElement, { ...getConfig(), ...(_options || {}) });
  }
}

// ── Internal handlers ──────────────────────────────────────

async function handleConnect(btn: HTMLElement, config: CinacoinConfig & ConnectButtonOptions): Promise<void> {
  _state = "connecting";
  btn.textContent = "Connecting...";
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";

  try {
    // Simulate wallet connection (in real usage, this would use Wagmi/viem)
    await simulateConnection();
    _state = "connected";
    _address = "0x1234...5678"; // placeholder

    btn.textContent = `${_address}`;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";

    config.onConnect?.(_address);
  } catch (err: unknown) {
    _state = "disconnected";
    btn.textContent = config.label ?? "Connect Wallet";
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
    console.error("[Cinacoin] Connection failed:", err);
  }
}

function handleDisconnect(btn: HTMLElement, config: CinacoinConfig & ConnectButtonOptions): void {
  _state = "disconnected";
  _address = null;
  btn.textContent = config.label ?? "Connect Wallet";
  btn.style.background = "";
  config.onDisconnect?.();
}

function simulateConnection(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 500));
}

function getButtonStyles(
  theme: "light" | "dark" = "light",
  size: ButtonSize = "md",
  variant: ButtonVariant = "primary",
  primaryColor?: string
): Record<string, string> {
  const colors = {
    bg: variant === "primary" ? (primaryColor || "#6366F1") : "transparent",
    text: variant === "primary" ? "#FFFFFF" : (theme === "dark" ? "#F8FAFC" : "#0F172A"),
    border: variant === "outline" ? (theme === "dark" ? "#334155" : "#E2E8F0") : "none",
  };

  const sizes = {
    sm: { padding: "6px 12px", fontSize: "12px" },
    md: { padding: "8px 16px", fontSize: "14px" },
    lg: { padding: "12px 24px", fontSize: "16px" },
  };

  return {
    ...sizes[size],
    background: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: "all 150ms ease",
  };
}
