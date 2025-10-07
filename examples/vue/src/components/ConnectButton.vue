<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConnectorClient, useAccount, useWalletInfo } from '../composables/useConnector'
import { Copy, LogOut, ChevronDown } from 'lucide-vue-next'
import WalletModal from './WalletModal.vue'

const { disconnect } = useConnectorClient()
const { address, formatted, copy } = useAccount()
const { icon, name } = useWalletInfo()
const { connected } = useAccount()

const showModal = ref(false)
const showDropdown = ref(false)

const handleConnect = () => {
  showModal.value = true
}

const handleDisconnect = async () => {
  await disconnect()
  showDropdown.value = false
}

const handleCopy = async () => {
  await copy()
  showDropdown.value = false
}
</script>

<template>
  <div class="relative">
    <button
      v-if="!connected"
      @click="handleConnect"
      class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
    >
      Connect Wallet
    </button>

    <div v-else class="relative">
      <button
        @click="showDropdown = !showDropdown"
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
      >
        <img v-if="icon" :src="icon" :alt="name || ''" class="w-4 h-4 rounded" />
        <span>{{ formatted }}</span>
        <ChevronDown :size="16" />
      </button>

      <div
        v-if="showDropdown"
        @click="showDropdown = false"
        class="fixed inset-0 z-40"
      ></div>

      <div
        v-if="showDropdown"
        class="absolute right-0 mt-2 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50"
      >
        <button
          @click="handleCopy"
          class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        >
          <Copy :size="16" class="mr-2" />
          <span>Copy Address</span>
        </button>
        <button
          @click="handleDisconnect"
          class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        >
          <LogOut :size="16" class="mr-2" />
          <span>Disconnect</span>
        </button>
      </div>
    </div>

    <WalletModal :open="showModal" @close="showModal = false" />
  </div>
</template>
