<script lang="ts">
  import { isConnected, isConnecting, address, open } from '../lib/stores.js';

  /**
   * CinaConnectButton — Primary wallet connection button.
   *
   * Shows "Connect Wallet" when disconnected, loading state while
   * connecting, and the connected address when connected.
   *
   * @example
   * ```svelte
   * <script lang="ts">
   *   import { CinaConnectButton } from '@cinaconnect/svelte';
   * </script>
   *
   * <CinaConnectButton size="md" label="Connect" />
   * ```
   */

  /** Button size. */
  export let size: 'sm' | 'md' | 'lg' = 'md';

  /** Custom label for the disconnected state. */
  export let label: string = 'Connect Wallet';

  /** Label shown while connecting. */
  export let loadingLabel: string = 'Connecting...';

  /** Whether the button is disabled. */
  export let disabled: boolean = false;

  /** Additional CSS class. */
  export let className: string = '';

  function truncateAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  $: labelClass = `cinaconnect-btn-text--${size}`;
  $: sizeClass = `cinaconnect-btn cinaconnect-btn--${size}`;

  function handleClick() {
    if (!disabled && !$isConnected && !$isConnecting) {
      open().catch((err: unknown) => {
        console.error('[CinaConnect] Connection failed:', err);
      });
    }
  }
</script>

<button
  class="{sizeClass} {className}"
  class:is-connected={$isConnected}
  class:is-connecting={$isConnecting}
  on:click={handleClick}
  disabled={disabled || $isConnecting}
  aria-label={$isConnected ? `Connected as {$address}` : label}
>
  {#if $isConnecting}
    <span class={labelClass}>{loadingLabel}</span>
    <span class="cinaconnect-btn-spinner" aria-hidden="true">⟳</span>
  {:else if $isConnected && $address}
    <span class={labelClass}>{truncateAddress($address)}</span>
  {:else}
    <span class={labelClass}>{label}</span>
  {/if}
</button>

<style>
  .cinaconnect-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s, transform 0.1s, opacity 0.2s;
    outline: none;
    font-family: inherit;
  }

  .cinaconnect-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .cinaconnect-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .cinaconnect-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cinaconnect-btn--sm {
    padding: 0.375rem 0.75rem;
    background: #3b82f6;
    color: white;
  }

  .cinaconnect-btn--md {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
  }

  .cinaconnect-btn--lg {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
  }

  .cinaconnect-btn.is-connected {
    background: #10b981;
  }

  .cinaconnect-btn.is-connecting {
    background: #6366f1;
  }

  .cinaconnect-btn-spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .cinaconnect-btn-text--sm { font-size: 0.75rem; }
  .cinaconnect-btn-text--md { font-size: 0.875rem; }
  .cinaconnect-btn-text--lg { font-size: 1rem; }
</style>
