import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { ConnectorClient, getDefaultConfig } from '@connector-kit/connector/headless'

// Create a singleton client instance
let clientInstance: ConnectorClient | null = null

const config = getDefaultConfig({
  appName: 'ConnectorKit Vue Example',
  network: 'devnet',
})

function getClient() {
  if (!clientInstance) {
    clientInstance = new ConnectorClient(config)
  }
  return clientInstance
}

// Create a reactive state hook
function useClientState() {
  const client = getClient()
  const state = shallowRef(client.getSnapshot())

  onMounted(() => {
    const unsubscribe = client.subscribe(() => {
      state.value = client.getSnapshot()
    })

    onUnmounted(() => {
      unsubscribe()
    })
  })

  return state
}

export function useConnectorClient() {
  const client = getClient()
  const state = useClientState()

  const wallets = computed(() => state.value.wallets)
  const selectedWallet = computed(() => state.value.selectedWallet)
  const accounts = computed(() => state.value.accounts)
  const connected = computed(() => state.value.connected)
  const connecting = computed(() => state.value.connecting)

  const select = async (walletName: string) => {
    await client.select(walletName)
  }

  const disconnect = async () => {
    await client.disconnect()
  }

  return {
    wallets,
    selectedWallet,
    accounts,
    connected,
    connecting,
    select,
    disconnect,
  }
}

export function useAccount() {
  const state = useClientState()

  const address = computed(() => state.value.selectedAccount || null)
  const formatted = computed(() => {
    if (!address.value) return ''
    return `${address.value.slice(0, 4)}...${address.value.slice(-4)}`
  })
  const connected = computed(() => state.value.connected)
  const copied = ref(false)

  const copy = async () => {
    if (!address.value) return false
    try {
      await navigator.clipboard.writeText(address.value)
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
      return true
    } catch {
      return false
    }
  }

  return {
    address,
    formatted,
    connected,
    copied,
    copy,
  }
}

export function useCluster() {
  const client = getClient()
  const state = useClientState()

  const cluster = computed(() => state.value.cluster)
  const clusters = computed(() => state.value.clusters)
  const rpcUrl = computed(() => state.value.cluster?.endpoint || '')

  const setCluster = async (clusterId: string) => {
    await client.setCluster(clusterId as any)
  }

  const isMainnet = computed(() => cluster.value?.id === 'mainnet-beta')
  const isDevnet = computed(() => cluster.value?.id === 'devnet')

  return {
    cluster,
    clusters,
    rpcUrl,
    setCluster,
    isMainnet,
    isDevnet,
  }
}

export function useWalletInfo() {
  const state = useClientState()

  const name = computed(() => state.value.selectedWallet?.name || null)
  const icon = computed(() => state.value.selectedWallet?.icon)
  const wallet = computed(() => state.value.selectedWallet)
  const connecting = computed(() => state.value.connecting)

  return {
    name,
    icon,
    wallet,
    connecting,
  }
}
