<template>
  <div class="nuxt-account-button">
    <button
      v-if="!isConnected"
      class="nuxt-account-button--connect"
      @click="handleConnect"
    >
      <span v-if="connecting" class="spinner" />
      Connect Wallet
    </button>

    <div v-else class="nuxt-account-button--connected">
      <span class="status-dot" />
      <span class="address">{{ shortAddress }}</span>
      <span v-if="balance" class="balance">{{ balance }}</span>
      <button class="disconnect" @click="handleDisconnect">
        Disconnect
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Nuxt-specific account button component.
 *
 * Shows connection state, address, balance, and a disconnect action.
 *
 * @example
 * ```vue
 * <NuxtAccountButton />
 * ```
 */
import { computed, ref } from 'vue'

const { cinaConnect } = useCinaCoin()

const connecting = ref(false)

const isConnected = computed(() => cinaConnect.isConnected)
const shortAddress = computed(() => {
  const addr = cinaConnect.address ?? ''
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
})
const balance = computed(() => cinaConnect.balance ?? '')

async function handleConnect() {
  connecting.value = true
  try {
    await cinaConnect.connect()
  } finally {
    connecting.value = false
  }
}

function handleDisconnect() {
  cinaConnect.disconnect()
}
</script>

<style scoped>
.nuxt-account-button {
  display: inline-flex;
  align-items: center;
}

.nuxt-account-button--connect {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.875rem;
  border-radius: var(--cinacoin-radius, 12px);
  border: none;
  cursor: pointer;
  background-color: var(--cinacoin-color-accent, #4F46E5);
  color: var(--cinacoin-color-bg, #ffffff);
  transition: background-color 0.2s;
}

.nuxt-account-button--connect:hover {
  background-color: var(--cinacoin-color-accent-hover, #4338CA);
}

.nuxt-account-button--connected {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: var(--cinacoin-radius, 12px);
  background-color: var(--cinacoin-color-bg-secondary, #f9fafb);
  border: 1px solid var(--cinacoin-color-border, #e5e7eb);
  color: var(--cinacoin-color-text, #111827);
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: var(--cinacoin-color-success, #10b981);
}

.address {
  font-family: monospace;
  font-weight: 500;
}

.balance {
  color: var(--cinacoin-color-text-secondary, #6b7280);
  font-size: 0.75rem;
}

.disconnect {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid var(--cinacoin-color-error, #ef4444);
  border-radius: 6px;
  background: transparent;
  color: var(--cinacoin-color-error, #ef4444);
  cursor: pointer;
  transition: background-color 0.15s;
}

.disconnect:hover {
  background-color: var(--cinacoin-color-error, #ef4444);
  color: white;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 9999px;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
