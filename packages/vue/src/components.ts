/**
 * Vue component wrappers for Cinacoin Web Components.
 *
 * These are thin wrappers that forward props and events to the underlying
 * custom elements registered by @cinacoin/core-ui.
 */

import { defineComponent, h, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useCinacoin } from './composables.js';

/**
 * ConnectButton — Vue wrapper for the OCX ConnectButton Web Component.
 */
export const OcxConnectButton = defineComponent({
  name: 'OcxConnectButton',
  props: {
    label: { type: String, default: 'Connect Wallet' },
    variant: { type: String as () => 'primary' | 'secondary' | 'ghost', default: 'primary' },
    size: { type: String as () => 'sm' | 'md' | 'lg', default: 'md' },
    showBalance: { type: Boolean, default: false },
    showAvatar: { type: Boolean, default: false },
    showNetwork: { type: Boolean, default: false },
  },
  emits: ['click', 'disconnect'],
  setup(props, { emit }) {
    const elRef = ref<HTMLElement | null>(null);
    const { account, status, connect, disconnect } = useCinacoin();

    const stateMap: Record<string, string> = {
      disconnected: 'disconnected',
      connecting: 'connecting',
      connected: 'connected',
      error: 'error',
    };

    // Store event handler references so addEventListener and removeEventListener
    // use the same function object — fixes memory leak from anonymous handlers.
    const onClickHandler = (): void => {
      if (status.value === 'disconnected' || status.value === 'error') {
        connect('metamask').catch(() => {});
      }
      emit('click');
    };
    const onDisconnectHandler = (): void => {
      disconnect().catch(() => {});
      emit('disconnect');
    };

    onMounted(() => {
      const el = elRef.value;
      if (!el) return;

      el.addEventListener('ocx-click', onClickHandler);
      el.addEventListener('ocx-disconnect', onDisconnectHandler);
    });

    onBeforeUnmount(() => {
      const el = elRef.value;
      if (!el) return;
      el.removeEventListener('ocx-click', onClickHandler);
      el.removeEventListener('ocx-disconnect', onDisconnectHandler);
    });

    return () =>
      h('ocx-connect-button', {
        ref: elRef,
        variant: props.variant,
        size: props.size,
        label: props.label,
        state: stateMap[status.value] ?? 'disconnected',
        address: account.value.address ?? '',
        balance: props.showBalance ? account.value.balance : '',
        'chain-symbol': props.showBalance ? account.value.chainSymbol : '',
        'show-balance': props.showBalance,
        'show-avatar': props.showAvatar,
        'show-network': props.showNetwork,
      });
  },
});

/**
 * ConnectModal — Vue wrapper for the OCX ConnectModal Web Component.
 */
export const OcxConnectModal = defineComponent({
  name: 'OcxConnectModal',
  props: {
    isOpen: { type: Boolean, default: false },
    defaultView: { type: String, default: 'wallets' },
    recommendedWalletIds: { type: Array as () => string[], default: () => [] },
  },
  emits: ['close', 'wallet-select'],
  setup(props, { emit }) {
    const elRef = ref<HTMLElement | null>(null);
    const { connect } = useCinacoin();

    // Store event handler references to prevent listener leaks.
    const onCloseHandler = (): void => {
      emit('close');
    };
    const onWalletSelectHandler = (e: Event): void => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        connect(detail.id).catch(() => {});
      }
      emit('wallet-select', detail);
    };

    onMounted(() => {
      const el = elRef.value;
      if (!el) return;

      el.addEventListener('ocx-close', onCloseHandler);
      el.addEventListener('ocx-wallet-select', onWalletSelectHandler);
    });

    onBeforeUnmount(() => {
      const el = elRef.value;
      if (!el) return;
      el.removeEventListener('ocx-close', onCloseHandler);
      el.removeEventListener('ocx-wallet-select', onWalletSelectHandler);
    });

    return () =>
      h('ocx-connect-modal', {
        ref: elRef,
        'is-open': props.isOpen,
        'default-view': props.defaultView,
      });
  },
});

/**
 * ChainSwitcher — Vue wrapper for the OCX ChainSwitcher Web Component.
 */
export const OcxChainSwitcher = defineComponent({
  name: 'OcxChainSwitcher',
  props: {
    onChainChange: { type: Function as unknown as () => (chainId: number) => void },
  },
  emits: ['chain-change'],
  setup(props, { emit }) {
    const elRef = ref<HTMLElement | null>(null);
    const { config, account, switchChain } = useCinacoin();

    watch(
      [() => config.chains, () => account.value.chainId],
      () => {
        const el = elRef.value as HTMLElement & { chains?: unknown; activeChainId?: number } | null;
        if (el) {
          el.chains = config.chains;
          el.activeChainId = account.value.chainId ?? 1;
        }
      },
      { immediate: true }
    );

    // Store event handler reference to prevent listener leak.
    const onChainChangeHandler = (e: Event): void => {
      const detail = (e as CustomEvent).detail;
      if (detail?.chainId) {
        switchChain(detail.chainId).catch(() => {});
        emit('chain-change', detail.chainId);
        props.onChainChange?.(detail.chainId);
      }
    };

    onMounted(() => {
      const el = elRef.value;
      if (!el) return;

      el.addEventListener('ocx-chain-change', onChainChangeHandler);
    });

    onBeforeUnmount(() => {
      const el = elRef.value;
      if (!el) return;
      el.removeEventListener('ocx-chain-change', onChainChangeHandler);
    });

    return () =>
      h('ocx-chain-switcher', {
        ref: elRef,
        'active-chain-id': account.value.chainId ?? 1,
      });
  },
});
