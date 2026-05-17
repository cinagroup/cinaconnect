<template>
  <div class="playground">
    <h1>CinaConnect Nuxt Playground</h1>

    <section class="buttons">
      <NuxtConnectButton />
      <NuxtAccountButton />
    </section>

    <section v-if="isConnected" class="info">
      <h2>Account Info</h2>
      <p><strong>Address:</strong> {{ address }}</p>
      <p><strong>Balance:</strong> {{ balance }}</p>
      <p><strong>Chain:</strong> {{ chain }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
const { isConnected } = useCinaConnectAccount()
const { address, balance, chain } = useCinaConnectAccount()
</script>

<style scoped>
.playground {
  max-width: 640px;
  margin: 4rem auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--cinaconnect-color-text, #111827);
}

.buttons {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0;
}

.info {
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: var(--cinaconnect-radius, 12px);
  background-color: var(--cinaconnect-color-bg-secondary, #f9fafb);
  border: 1px solid var(--cinaconnect-color-border, #e5e7eb);
}

.info p {
  margin: 0.5rem 0;
}
</style>
