<script setup lang="ts">
import { useAccount, useCluster, useWalletInfo } from '../composables/useConnector'

const { address, formatted, connected } = useAccount()
const { cluster, rpcUrl } = useCluster()
const { name, icon } = useWalletInfo()
</script>

<template>
  <div class="w-full max-w-2xl space-y-4">
    <div v-if="!connected" class="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div class="p-6 space-y-1.5">
        <h3 class="font-semibold text-2xl">Welcome to ConnectorKit</h3>
        <p class="text-sm text-muted-foreground">
          Connect your Solana wallet to get started
        </p>
      </div>
      <div class="p-6 pt-0">
        <div class="text-sm text-muted-foreground">
          <p class="mb-2">This example demonstrates:</p>
          <ul class="list-disc list-inside space-y-1">
            <li>Wallet connection with ConnectButton</li>
            <li>Network switching with ClusterSelector</li>
            <li>Built with Vue 3 + Composition API</li>
            <li>Nanostores integration for reactive state</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="p-6 space-y-1.5">
          <h3 class="font-semibold text-2xl">Wallet Information</h3>
          <p class="text-sm text-muted-foreground">Your connected wallet details</p>
        </div>
        <div class="p-6 pt-0 space-y-4">
          <div class="flex items-center gap-3">
            <img v-if="icon" :src="icon" :alt="name || ''" class="w-10 h-10 rounded-lg" />
            <div>
              <p class="text-sm font-medium">{{ name }}</p>
              <p class="text-xs text-muted-foreground">Connected Wallet</p>
            </div>
          </div>

          <div class="border-t" />

          <div class="space-y-2">
            <div>
              <p class="text-xs text-muted-foreground mb-1">Address</p>
              <p class="text-sm font-mono">{{ formatted }}</p>
              <p class="text-xs text-muted-foreground mt-1 break-all">
                {{ address }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="p-6 space-y-1.5">
          <h3 class="font-semibold text-2xl">Network Information</h3>
          <p class="text-sm text-muted-foreground">Current Solana cluster details</p>
        </div>
        <div class="p-6 pt-0 space-y-4">
          <div class="space-y-2">
            <div>
              <p class="text-xs text-muted-foreground mb-1">Cluster</p>
              <span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
                {{ cluster?.name }}
              </span>
            </div>
            <div>
              <p class="text-xs text-muted-foreground mb-1">RPC Endpoint</p>
              <p class="text-sm font-mono break-all">{{ rpcUrl }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
