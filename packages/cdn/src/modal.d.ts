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
    wallets?: {
        id: string;
        name: string;
        icon?: string;
        installed?: boolean;
    }[];
    /** Chain IDs to support */
    chains?: number[];
}
/**
 * Render a ConnectModal into a DOM element.
 *
 * @param selector - CSS selector for the target element
 * @param options - Modal configuration options
 */
export declare function renderConnectModal(selector: string, options?: ConnectModalOptions): void;
/**
 * Show the modal.
 */
export declare function showModal(): void;
/**
 * Hide the modal.
 */
export declare function hideModal(): void;
/**
 * Toggle modal visibility.
 */
export declare function toggleModal(): void;
/**
 * Get current modal view.
 */
export declare function getCurrentView(): ModalView;
/**
 * Get connected address.
 */
export declare function getConnectedAddress(): string | null;
//# sourceMappingURL=modal.d.ts.map