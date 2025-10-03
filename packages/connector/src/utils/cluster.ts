/**
 * @connector-kit/connector - Cluster utilities
 * 
 * Utility functions for working with Solana clusters (networks)
 */

import type { SolanaCluster } from '@wallet-ui/core'
import { RPC_ENDPOINTS } from './network'

/**
 * Get the RPC endpoint URL for a cluster
 * Handles both string cluster names and full URLs
 * 
 * @example
 * getClusterRpcUrl(devnetCluster) // Returns: 'https://api.devnet.solana.com'
 */
export function getClusterRpcUrl(cluster: SolanaCluster): string {
  // Safely extract url property with type validation
  const rawUrl = (cluster as any)?.url
  const url = typeof rawUrl === 'string' ? rawUrl : String(cluster ?? '')
  
  // If it's already a full URL, return it
  if (url?.startsWith('http://') || url?.startsWith('https://')) {
    return url
  }
  
  // Use shared RPC endpoints with mainnet-beta alias
  const presets: Record<string, string> = {
    ...RPC_ENDPOINTS,
    'mainnet-beta': RPC_ENDPOINTS.mainnet,
  }
  
  // Check presets mapping first
  if (url && presets[url]) {
    return presets[url]
  }
  
  // If url is empty or invalid, throw an error
  if (!url || url === '[object Object]') {
    throw new Error(`Invalid cluster configuration: unable to determine RPC URL for cluster ${cluster?.id ?? 'unknown'}`)
  }
  
  return url
}

/**
 * Get the base Solana Explorer URL for a cluster
 * 
 * @example
 * getClusterExplorerUrl(mainnetCluster) // Returns: 'https://explorer.solana.com'
 */
export function getClusterExplorerUrl(
  cluster: SolanaCluster,
  path?: string
): string {
  // Defensively extract cluster segment from id (format: 'solana:cluster')
  const parts = cluster.id.split(':')
  const clusterSegment = parts.length === 2 && parts[1] ? parts[1] : 'devnet'
  
  // Strict mainnet check: exact match or post-colon segment equals 'mainnet' or 'mainnet-beta'
  const isMainnet = 
    cluster.id === 'solana:mainnet' || 
    cluster.id === 'solana:mainnet-beta' ||
    clusterSegment === 'mainnet' ||
    clusterSegment === 'mainnet-beta'
  
  const base = isMainnet
    ? 'https://explorer.solana.com'
    : `https://explorer.solana.com?cluster=${clusterSegment}`
  
  return path ? `${base}/${path}` : base
}

/**
 * Get the Solana Explorer URL for a transaction signature
 * 
 * @example
 * getTransactionUrl('5VERv8...', devnetCluster)
 * // Returns: 'https://explorer.solana.com/tx/5VERv8...?cluster=devnet'
 */
export function getTransactionUrl(
  signature: string,
  cluster: SolanaCluster
): string {
  return getClusterExplorerUrl(cluster, `tx/${signature}`)
}

/**
 * Get the Solana Explorer URL for an address
 * Works for wallet addresses, token accounts, and programs
 * 
 * @example
 * getAddressUrl('7xKXtg2C...', mainnetCluster)
 * // Returns: 'https://explorer.solana.com/address/7xKXtg2C...'
 */
export function getAddressUrl(
  address: string,
  cluster: SolanaCluster
): string {
  return getClusterExplorerUrl(cluster, `address/${address}`)
}

/**
 * Get the Solana Explorer URL for a token
 * 
 * @example
 * getTokenUrl('EPjFWdd5...', mainnetCluster)
 */
export function getTokenUrl(
  tokenAddress: string,
  cluster: SolanaCluster
): string {
  return getClusterExplorerUrl(cluster, `token/${tokenAddress}`)
}

/**
 * Get the Solana Explorer URL for a block
 */
export function getBlockUrl(
  slot: number,
  cluster: SolanaCluster
): string {
  return getClusterExplorerUrl(cluster, `block/${slot}`)
}

/**
 * Check if a cluster is production (mainnet)
 */
export function isMainnetCluster(cluster: SolanaCluster): boolean {
  return cluster.id === 'solana:mainnet' || cluster.id === 'solana:mainnet-beta'
}

/**
 * Check if a cluster is devnet
 */
export function isDevnetCluster(cluster: SolanaCluster): boolean {
  return cluster.id === 'solana:devnet'
}

/**
 * Check if a cluster is testnet
 */
export function isTestnetCluster(cluster: SolanaCluster): boolean {
  return cluster.id === 'solana:testnet'
}

/**
 * Check if a cluster is running locally
 */
export function isLocalCluster(cluster: SolanaCluster): boolean {
  // Safely extract url property with type validation
  const rawUrl = (cluster as any)?.url
  const url = typeof rawUrl === 'string' ? rawUrl : ''
  
  return (
    cluster.id === 'solana:localnet' || 
    url.includes('localhost') ||
    url.includes('127.0.0.1')
  )
}

/**
 * Get a user-friendly name for the cluster
 */
export function getClusterName(cluster: SolanaCluster): string {
  if (cluster.label) return cluster.label
  
  // Defensively extract cluster segment from id
  const parts = cluster.id.split(':')
  return parts.length === 2 && parts[1] ? parts[1] : 'Unknown'
}

/**
 * Get the cluster type (mainnet, devnet, testnet, localnet, custom)
 */
export function getClusterType(cluster: SolanaCluster): 'mainnet' | 'devnet' | 'testnet' | 'localnet' | 'custom' {
  if (isMainnetCluster(cluster)) return 'mainnet'
  if (isDevnetCluster(cluster)) return 'devnet'
  if (isTestnetCluster(cluster)) return 'testnet'
  if (isLocalCluster(cluster)) return 'localnet'
  return 'custom'
}

