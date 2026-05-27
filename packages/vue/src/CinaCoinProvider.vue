<template>
  <div class="ocx-root" :class="`ocx-theme-${themeMode}`" :style="themeVarsStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * CinaCoinProvider — Vue provider component.
 * Wraps the app and provides CinaCoin state via Vue's provide/inject.
 *
 * Uses @cinacoin/core-sdk ConnectorManager for real wallet connections.
 */
import {
  computed,
  provide,
  ref,
  onBeforeUnmount,
  type CSSProperties,
} from 'vue';
import { ONCHAINUX_KEY } from './types';
import type { CinaCoinConfig, AccountState, Connector } from './types';
import { ConnectorManager } from './connectorManager';

export interface CinaCoinProviderProps {
  config: CinaCoinConfig;
}

const props = defineProps<CinaCoinProviderProps>();

const themeMode = computed(() => props.config.theme?.mode ?? 'dark');

const themeVarsStyle = computed<CSSProperties>(() => {
  if (!props.config.theme?.variables) return {};
  const vars: Record<string, string> = {};
  for (const [key, val] of Object.entries(props.config.theme.variables)) {
    vars[key] = val;
  }
  return vars;
});

const status = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
const account = ref<AccountState>({
  address: null,
  balance: '0.00',
  chainId: props.config.chains?.[0]?.id ?? 1,
  chainSymbol: props.config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
});
const isSwitchingChain = ref(false);

// Initialize the connector manager with real SDK connectors
const connectorManager = new ConnectorManager(props.config);

// Build the connector metadata list for UI
const connectors = ref<Connector[]>(
  buildConnectorMetadata(connectorManager),
);

/**
 * Build connector metadata from the manager's registered connectors
 * plus any configured ones.
 */
function buildConnectorMetadata(manager: ConnectorManager): Connector[] {
  const metaList: Connector[] = [];
  const seen = new Set<string>();

  // Add from manager's known connectors
  for (const [id, conn] of manager.getAllConnectors()) {
    if (seen.has(id)) continue;
    seen.add(id);
    metaList.push({
      id,
      name: conn.name,
      type: conn.type as Connector['type'],
      installed: conn.installed,
    });
  }

  // Add any additional configured connectors not yet in the list
  const defaultConnectors: Connector[] = [
    { id: 'metamask', name: 'MetaMask', type: 'injected' },
    { id: 'walletconnect', name: 'WalletConnect', type: 'walletconnect' },
    { id: 'coinbase', name: 'Coinbase Wallet', type: 'coinbase' },
    { id: 'rabby', name: 'Rabby', type: 'injected' },
    { id: 'email', name: 'Email', type: 'email' },
  ];

  for (const dc of defaultConnectors) {
    if (!seen.has(dc.id)) {
      seen.add(dc.id);
      metaList.push(dc);
    }
  }

  return metaList;
}

// Event handler references — used for proper listener lifecycle management.
// Stored as named properties so on() and off() receive the same function reference.
function _handleConnected(_result: unknown): void {
  _refreshAccount();
  status.value = 'connected';
}

function _handleDisconnected(): void {
  account.value = {
    address: null,
    balance: '0.00',
    chainId: props.config.chains?.[0]?.id ?? 1,
    chainSymbol: props.config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
  };
  status.value = 'disconnected';
}

const _handlers = {
  onConnected: _handleConnected,
  onDisconnected: _handleDisconnected,
};

// Register event listeners on the connector manager
connectorManager.on('connected', _handlers.onConnected);
connectorManager.on('disconnected', _handlers.onDisconnected);

/**
 * Refresh account state from the active connector.
 */
async function _refreshAccount(): Promise<void> {
  try {
    const accounts = await connectorManager.getAccounts();
    const chainId = await connectorManager.getChainId();

    if (accounts.length > 0) {
      const chain = props.config.chains?.find((c) => c.id === chainId);
      account.value = {
        address: accounts[0],
        balance: '0.00', // balance fetched separately if needed
        chainId,
        chainSymbol: chain?.nativeCurrency.symbol ?? 'ETH',
      };
    }
  } catch (err) {
    console.error('[CinaCoin] Failed to refresh account:', err);
  }
}

/**
 * Connect to a wallet using the specified connector.
 */
async function connect(connectorId: string): Promise<void> {
  status.value = 'connecting';
  try {
    const result = await connectorManager.connect(connectorId);
    account.value = {
      address: result.accounts[0] ?? null,
      balance: '0.00',
      chainId: result.chainId,
      chainSymbol:
        props.config.chains?.find((c) => c.id === result.chainId)
          ?.nativeCurrency.symbol ?? 'ETH',
    };
    status.value = 'connected';

    // Update installed status of connectors after connection
    connectors.value = buildConnectorMetadata(connectorManager);
  } catch (err) {
    console.error('[CinaCoin] Connection failed:', err);
    status.value = 'error';
    throw err;
  }
}

/**
 * Disconnect from the current wallet.
 */
async function disconnect(): Promise<void> {
  try {
    await connectorManager.disconnect();
    account.value = {
      address: null,
      balance: '0.00',
      chainId: props.config.chains?.[0]?.id ?? 1,
      chainSymbol: props.config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
    };
    status.value = 'disconnected';
    connectors.value = buildConnectorMetadata(connectorManager);
  } catch (err) {
    console.error('[CinaCoin] Disconnect failed:', err);
    throw err;
  }
}

/**
 * Switch to a different chain.
 */
async function switchChain(chainId: number): Promise<void> {
  isSwitchingChain.value = true;
  try {
    await connectorManager.switchChain(chainId);
    const chain = props.config.chains?.find((c) => c.id === chainId);
    if (chain) {
      account.value = {
        ...account.value,
        chainId,
        chainSymbol: chain.nativeCurrency.symbol,
      };
    }
  } catch (err) {
    console.error('[CinaCoin] Chain switch failed:', err);
    throw err;
  } finally {
    isSwitchingChain.value = false;
  }
}

// Cleanup on unmount
onBeforeUnmount(() => {
  connectorManager.off('connected', _handlers.onConnected);
  connectorManager.off('disconnected', _handlers.onDisconnected);
  connectorManager.destroy();
});

const context = {
  config: props.config,
  connectors,
  account,
  status,
  connect,
  disconnect,
  switchChain,
  isSwitchingChain,
};

provide(ONCHAINUX_KEY, context);
</script>
