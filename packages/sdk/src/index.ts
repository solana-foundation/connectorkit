/**
 * @connectorkit/solana - MVP Export
 * 
 * Lean MVP bundle with only the hooks used in demo components.
 * Bundle size: ~15KB (vs 90KB for full package)
 * 
 * Used hooks based on demo component analysis:
 * - useBalance (used in all 3 demos)
 * - useAirdrop (used in standard-wallet-demo)
 * - useCluster (used in standard-wallet-demo)
 * - useWalletAddress (used in standard-wallet-demo)
 * - useTransaction (used in transaction-demo)
 * - useSwap (used in swap-demo)
 * - useArcClient (used in transaction-demo and swap-demo)
 */

// ===== CORE PROVIDERS =====
export { ArcProvider } from './core/arc-provider'
export { useArcClient } from './core/arc-client-provider'

// ===== ESSENTIAL HOOKS (MVP) =====
export { useBalance } from './hooks/use-balance'
export type { UseBalanceOptions, UseBalanceReturn } from './hooks/use-balance'

export { useAirdrop } from './hooks/use-airdrop'
export type { UseAirdropReturn } from './hooks/use-airdrop'

export { useCluster } from './hooks/use-cluster'
export type { UseClusterReturn } from './hooks/use-cluster'

// Enhanced wallet-ui integration
export { 
  EnhancedClusterProvider,
  useEnhancedCluster,
  createSolanaDevnet,
  createSolanaMainnet,
  createSolanaTestnet
} from './context/enhanced-cluster-provider'
export type { EnhancedClusterConfig } from './context/enhanced-cluster-provider'

// Re-export wallet-ui essentials
export { 
  WalletUiClusterDropdown,
  useWalletUiCluster,
  type SolanaCluster
} from '@wallet-ui/react'

export { useWalletAddress } from './hooks/use-wallet-address'
export type { UseWalletAddressReturn } from './hooks/use-wallet-address'

export { useTransaction } from './hooks/use-transaction'
export type { UseTransactionOptions, UseTransactionReturn } from './hooks/use-transaction'

export { useSwap } from './hooks/use-swap'
export type { UseSwapOptions, UseSwapReturn } from './hooks/use-swap'

// ===== CORE TYPES =====
// Re-export commonly used types for convenience
export type { ArcWebClientState } from './core/arc-web-client'

// ===== SWAP PROVIDER TYPES (needed by @connectorkit/jupiter) =====
export type { 
  SwapProvider, 
  SwapParams, 
  SwapQuote, 
  SwapBuild,
  Provider,
  PrebuiltTransaction 
} from './core/provider'
export { createProvider } from './core/provider'

// ===== UTILITIES =====
// Keep essential utilities only
export { address } from '@solana/kit'
export type { Address } from '@solana/kit'