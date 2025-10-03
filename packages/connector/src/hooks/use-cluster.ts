/**
 * @connector-kit/connector - useCluster hook
 * 
 * React hook for managing Solana cluster (network) state
 */

'use client'

import { useMemo } from 'react'
import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core'
import { useConnector, useConnectorClient } from '../ui/connector-provider'
import { 
  getClusterRpcUrl, 
  getClusterExplorerUrl,
  isMainnetCluster,
  isDevnetCluster,
  isTestnetCluster,
  isLocalCluster,
  getClusterType 
} from '../utils/cluster'

export interface UseClusterReturn {
  /** Currently active cluster */
  cluster: SolanaCluster | null
  /** All available clusters */
  clusters: SolanaCluster[]
  /** Set the active cluster */
  setCluster: (id: SolanaClusterId) => Promise<void>
  /** Whether the current cluster is mainnet */
  isMainnet: boolean
  /** Whether the current cluster is devnet */
  isDevnet: boolean
  /** Whether the current cluster is testnet */
  isTestnet: boolean
  /** Whether the current cluster is running locally */
  isLocal: boolean
  /** RPC endpoint URL for the current cluster */
  rpcUrl: string
  /** Solana Explorer base URL for the current cluster */
  explorerUrl: string
  /** Cluster type (mainnet, devnet, testnet, localnet, custom) */
  type: 'mainnet' | 'devnet' | 'testnet' | 'localnet' | 'custom' | null
}

/**
 * Hook for managing Solana cluster (network) selection
 * 
 * @example
 * ```tsx
 * function ClusterSwitcher() {
 *   const { cluster, clusters, setCluster, isMainnet } = useCluster()
 *   
 *   return (
 *     <select 
 *       value={cluster?.id} 
 *       onChange={(e) => setCluster(e.target.value as SolanaClusterId)}
 *     >
 *       {clusters.map(c => (
 *         <option key={c.id} value={c.id}>{c.label}</option>
 *       ))}
 *     </select>
 *   )
 * }
 * ```
 */
export function useCluster(): UseClusterReturn {
  // ✅ Use useConnector (already subscribes via useSyncExternalStore)
  // No need to re-subscribe - consistent with useAccount and useWalletInfo
  const { cluster, clusters } = useConnector()
  const client = useConnectorClient()
  
  if (!client) {
    throw new Error('useCluster must be used within ConnectorProvider')
  }

  // Memoize the setCluster function only
  const setCluster = useMemo(
    () => async (id: SolanaClusterId) => {
      await client.setCluster(id)
    },
    [client]
  )

  // Optimized: Compute derived values only when cluster changes
  // No need for excessive useMemo on every boolean
  return useMemo(() => {
    const isMainnet = cluster ? isMainnetCluster(cluster) : false
    const isDevnet = cluster ? isDevnetCluster(cluster) : false
    const isTestnet = cluster ? isTestnetCluster(cluster) : false
    const isLocal = cluster ? isLocalCluster(cluster) : false
    const rpcUrl = cluster ? getClusterRpcUrl(cluster) : ''
    const explorerUrl = cluster ? getClusterExplorerUrl(cluster) : ''
    const type = cluster ? getClusterType(cluster) : null
    
    return {
      cluster,
      clusters,
      setCluster,
      isMainnet,
      isDevnet,
      isTestnet,
      isLocal,
      rpcUrl,
      explorerUrl,
      type,
    }
  }, [cluster, clusters, setCluster])
}

