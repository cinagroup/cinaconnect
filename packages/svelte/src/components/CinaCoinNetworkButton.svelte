<script lang="ts">
  import { chainId, chains, switchChain } from '../lib/stores.js';
  import type { Chain } from '@cinacoin/core-sdk';

  /**
   * CinaCoinNetworkButton — Network/chain selector button.
   *
   * Displays the current chain and allows switching between configured chains.
   *
   * @example
   * ```svelte
   * <script lang="ts">
   *   import { CinaCoinNetworkButton } from '@cinacoin/svelte';
   * </script>
   *
   * <CinaCoinNetworkButton size="md" />
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
      console.error(`[CinaCoin] Failed to switch to chain ${chain.name}:`, err);
    }
    closeDropdown();
  }

  $: currentChainName = $chainId != null
    ? $chains.find((c: Chain) => c.id === String($chainId))?.name ?? String($chainId)
    : null;

  $: sizeClass = `cinacoin-network-btn cinacoin-network-btn--${size}`;

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
    class="cinacoin-network-btn__trigger"
    class:cinacoin-network-btn__trigger--{size}
    on:click={toggleDropdown}
    disabled={disabled}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    aria-label={currentChainName ? `Current network: ${currentChainName}` : label}
  >
    <span class="cinacoin-network-btn__label">
      {#if currentChainName}
        {currentChainName}
      {:else}
        {label}
      {/if}
    </span>
    <span class="cinacoin-network-btn__chevron" aria-hidden="true">
      {isOpen ? '▲' : '▼'}
    </span>
  </button>

  {#if isOpen}
    <div class="cinacoin-network-btn__dropdown" role="listbox">
      {#each $chains as chain (chain.id)}
        <button
          class="cinacoin-network-btn__option"
          class:active={chain.id === String($chainId)}
          on:click={() => handleSwitchChain(chain)}
          role="option"
          aria-selected={chain.id === String($chainId)}
        >
          {#if chain.iconUrl}
            <img src={chain.iconUrl} alt="" class="cinacoin-network-btn__icon" />
          {/if}
          <span>{chain.name}</span>
          {#if chain.id === String($chainId)}
            <span class="cinacoin-network-btn__check" aria-hidden="true">✓</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cinacoin-network-btn {
    position: relative;
    display: inline-flex;
  }

  .cinacoin-network-btn__trigger {
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

  .cinacoin-network-btn__trigger:hover {
    border-color: #3b82f6;
  }

  .cinacoin-network-btn__trigger--sm {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
  }

  .cinacoin-network-btn__trigger--md {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .cinacoin-network-btn__trigger--lg {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .cinacoin-network-btn__chevron {
    font-size: 0.625em;
    color: #6b7280;
  }

  .cinacoin-network-btn__dropdown {
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

  .cinacoin-network-btn__option {
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

  .cinacoin-network-btn__option:hover {
    background: #f3f4f6;
  }

  .cinacoin-network-btn__option.active {
    background: #eff6ff;
    color: #3b82f6;
    font-weight: 600;
  }

  .cinacoin-network-btn__icon {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
  }

  .cinacoin-network-btn__check {
    margin-left: auto;
    color: #3b82f6;
  }
</style>
