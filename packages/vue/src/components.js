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
        variant: { type: String, default: 'primary' },
        size: { type: String, default: 'md' },
        showBalance: { type: Boolean, default: false },
        showAvatar: { type: Boolean, default: false },
        showNetwork: { type: Boolean, default: false },
    },
    emits: ['click', 'disconnect'],
    setup(props, { emit }) {
        const elRef = ref(null);
        const { account, status, connect, disconnect } = useCinacoin();
        const stateMap = {
            disconnected: 'disconnected',
            connecting: 'connecting',
            connected: 'connected',
            error: 'error',
        };
        onMounted(() => {
            const el = elRef.value;
            if (!el)
                return;
            el.addEventListener('ocx-click', () => {
                if (status.value === 'disconnected' || status.value === 'error') {
                    connect('metamask').catch(() => { });
                }
                emit('click');
            });
            el.addEventListener('ocx-disconnect', () => {
                disconnect().catch(() => { });
                emit('disconnect');
            });
        });
        onBeforeUnmount(() => {
            const el = elRef.value;
            if (!el)
                return;
            el.removeEventListener('ocx-click', () => { });
            el.removeEventListener('ocx-disconnect', () => { });
        });
        return () => h('ocx-connect-button', {
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
        recommendedWalletIds: { type: Array, default: () => [] },
    },
    emits: ['close', 'wallet-select'],
    setup(props, { emit }) {
        const elRef = ref(null);
        const { connect } = useCinacoin();
        onMounted(() => {
            const el = elRef.value;
            if (!el)
                return;
            el.addEventListener('ocx-close', () => emit('close'));
            el.addEventListener('ocx-wallet-select', (e) => {
                const detail = e.detail;
                if (detail?.id) {
                    connect(detail.id).catch(() => { });
                }
                emit('wallet-select', detail);
            });
        });
        onBeforeUnmount(() => {
            const el = elRef.value;
            if (!el)
                return;
            el.removeEventListener('ocx-close', () => { });
            el.removeEventListener('ocx-wallet-select', () => { });
        });
        return () => h('ocx-connect-modal', {
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
        onChainChange: { type: Function },
    },
    emits: ['chain-change'],
    setup(props, { emit }) {
        const elRef = ref(null);
        const { config, account, switchChain } = useCinacoin();
        watch([() => config.chains, () => account.value.chainId], () => {
            const el = elRef.value;
            if (el) {
                el.chains = config.chains;
                el.activeChainId = account.value.chainId ?? 1;
            }
        }, { immediate: true });
        onMounted(() => {
            const el = elRef.value;
            if (!el)
                return;
            el.addEventListener('ocx-chain-change', (e) => {
                const detail = e.detail;
                if (detail?.chainId) {
                    switchChain(detail.chainId).catch(() => { });
                    emit('chain-change', detail.chainId);
                    props.onChainChange?.(detail.chainId);
                }
            });
        });
        return () => h('ocx-chain-switcher', {
            ref: elRef,
            'active-chain-id': account.value.chainId ?? 1,
        });
    },
});
//# sourceMappingURL=components.js.map