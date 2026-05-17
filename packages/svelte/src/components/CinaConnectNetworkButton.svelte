<script lang="ts">
  import { chainId, chains, switchChain } from '../lib/stores.js';
  import type { Chain } from '@cinaconnect/core-sdk';

  /**
   * CinaConnectNetworkButton — Network/chain selector button.
   *
   * Displays the current chain and allows switching between configured chains.
   *
   * @example
   * ```svelte
   * <script lang="ts">
   *   import { CinaConnectNetworkButton } from '@cinaconnect/svelte';
   * </script>
   *
   * <CinaConnectNetworkButton size="md" />
   * ```
   */

  /** Button size. */
  export let size: 'sm' | 'md' | 'lg' = 'md';

  /** Custom label when no chain is selected. */
  export let label: string = 'Select Network';

  /** Whether the button is disabled. */
  export let disabled: boolean = false;

  /** Additional CSS class. */
  export let className: string = '';

  /** Whether the dropdown is currently open. */
  let isOpen = false;

  /** Reference to the button element for positioning. */
  let buttonEl: HTMLElement;

  function toggleDropdown() {
    if (!disabled) {
      isOpen = !isOpen;
    }
  }

  function closeDropdown() {
    isOpen = false;
  }

  async function handleSwitchChain(chain: Chain) {
    try {
      const numericChainId = parseInt(chain.id, 10);
      if (!isNaN(numericChainId)) {
        await switchChain(numericChainId);
      }
    } catch (err: unknown) {
      console.error(`[CinaConnect] Failed to switch to chain ${chain.name}:`, err);
    }
    closeDropdown();
  }

  $: currentChainName = $chainId != null
    ? $chains.find((c: Chain) => c.id === String($chainId))?.name ?? String($chainId)
    : null;

  $: sizeClass = `cinaconnect-network-btn cinaconnect-network-btn--${size}`;

  // Close dropdown on outside click
  function handleOutsideClick(e: MouseEvent) {
    if (isOpen && !buttonEl?.contains(e.target as Node)) {
      closeDropdown();
    }
  }
</script>

<svelte:window on:click={handleOutsideClick} />

<div class="{sizeClass} {className}" class:open={isOpen} bind:this={buttonEl}>
  <button
    class="cinaconnect-network-btn__trigger"
    class:cinaconnect-network-btn__trigger--{size}
    on:click={toggleDropdown}
    disabled={disabled}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    aria-label={currentChainName ? `Current network: ${currentChainName}` : label}
  >
    <span class="cinaconnect-network-btn__label">
      {#if currentChainName}
        {currentChainName}
      {:else}
        {label}
      {/if}
    </span>
    <span class="cinaconnect-network-btn__chevron" aria-hidden="true">
      {isOpen ? '▲' : '▼'}
    </span>
  </button>

  {#if isOpen}
    <div class="cinaconnect-network-btn__dropdown" role="listbox">
      {#each $chains as chain (chain.id)}
        <button
          class="cinaconnect-network-btn__option"
          class:active={chain.id === String($chainId)}
          on:click={() => handleSwitchChain(chain)}
          role="option"
          aria-selected={chain.id === String($chainId)}
        >
          {#if chain.iconUrl}
            <img src={chain.iconUrl} alt="" class="cinaconnect-network-btn__icon" />
          {/if}
          <span>{chain.name}</span>
          {#if chain.id === String($chainId)}
            <span class="cinaconnect-network-btn__check" aria-hidden="true">✓</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cinaconnect-network-btn {
    position: relative;
    display: inline-flex;
  }

  .cinaconnect-network-btn__trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    font-weight: 500;
    transition: border-color 0.2s;
    font-family: inherit;
  }

  .cinaconnect-network-btn__trigger:hover {
    border-color: #3b82f6;
  }

  .cinaconnect-network-btn__trigger--sm {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
  }

  .cinaconnect-network-btn__trigger--md {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .cinaconnect-network-btn__trigger--lg {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .cinaconnect-network-btn__chevron {
    font-size: 0.625em;
    color: #6b7280;
  }

  .cinaconnect-network-btn__dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    min-width: 10rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    padding: 0.25rem;
    max-height: 20rem;
    overflow-y: auto;
  }

  .cinaconnect-network-btn__option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    text-align: left;
    font-family: inherit;
    transition: background-color 0.15s;
  }

  .cinaconnect-network-btn__option:hover {
    background: #f3f4f6;
  }

  .cinaconnect-network-btn__option.active {
    background: #eff6ff;
    color: #3b82f6;
    font-weight: 600;
  }

  .cinaconnect-network-btn__icon {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
  }

  .cinaconnect-network-btn__check {
    margin-left: auto;
    color: #3b82f6;
  }
</style>
