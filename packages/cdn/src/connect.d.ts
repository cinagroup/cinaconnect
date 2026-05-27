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
/**
 * Render a ConnectButton into a DOM element.
 *
 * @param selector - CSS selector for the target element
 * @param options - Button configuration options
 */
export declare function renderConnectButton(selector: string, options?: ConnectButtonOptions): void;
/**
 * Get the current button state.
 */
export declare function getConnectButtonState(): ConnectButtonState;
/**
 * Get the connected address.
 */
export declare function getConnectedAddress(): string | null;
/**
 * Programmatically disconnect.
 */
export declare function disconnect(): void;
//# sourceMappingURL=connect.d.ts.map