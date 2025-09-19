// Cluster detection and utilities following @solana/kit patterns
export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' | 'custom'

export interface ClusterInfo {
  cluster: Cluster
  name: string
  rpcUrl: string
  explorerUrl: string
  isMainnet: boolean
  isDevnet: boolean
  isTestnet: boolean
  isLocal: boolean
}

// Official Solana RPC endpoints
export const OFFICIAL_RPC_URLS = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'devnet': 'https://api.devnet.solana.com',
  'testnet': 'https://api.testnet.solana.com',
  'localnet': 'http://localhost:8899'
} as const

// Common RPC provider patterns for cluster detection
const CLUSTER_PATTERNS = [
  // Explicit cluster keywords first
  { pattern: /devnet/i, cluster: 'devnet' as const },
  { pattern: /testnet/i, cluster: 'testnet' as const },
  { pattern: /localhost|127\.0\.0\.1|0\.0\.0\.0/i, cluster: 'localnet' as const },
  // Official endpoints
  { pattern: /api\.mainnet-beta\.solana\.com/i, cluster: 'mainnet-beta' as const },
  { pattern: /api\.devnet\.solana\.com/i, cluster: 'devnet' as const },
  { pattern: /api\.testnet\.solana\.com/i, cluster: 'testnet' as const },
  // Common provider hosts (mainnet)
  { pattern: /rpc\.ankr\.com\/solana(?!_devnet|_testnet)/i, cluster: 'mainnet-beta' as const },
  { pattern: /ssc-dao\.genesysgo\.net/i, cluster: 'mainnet-beta' as const },
  { pattern: /solana-api\.projectserum\.com/i, cluster: 'mainnet-beta' as const },
  // Generic catch-all for URLs containing "mainnet"
  { pattern: /mainnet/i, cluster: 'mainnet-beta' as const },
]

/**
 * Detect cluster from RPC URL
 * Following patterns from https://solwebkit.vercel.app/docs/basics/set-rpc
 */
export function detectClusterFromRpcUrl(rpcUrl: string): Cluster {
  if (!rpcUrl) return 'devnet' // Default fallback
  
  // Check against known patterns
  for (const { pattern, cluster } of CLUSTER_PATTERNS) {
    if (pattern.test(rpcUrl)) {
      return cluster
    }
  }
  
  // If no pattern matches, it's a custom RPC
  return 'custom'
}

/**
 * Get cluster information from RPC URL
 */
export function getClusterInfo(rpcUrl?: string): ClusterInfo {
  const cluster = detectClusterFromRpcUrl(rpcUrl || OFFICIAL_RPC_URLS.devnet)
  
  const baseInfo = {
    cluster,
    rpcUrl: rpcUrl || OFFICIAL_RPC_URLS.devnet,
    isMainnet: cluster === 'mainnet-beta',
    isDevnet: cluster === 'devnet', 
    isTestnet: cluster === 'testnet',
    isLocal: cluster === 'localnet'
  }
  
  switch (cluster) {
    case 'mainnet-beta':
      return {
        ...baseInfo,
        name: 'Mainnet Beta',
        explorerUrl: 'https://explorer.solana.com'
      }
    case 'devnet':
      return {
        ...baseInfo,
        name: 'Devnet',
        explorerUrl: 'https://explorer.solana.com?cluster=devnet'
      }
    case 'testnet':
      return {
        ...baseInfo,
        name: 'Testnet', 
        explorerUrl: 'https://explorer.solana.com?cluster=testnet'
      }
    case 'localnet':
      return {
        ...baseInfo,
        name: 'Localnet',
        explorerUrl: 'https://explorer.solana.com?cluster=custom&customUrl=' + encodeURIComponent(rpcUrl || '')
      }
    default:
      return {
        ...baseInfo,
        name: 'Custom Network',
        explorerUrl: 'https://explorer.solana.com?cluster=custom&customUrl=' + encodeURIComponent(rpcUrl || '')
      }
  }
}

/**
 * Get explorer URL for an address/transaction
 */
export function getExplorerUrl(
  addressOrSignature: string, 
  rpcUrl?: string,
  type: 'address' | 'tx' = 'address'
): string {
  const clusterInfo = getClusterInfo(rpcUrl)
  const baseUrl = clusterInfo.explorerUrl
  
  if (type === 'tx') {
    return `${baseUrl}/tx/${addressOrSignature}`
  }
  
  return `${baseUrl}/address/${addressOrSignature}`
}

/**
 * Check if RPC URL is a known official endpoint
 */
export function isOfficialRpc(rpcUrl: string): boolean {
  return Object.values(OFFICIAL_RPC_URLS).includes(rpcUrl as any)
}

/**
 * Get faucet URL for cluster (devnet/testnet only)
 */
export function getFaucetUrl(cluster: Cluster): string | null {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      return 'https://faucet.solana.com'
    default:
      return null
  }
}