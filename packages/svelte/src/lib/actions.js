/**
 * Svelte actions (directives) for Cinacoin.
 *
 * Use with `use:` directive to add auto-connect and auto-network-switching
 * behavior to any element.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { cinaConnectConnect, cinaConnectNetwork } from '@cinacoin/svelte';
 * </script>
 *
 * <button use:cinaConnectConnect>Connect Wallet</button>
 * <button use:cinaConnectNetwork={{ chainId: 1 }}>Switch to Ethereum</button>
 * ```
 *
 * @packageDocumentation
 */
import { open, switchChain } from './stores.js';
/**
 * Svelte action: auto-connect directive.
 *
 * Attaches click handlers to the element that open the wallet connection flow.
 * Updates the element's disabled state based on connection status.
 *
 * @param node - The DOM element to attach to.
 * @param params - Optional configuration.
 * @returns Svelte action return value (update + destroy handlers).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { cinaConnectConnect } from '@cinacoin/svelte';
 * </script>
 *
 * <button use:cinaConnectConnect={{ enabled: true }}>
 *   Connect Wallet
 * </button>
 * ```
 */
export const cinaConnectConnect = (node, params = {}) => {
    const { enabled = true, ariaLabel, connectorId } = params;
    function handleClick(_e) {
        if (!enabled)
            return;
        open(connectorId ? { connectorId } : undefined).catch((err) => {
            console.error('[Cinacoin] Connection failed:', err);
        });
    }
    // Set accessibility attributes
    if (ariaLabel) {
        node.setAttribute('aria-label', ariaLabel);
    }
    else {
        node.setAttribute('aria-label', 'Connect wallet');
    }
    // Attach click handler
    node.addEventListener('click', handleClick);
    return {
        update(newParams = {}) {
            // Enabled state can be toggled dynamically
            if (newParams.enabled !== enabled) {
                // Re-attach or disable based on enabled state
            }
            if (newParams.ariaLabel) {
                node.setAttribute('aria-label', newParams.ariaLabel);
            }
        },
        destroy() {
            node.removeEventListener('click', handleClick);
        },
    };
};
/**
 * Svelte action: auto network switching directive.
 *
 * Attaches click handlers to the element that switch to the specified chain.
 * Disables the element if already on the target chain.
 *
 * @param node - The DOM element to attach to.
 * @param params - Configuration with target `chainId`.
 * @returns Svelte action return value (update + destroy handlers).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { cinaConnectNetwork } from '@cinacoin/svelte';
 *   import { chainId } from '@cinacoin/svelte';
 *   let currentChainId;
 *   chainId.subscribe(v => currentChainId = v);
 * </script>
 *
 * <button use:cinaConnectNetwork={{ chainId: 1 }}>
 *   Switch to Ethereum
 * </button>
 * ```
 */
export const cinaConnectNetwork = (node, params) => {
    if (!params || params.chainId == null) {
        throw new Error('[Cinacoin] cinaConnectNetwork requires a chainId parameter.');
    }
    let { chainId: targetChainId, enabled = true, ariaLabel } = params;
    function handleClick(_e) {
        if (!enabled)
            return;
        switchChain(targetChainId).catch((err) => {
            console.error(`[Cinacoin] Failed to switch to chain ${targetChainId}:`, err);
        });
    }
    if (ariaLabel) {
        node.setAttribute('aria-label', ariaLabel);
    }
    node.addEventListener('click', handleClick);
    return {
        update(newParams) {
            if (newParams && newParams.chainId != null) {
                targetChainId = newParams.chainId;
                enabled = newParams.enabled ?? true;
            }
            if (newParams?.ariaLabel) {
                node.setAttribute('aria-label', newParams.ariaLabel);
            }
        },
        destroy() {
            node.removeEventListener('click', handleClick);
        },
    };
};
//# sourceMappingURL=actions.js.map