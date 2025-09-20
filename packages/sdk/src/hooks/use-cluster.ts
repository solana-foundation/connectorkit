'use client'

import { useMemo } from 'react'
import { useArcClient } from '../core/arc-client-provider'
import { 
  getClusterInfo, 
  getExplorerUrl, 
  getFaucetUrl,
  isOfficialRpc,
  OFFICIAL_RPC_URLS,
  type Cluster, 
  type ClusterInfo 
} from '../utils/cluster'
import { useEnhancedCluster } from '../context/enhanced-cluster-provider'

export interface UseClusterReturn extends ClusterInfo {
  getAddressUrl: (address: string) => string
  getTransactionUrl: (signature: string) => string
  getFaucetUrl: () => string | null
  isOfficialRpc: boolean
  canAirdrop: boolean
  supportsTransactions: boolean
  getAlternativeRpcs: () => string[]
  
  // Enhanced features (available when using wallet-ui integration)
  canSwitch?: boolean
  setCluster?: (clusterId: string) => void
  clusters?: any[]
  isAutoDetected?: boolean
}

/**
 * Hook to get current cluster information and utilities
 * Automatically detects cluster from the RPC URL in ArcProvider
 * 
 * @example
 * ```tsx
 * const { 
 *   cluster, 
 *   name,
 *   isDevnet,
 *   getAddressUrl,
 *   canAirdrop 
 * } = useCluster()
 * 
 * // Check what cluster we're on
 * console.log('Current cluster:', cluster) // 'devnet'
 * console.log('Network name:', name) // 'Devnet'
 * 
 * // Generate explorer URLs
 * const explorerUrl = getAddressUrl('11111111111111111111111111111111')
 * console.log(explorerUrl) // https://explorer.solana.com/address/...?cluster=devnet
 * 
 * // Check capabilities
 * if (canAirdrop) {
 *   console.log('Can request airdrop on this network')
 * }
 * ```
 */
export function useCluster(): UseClusterReturn {
  const { config } = useArcClient()
  
  // Try to use enhanced cluster if available (when ArcProvider has enhancedCluster config)
  let enhanced = null
  try {
    enhanced = useEnhancedCluster()
  } catch {
    // Enhanced cluster not available, fall back to original implementation
  }
  
  const clusterInfo = useMemo(() => {
    // Use enhanced cluster info if available
    if (enhanced) {
      // Re-compute cluster info from enhanced cluster's URL to get all properties
      const enhancedClusterInfo = getClusterInfo(enhanced.cluster.urlOrMoniker)
      return {
        ...enhancedClusterInfo,
        name: enhanced.cluster.label, // Use wallet-ui label
        rpcUrl: enhanced.cluster.urlOrMoniker
      }
    }
    
    // Fall back to original implementation
    return getClusterInfo(config.rpcUrl)
  }, [config.rpcUrl, enhanced])
  
  const helpers = useMemo(() => {
    const rpcUrl = enhanced?.cluster.urlOrMoniker || config.rpcUrl || OFFICIAL_RPC_URLS.devnet
    
    return {
      getAddressUrl: (address: string) => {
        // Use enhanced version if available, otherwise original
        return enhanced?.getAddressUrl(address) || getExplorerUrl(address, rpcUrl, 'address')
      },
      getTransactionUrl: (signature: string) => {
        // Use enhanced version if available, otherwise original  
        return enhanced?.getTransactionUrl(signature) || getExplorerUrl(signature, rpcUrl, 'tx')
      },
      getFaucetUrl: () => getFaucetUrl(clusterInfo.cluster),
      isOfficialRpc: enhanced?.isOfficialRpc || isOfficialRpc(rpcUrl),
      canAirdrop: clusterInfo.isDevnet || clusterInfo.isTestnet || clusterInfo.isLocal,
      supportsTransactions: true,
      
      getAlternativeRpcs: (): string[] => {
        const { cluster } = clusterInfo
        
        switch (cluster) {
          case 'mainnet-beta':
          case 'mainnet':
            return [
              'https://api.mainnet-beta.solana.com',
              'https://rpc.ankr.com/solana',
              'https://solana-mainnet.g.alchemy.com/v2/demo'
            ]
          case 'devnet':
            return [
              'https://api.devnet.solana.com', 
              'https://rpc.ankr.com/solana_devnet',
              'https://solana-devnet.g.alchemy.com/v2/demo'
            ]
          case 'testnet':
            return [
              'https://api.testnet.solana.com',
              'https://rpc.ankr.com/solana_testnet'
            ]
          case 'localnet':
            return [
              'http://localhost:8899',
              'http://127.0.0.1:8899'
            ]
          default:
            return [rpcUrl]
        }
      },
      
      // NEW: Enhanced features when available
      ...(enhanced ? {
        canSwitch: enhanced.canSwitch,
        setCluster: (clusterId: string) => {
          // Wrapper to handle different ID formats
          const walletUiId = clusterId.startsWith('solana:') ? clusterId : `solana:${clusterId}`
          enhanced.setCluster(walletUiId as any)
        },
        clusters: enhanced.clusters,
        isAutoDetected: enhanced.isAutoDetected
      } : {})
    }
  }, [config.rpcUrl, clusterInfo, enhanced])
  
  return {
    ...clusterInfo,
    ...helpers
  }
}

export function useCanAirdrop(): boolean {
  const { canAirdrop } = useCluster()
  return canAirdrop
}

export function useExplorerUrls() {
  const { getAddressUrl, getTransactionUrl } = useCluster()
  
  return {
    getAddressUrl,
    getTransactionUrl,
    address: getAddressUrl,
    transaction: getTransactionUrl,
    tx: getTransactionUrl
  }
}