<script setup lang="ts">
import { ref } from 'vue'
import { useCluster } from '../composables/useConnector'
import { ChevronDown, Check } from 'lucide-vue-next'

const { cluster, clusters, setCluster } = useCluster()
const showDropdown = ref(false)

const handleSelect = async (clusterId: string) => {
  await setCluster(clusterId)
  showDropdown.value = false
}

const getVariant = (clusterId: string) => {
  switch (clusterId) {
    case 'mainnet-beta':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'devnet':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'testnet':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}
</script>

<template>
  <div class="relative">
    <button
      @click="showDropdown = !showDropdown"
      class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3"
    >
      <span
        class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
        :class="getVariant(cluster?.id || '')"
      >
        {{ cluster?.name }}
      </span>
      <ChevronDown :size="16" />
    </button>

    <div
      v-if="showDropdown"
      @click="showDropdown = false"
      class="fixed inset-0 z-40"
    ></div>

    <div
      v-if="showDropdown"
      class="absolute right-0 mt-2 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50"
    >
      <button
        v-for="c in clusters"
        :key="c.id"
        @click="handleSelect(c.id)"
        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
      >
        <Check v-if="cluster?.id === c.id" :size="16" class="mr-2" />
        <span :class="cluster?.id !== c.id ? 'ml-6' : ''">{{ c.name }}</span>
      </button>
    </div>
  </div>
</template>
