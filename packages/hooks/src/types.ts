/**
 * @arc/solana - Core Types
 * 
 * Essential types used across the SDK.
 * More specific types are exported from their respective modules.
 */

import React from 'react'

// ===== LEVEL 1 TYPES =====

export interface BalanceOptions {
  address: string
}

export interface TransferOptions {
  from: string | Uint8Array
  to: string
  amount: string
}

export interface AirdropOptions {
  address: string
  amount?: string
}

export interface TransactionResult {
  signature: string
  explorerUrl: string
  amount: number
}

// ===== LEVEL 2 TYPES (React) =====

export interface ArcProviderProps {
  children: React.ReactNode
  network?: 'mainnet' | 'devnet' | 'testnet'
  rpcUrl?: string
}

export interface UseBalanceResult {
  data: number | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export interface UseTransferResult {
  mutate: (options: TransferOptions) => void
  mutateAsync: (options: TransferOptions) => Promise<TransactionResult>
  isPending: boolean
  error: Error | null
  data: TransactionResult | null
  reset: () => void
}

// ===== NETWORK TYPES =====

export type Network = 'mainnet' | 'devnet' | 'testnet'

export interface NetworkConfig {
  name: Network
  rpcUrl: string
  explorerUrl: string
}

// ===== PROVIDER CONFIG TYPES =====

export interface ArcProviderConfig {
  network?: Network
  rpcUrl?: string
  providers?: any[] // Provider system for extensibility
  queryClient?: any // React Query client
}

// ===== TRANSACTION TYPES =====

export interface UseTransactionOptions {
  confirmationStrategy?: 'processed' | 'confirmed' | 'finalized'
  skipPreflight?: boolean
  computeUnitLimit?: number
  computeUnitPrice?: number
}

// ===== SWAP TYPES =====

export interface UseSwapOptions {
  providers?: string[]
  strategy?: 'best-price' | 'fastest' | 'lowest-fees'
  maxSlippage?: number
}

export interface SwapState {
  isLoading: boolean
  error: Error | null
  quotes: any[]
  selectedQuote: any | null
}