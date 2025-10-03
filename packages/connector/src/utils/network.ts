/**
 * @connector-kit/connector - Network utilities
 * 
 * Utilities for translating between different Solana network naming conventions
 * Ensures compatibility with Armadura SDK and other Solana libraries
 */

import type { SolanaClusterId } from '@wallet-ui/core'

/**
 * Normalized network names (Armadura convention)
 * Used by most Solana developers
 */
export type SolanaNetwork = 'mainnet' | 'devnet' | 'testnet' | 'localnet'

/**
 * RPC network names (Official Solana RPC convention)
 * Used by RPC endpoints
 */
export type SolanaNetworkRpc = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'

/**
 * Default RPC endpoints for each Solana network
 * Single source of truth for RPC URLs across the package
 */
export const RPC_ENDPOINTS: Record<SolanaNetwork, string> = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://localhost:8899',
} as const

/**
 * Normalize network name to standard format
 * Accepts both conventions and returns the normalized version
 * 
 * @example
 * normalizeNetwork('mainnet-beta') // Returns: 'mainnet'
 * normalizeNetwork('mainnet') // Returns: 'mainnet'
 */
export function normalizeNetwork(network: SolanaNetwork | SolanaNetworkRpc | string): SolanaNetwork {
  const normalized = network.toLowerCase().replace('-beta', '')
  
  switch (normalized) {
    case 'mainnet':
      return 'mainnet'
    case 'devnet':
      return 'devnet'
    case 'testnet':
      return 'testnet'
    case 'localnet':
      return 'localnet'
    default:
      // Default to mainnet for unknown networks
      return 'mainnet'
  }
}

/**
 * Convert normalized network name to RPC format
 * 
 * @example
 * toRpcNetwork('mainnet') // Returns: 'mainnet-beta'
 * toRpcNetwork('devnet') // Returns: 'devnet'
 */
export function toRpcNetwork(network: SolanaNetwork): SolanaNetworkRpc {
  switch (network) {
    case 'mainnet':
      return 'mainnet-beta'
    case 'devnet':
      return 'devnet'
    case 'testnet':
      return 'testnet'
    case 'localnet':
      return 'localnet'
    default:
      return 'mainnet-beta'
  }
}

/**
 * Convert network name to wallet-ui cluster ID format
 * 
 * @example
 * toClusterId('mainnet') // Returns: 'solana:mainnet'
 * toClusterId('mainnet-beta') // Returns: 'solana:mainnet'
 */
export function toClusterId(network: SolanaNetwork | SolanaNetworkRpc | string): SolanaClusterId {
  const normalized = normalizeNetwork(network)
  return `solana:${normalized}` as SolanaClusterId
}

/**
 * Get the default RPC URL for a network
 * 
 * @example
 * getDefaultRpcUrl('mainnet') // Returns: 'https://api.mainnet-beta.solana.com'
 * getDefaultRpcUrl('devnet') // Returns: 'https://api.devnet.solana.com'
 */
export function getDefaultRpcUrl(network: SolanaNetwork | SolanaNetworkRpc | string): string {
  const normalized = normalizeNetwork(network)
  return RPC_ENDPOINTS[normalized] ?? RPC_ENDPOINTS.mainnet
}

/**
 * Check if a network is mainnet
 * 
 * @example
 * isMainnet('mainnet') // Returns: true
 * isMainnet('mainnet-beta') // Returns: true
 * isMainnet('devnet') // Returns: false
 */
export function isMainnet(network: SolanaNetwork | SolanaNetworkRpc | string): boolean {
  const normalized = normalizeNetwork(network)
  return normalized === 'mainnet'
}

/**
 * Check if a network is devnet
 */
export function isDevnet(network: SolanaNetwork | SolanaNetworkRpc | string): boolean {
  const normalized = normalizeNetwork(network)
  return normalized === 'devnet'
}

/**
 * Check if a network is testnet
 */
export function isTestnet(network: SolanaNetwork | SolanaNetworkRpc | string): boolean {
  const normalized = normalizeNetwork(network)
  return normalized === 'testnet'
}

/**
 * Check if a network is localnet
 */
export function isLocalnet(network: SolanaNetwork | SolanaNetworkRpc | string): boolean {
  const normalized = normalizeNetwork(network)
  return normalized === 'localnet'
}

/**
 * Get a user-friendly display name for a network
 * 
 * @example
 * getNetworkDisplayName('mainnet-beta') // Returns: 'Mainnet'
 * getNetworkDisplayName('devnet') // Returns: 'Devnet'
 */
export function getNetworkDisplayName(network: SolanaNetwork | SolanaNetworkRpc | string): string {
  const normalized = normalizeNetwork(network)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

