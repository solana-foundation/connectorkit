'use client'

import { useWalletUiCluster, useWalletUi } from '@wallet-ui/react'
import { useMemo } from 'react'
import { getClusterInfo, getExplorerUrl, OFFICIAL_RPC_URLS } from '../utils/cluster'

export function useEnhancedCluster() {
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
      isOfficialRpc: Object.values(OFFICIAL_RPC_URLS).includes(cluster.urlOrMoniker as any)
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
