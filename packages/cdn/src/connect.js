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
import { getConfig, validateConfig } from "./config.js.js";
let _state = "disconnected";
let _address = null;
let _options = null;
/**
 * Render a ConnectButton into a DOM element.
 *
 * @param selector - CSS selector for the target element
 * @param options - Button configuration options
 */
export function renderConnectButton(selector, options = {}) {
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
    element.innerHTML = "";
    element.appendChild(btn);
}
/**
 * Get the current button state.
 */
export function getConnectButtonState() {
    return _state;
}
/**
 * Get the connected address.
 */
export function getConnectedAddress() {
    return _address;
}
/**
 * Programmatically disconnect.
 */
export function disconnect() {
    const btn = document.querySelector(".ocx-connect-button");
    if (btn) {
        handleDisconnect(btn, { ...getConfig(), ...(_options || {}) });
    }
}
// ── Internal handlers ──────────────────────────────────────
async function handleConnect(btn, config) {
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
    }
    catch (err) {
        _state = "disconnected";
        btn.textContent = config.label ?? "Connect Wallet";
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
        console.error("[Cinacoin] Connection failed:", err);
    }
}
function handleDisconnect(btn, config) {
    _state = "disconnected";
    _address = null;
    btn.textContent = config.label ?? "Connect Wallet";
    btn.style.background = "";
    config.onDisconnect?.();
}
function simulateConnection() {
    return new Promise((resolve) => setTimeout(resolve, 500));
}
function getButtonStyles(theme = "light", size = "md", variant = "primary", primaryColor) {
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
//# sourceMappingURL=connect.js.map