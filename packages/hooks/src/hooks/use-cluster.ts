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

export interface UseClusterReturn extends ClusterInfo {
  getAddressUrl: (address: string) => string
  getTransactionUrl: (signature: string) => string
  getFaucetUrl: () => string | null
  isOfficialRpc: boolean
  canAirdrop: boolean
  supportsTransactions: boolean
  getAlternativeRpcs: () => string[]
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
  
  const clusterInfo = useMemo(() => {
    return getClusterInfo(config.rpcUrl)
  }, [config.rpcUrl])
  
  const helpers = useMemo(() => {
    const rpcUrl = config.rpcUrl || OFFICIAL_RPC_URLS.devnet
    
    return {
      getAddressUrl: (address: string) => getExplorerUrl(address, rpcUrl, 'address'),
      getTransactionUrl: (signature: string) => getExplorerUrl(signature, rpcUrl, 'tx'),
      getFaucetUrl: () => getFaucetUrl(clusterInfo.cluster),
      isOfficialRpc: isOfficialRpc(rpcUrl),
      canAirdrop: clusterInfo.isDevnet || clusterInfo.isTestnet || clusterInfo.isLocal,
      supportsTransactions: true,
      
      getAlternativeRpcs: (): string[] => {
        const { cluster } = clusterInfo
        
        switch (cluster) {
          case 'mainnet-beta':
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
      }
    }
  }, [config.rpcUrl, clusterInfo])
  
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