<script setup lang="ts">
import { useConnectorClient, useAccount, useCluster, useWalletInfo } from './composables/useConnector'
import ConnectButton from './components/ConnectButton.vue'
import ClusterSelector from './components/ClusterSelector.vue'
import WalletInfo from './components/WalletInfo.vue'

const { connected } = useAccount()
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-background to-secondary/20">
    <header class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold">ConnectorKit</h1>
          <span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
            Vue
          </span>
        </div>
        <div class="flex items-center gap-2">
          <ClusterSelector />
          <ConnectButton />
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-12 flex flex-col items-center">
      <WalletInfo />
    </main>
  </div>
</template>

<style scoped>
</style>
