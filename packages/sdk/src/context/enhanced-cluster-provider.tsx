'use client'

import { WalletUi, createWalletUiConfig, useWalletUiCluster, useWalletUi } from '@wallet-ui/react'
import { createSolanaDevnet, createSolanaMainnet, createSolanaTestnet, createStorageCluster, type SolanaCluster } from '@wallet-ui/core'
import { getClusterInfo, getExplorerUrl, OFFICIAL_RPC_URLS } from '../utils/cluster'
import { ReactNode, useMemo } from 'react'

export interface EnhancedClusterConfig {
  // Arc-style: smart defaults
  rpcUrl?: string
  network?: 'mainnet' | 'devnet' | 'testnet'
  
  // wallet-ui style: manual clusters  
  clusters?: SolanaCluster[]
  
  // Middle-ground options
  allowSwitching?: boolean
  persistSelection?: boolean
}

export function EnhancedClusterProvider({ 
  children, 
  config = {} 
}: { 
  children: ReactNode
  config?: EnhancedClusterConfig 
}) {
  const clusters = useMemo(() => {
    // If clusters manually provided, use them
    if (config.clusters?.length) {
      return config.clusters
    }
    
    // Otherwise, create smart defaults from your detection
    const detectedNetwork = config.network || 'mainnet'
    const rpcUrl = config.rpcUrl || `https://api.${detectedNetwork}.solana.com`
    const clusterInfo = getClusterInfo(rpcUrl)
    
    // Create wallet-ui clusters with your smart detection
    const autoCluster = (() => {
      switch (clusterInfo.cluster) {
        case 'mainnet-beta':
          return createSolanaMainnet({ label: clusterInfo.name, urlOrMoniker: rpcUrl })
        case 'testnet': 
          return createSolanaTestnet({ label: clusterInfo.name, urlOrMoniker: rpcUrl })
        default:
          return createSolanaDevnet({ label: clusterInfo.name, urlOrMoniker: rpcUrl })
      }
    })()
    
    // If switching allowed, provide common clusters + detected
    if (config.allowSwitching) {
      const common = [
        createSolanaMainnet(),
        createSolanaDevnet(), 
        createSolanaTestnet()
      ]
      // Add auto-detected if it's custom
      return clusterInfo.cluster === 'custom' ? [...common, autoCluster] : common
    }
    
    // Single cluster mode
    return [autoCluster]
  }, [config])
  
  const walletUiConfig = createWalletUiConfig({
    clusters,
    // Override wallet-ui's devnet default with our mainnet preference
    ...(config.persistSelection !== false ? {
      clusterStorage: createStorageCluster({
        initial: clusters[0]?.id, // Use first cluster (mainnet) as default
        key: 'connectorkit:cluster'
      })
    } : {})
  })
  
  return <WalletUi config={walletUiConfig}>{children}</WalletUi>
}

export function useEnhancedCluster(): ReturnType<typeof useWalletUiCluster> & {
  getAddressUrl: (address: string) => string
  getTransactionUrl: (signature: string) => string
  canSwitch: boolean
  isAutoDetected: boolean
  isOfficialRpc: boolean
  cluster: SolanaCluster
} {
  const walletUiCluster = useWalletUiCluster()
  const { cluster } = useWalletUi()
  
  // Enhance wallet-ui's cluster with your utilities
  const enhanced = useMemo(() => {
    const clusterInfo = getClusterInfo(cluster.urlOrMoniker)
    
    return {
      // wallet-ui data
      ...cluster,
      clusters: walletUiCluster.clusters,
      setCluster: walletUiCluster.setCluster,
      
      // Your enhanced utilities
      ...clusterInfo,
      getAddressUrl: (address: string) => getExplorerUrl(address, cluster.urlOrMoniker, 'address'),
      getTransactionUrl: (signature: string) => getExplorerUrl(signature, cluster.urlOrMoniker, 'tx'),
      
      // Combined capabilities
      canSwitch: walletUiCluster.clusters.length > 1,
      isAutoDetected: cluster.urlOrMoniker !== getOfficialUrl(cluster.id),
      
      // Convenience flags from your existing hook
      isOfficialRpc: Object.values(OFFICIAL_RPC_URLS).includes(cluster.urlOrMoniker as any),
      
      // Ensure cluster is properly typed
      cluster: cluster
    }
  }, [cluster, walletUiCluster])
  
  return enhanced
}

function getOfficialUrl(clusterId: string): string {
  // Extract network from wallet-ui cluster ID format: 'solana:devnet' -> 'devnet'  
  const network = clusterId.replace('solana:', '')
  
  switch (network) {
    case 'mainnet':
      return OFFICIAL_RPC_URLS['mainnet-beta']
    case 'devnet':
      return OFFICIAL_RPC_URLS.devnet
    case 'testnet':
      return OFFICIAL_RPC_URLS.testnet
    case 'localnet':
      return OFFICIAL_RPC_URLS.localnet
    default:
      return OFFICIAL_RPC_URLS.devnet
  }
}

// Re-export wallet-ui essentials with our enhancements
export { createSolanaDevnet, createSolanaMainnet, createSolanaTestnet } from '@wallet-ui/core'
