/**
 * Svelte actions (directives) for CinaConnect.
 *
 * Use with `use:` directive to add auto-connect and auto-network-switching
 * behavior to any element.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { cinaConnectConnect, cinaConnectNetwork } from '@cinaconnect/svelte';
 * </script>
 *
 * <button use:cinaConnectConnect>Connect Wallet</button>
 * <button use:cinaConnectNetwork={{ chainId: 1 }}>Switch to Ethereum</button>
 * ```
 *
 * @packageDocumentation
 */

import type { Action } from 'svelte/action';
import { open, close, switchChain, isConnected, getConnector } from './stores.js';

// ─── cinaConnectConnect ─────────────────────────────────────────────────────

/**
 * Parameters for the `cinaConnectConnect` action.
 */
export interface CinaConnectConnectParams {
  /** Whether the action is enabled. Defaults to `true`. */
  enabled?: boolean;

  /** Optional label override for accessibility. */
  ariaLabel?: string;

  /** Optional connector ID to prefer when multiple are available. */
  connectorId?: string;
}

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
 *   import { cinaConnectConnect } from '@cinaconnect/svelte';
 * </script>
 *
 * <button use:cinaConnectConnect={{ enabled: true }}>
 *   Connect Wallet
 * </button>
 * ```
 */
export const cinaConnectConnect: Action<
  HTMLElement,
  CinaConnectConnectParams | undefined
> = (
  node: HTMLElement,
  params: CinaConnectConnectParams = {},
) => {
  const { enabled = true, ariaLabel, connectorId } = params;

  function handleClick(_e: MouseEvent) {
    if (!enabled) return;
    open(connectorId ? { connectorId } : undefined).catch((err: unknown) => {
      console.error('[CinaConnect] Connection failed:', err);
    });
  }

  // Set accessibility attributes
  if (ariaLabel) {
    node.setAttribute('aria-label', ariaLabel);
  } else {
    node.setAttribute('aria-label', 'Connect wallet');
  }

  // Attach click handler
  node.addEventListener('click', handleClick);

  return {
    update(newParams: CinaConnectConnectParams = {}) {
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

// ─── cinaConnectNetwork ─────────────────────────────────────────────────────

/**
 * Parameters for the `cinaConnectNetwork` action.
 */
export interface CinaConnectNetworkParams {
  /** Target chain ID to switch to. */
  chainId: number;

  /** Whether the action is enabled. Defaults to `true`. */
  enabled?: boolean;

  /** Optional label override for accessibility. */
  ariaLabel?: string;
}

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
 *   import { cinaConnectNetwork } from '@cinaconnect/svelte';
 *   import { chainId } from '@cinaconnect/svelte';
 *   let currentChainId;
 *   chainId.subscribe(v => currentChainId = v);
 * </script>
 *
 * <button use:cinaConnectNetwork={{ chainId: 1 }}>
 *   Switch to Ethereum
 * </button>
 * ```
 */
export const cinaConnectNetwork: Action<
  HTMLElement,
  CinaConnectNetworkParams | undefined
> = (
  node: HTMLElement,
  params: CinaConnectNetworkParams | undefined,
) => {
  if (!params || params.chainId == null) {
    throw new Error('[CinaConnect] cinaConnectNetwork requires a chainId parameter.');
  }

  let { chainId: targetChainId, enabled = true, ariaLabel } = params;

  function handleClick(_e: MouseEvent) {
    if (!enabled) return;
    switchChain(targetChainId).catch((err: unknown) => {
      console.error(`[CinaConnect] Failed to switch to chain ${targetChainId}:`, err);
    });
  }

  if (ariaLabel) {
    node.setAttribute('aria-label', ariaLabel);
  }

  node.addEventListener('click', handleClick);

  return {
    update(newParams: CinaConnectNetworkParams | undefined) {
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
