<template>
  <button
    class="nuxt-connect-button"
    :disabled="connecting"
    @click="handleConnect"
  >
    <span v-if="connecting" class="spinner" />
    {{ label }}
  </button>
</template>

<script setup lang="ts">
/**
 * Nuxt-specific connect button component.
 *
 * Triggers the CinaCoin wallet modal and updates its label
 * based on connection state. When already connected, clicking
 * disconnects.
 *
 * @example
 * ```vue
 * <NuxtConnectButton />
 * ```
 */
import { computed, ref } from 'vue'

const { cinaConnect } = useCinaCoin()

const connecting = ref(false)

const label = computed(() => {
  if (connecting.value) return 'Connecting...'
  if (cinaConnect.isConnected) return cinaConnect.address ?? ''
  return 'Connect Wallet'
})

async function handleConnect() {
  if (cinaConnect.isConnected) {
    cinaConnect.disconnect()
    return
  }
  connecting.value = true
  try {
    await cinaConnect.connect()
  } finally {
    connecting.value = false
  }
}
</script>

<style scoped>
.nuxt-connect-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  font-size: 0.875rem;
  border-radius: var(--cinacoin-radius, 12px);
  border: none;
  cursor: pointer;
  background-color: var(--cinacoin-color-accent, #4F46E5);
  color: var(--cinacoin-color-bg, #ffffff);
  transition: background-color 0.2s;
}

.nuxt-connect-button:hover {
  background-color: var(--cinacoin-color-accent-hover, #4338CA);
}

.nuxt-connect-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
