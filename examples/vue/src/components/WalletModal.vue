<script setup lang="ts">
import { useConnectorClient } from '../composables/useConnector'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { wallets, select } = useConnectorClient()

const handleConnect = async (walletName: string) => {
  await select(walletName)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/80"
      @click="emit('close')"
    >
      <div
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg rounded-lg"
        @click.stop
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Connect Wallet</h2>
          <button
            @click="emit('close')"
            class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X :size="20" />
          </button>
        </div>

        <div class="space-y-2">
          <button
            v-for="wallet in wallets"
            :key="wallet.name"
            @click="handleConnect(wallet.name)"
            class="w-full flex items-center gap-3 rounded-md border p-4 hover:bg-accent transition-colors"
          >
            <img
              v-if="wallet.icon"
              :src="wallet.icon"
              :alt="wallet.name"
              class="w-8 h-8 rounded"
            />
            <span class="font-medium">{{ wallet.name }}</span>
          </button>

          <p v-if="wallets.length === 0" class="text-center text-sm text-muted-foreground py-8">
            No wallets detected. Please install a Solana wallet extension.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
