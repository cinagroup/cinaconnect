<script lang="ts">
  import { isConnected, address, close } from '../lib/stores.js';

  /**
   * CinaCoinAccountButton — Displays the connected account with a disconnect option.
   *
   * Shows the truncated address when connected, and a "Connect" fallback when not.
   *
   * @example
   * ```svelte
   * <script lang="ts">
   *   import { CinaCoinAccountButton } from '@cinacoin/svelte';
   * </script>
   *
   * <CinaCoinAccountButton size="sm" on:disconnect={handleDisconnect} />
   * ```
   */

  /** Button size. */
  export let size: 'sm' | 'md' | 'lg' = 'md';

  /** Custom label when disconnected. */
  export let label: string = 'Connect';

  /** Whether the button is disabled. */
  export let disabled: boolean = false;

  /** Additional CSS class. */
  export let className: string = '';

  /** Whether to show a disconnect menu on hover/click. */
  export let showDisconnect: boolean = true;

  /** Dispatched when the user disconnects. */
  export let onDisconnect: (() => void) | null = null;

  function truncateAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function handleClick() {
    if (showDisconnect && $isConnected) {
      // Toggle disconnect behavior — for simplicity, disconnect directly.
      handleDisconnect();
    }
  }

  async function handleDisconnect() {
    try {
      await close();
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (err: unknown) {
      console.error('[CinaCoin] Disconnect failed:', err);
    }
  }

  $: sizeClass = `cinacoin-account-btn cinacoin-account-btn--${size}`;
</script>

<div class={sizeClass} class:connected={$isConnected}>
  {#if $isConnected && $address}
    <button
      class="cinacoin-account-btn__address"
      class:cinacoin-account-btn__address--{size}
      on:click={handleClick}
      disabled={disabled}
      aria-label={`Connected as {$address}. Click to disconnect.`}
    >
      <span class="cinacoin-account-btn__dot" aria-hidden="true"></span>
      {truncateAddress($address)}
      {#if showDisconnect}
        <span class="cinacoin-account-btn__disconnect-icon" aria-hidden="true">✕</span>
      {/if}
    </button>
  {:else}
    <span class="cinacoin-account-btn__label">{label}</span>
  {/if}
</div>

<style>
  .cinacoin-account-btn {
    display: inline-flex;
    align-items: center;
  }

  .cinacoin-account-btn__address {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    font-weight: 500;
    transition: border-color 0.2s, background-color 0.2s;
    font-family: inherit;
  }

  .cinacoin-account-btn__address:hover {
    border-color: #3b82f6;
  }

  .cinacoin-account-btn__address--sm {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
  }

  .cinacoin-account-btn__address--md {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .cinacoin-account-btn__address--lg {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .cinacoin-account-btn__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: #10b981;
    display: inline-block;
  }

  .cinacoin-account-btn__disconnect-icon {
    font-size: 0.75em;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .cinacoin-account-btn__address:hover .cinacoin-account-btn__disconnect-icon {
    opacity: 1;
  }

  .cinacoin-account-btn__label {
    color: #6b7280;
    font-size: 0.875rem;
  }
</style>
