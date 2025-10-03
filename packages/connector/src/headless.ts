/**
 * @connector-kit/connector/headless
 * 
 * Framework-agnostic core - works with Vue, Angular, Vanilla JS
 * Zero React dependencies for maximum compatibility
 */

import { WalletErrorType, type WalletError } from './components/ErrorBoundary'
import type { MobileWalletAdapterConfig } from './ui/connector-provider'

// ============================================================================
// Core Client & Registry
// ============================================================================
export { ConnectorClient } from './lib/connector-client'
export { getWalletsRegistry } from './lib/wallet-standard-shim'

// ============================================================================
// Configuration
// ============================================================================
export { getDefaultConfig, getDefaultMobileConfig, createConfig, isUnifiedConfig } from './config'
export type { DefaultConfigOptions, ExtendedConnectorConfig, UnifiedConfigOptions, UnifiedConfig } from './config'

// ============================================================================
// Essential Types
// ============================================================================
export type { 
  ConnectorConfig,
  ConnectorState,
  WalletInfo,
  AccountInfo
} from './lib/connector-client'

export type {
  Wallet,
  WalletAccount,
  WalletStandardWallet,
  WalletStandardAccount
} from './lib/wallet-standard-shim'

export type { 
  ConnectorOptions, 
  MobileConnectorOptions
} from './types'

export type { MobileWalletAdapterConfig } from './ui/connector-provider'

// ============================================================================
// Storage System
// ============================================================================
export {
  EnhancedStorage,
  EnhancedStorageAdapter,
  createEnhancedStorageAccount,
  createEnhancedStorageCluster,
  createEnhancedStorageWallet
} from './lib/enhanced-storage'

export type { 
  StorageAdapter,
  StorageOptions,
  EnhancedStorageAccountOptions,
  EnhancedStorageClusterOptions,
  EnhancedStorageWalletOptions
} from './lib/enhanced-storage'

// ============================================================================
// Error Handling
// ============================================================================
export { WalletErrorType } from './components/ErrorBoundary'
export type { WalletError } from './components/ErrorBoundary'

/**
 * Classify wallet errors for better error handling
 */
export function classifyWalletError(error: Error): WalletError {
  const walletError = error as WalletError
  
  // Already classified
  if (walletError.type) return walletError

  // Classify based on message patterns
  let type = WalletErrorType.UNKNOWN_ERROR
  let recoverable = false

  if (error.message.includes('User rejected') || error.message.includes('User denied')) {
    type = WalletErrorType.USER_REJECTED
    recoverable = true
  } else if (error.message.includes('Insufficient funds')) {
    type = WalletErrorType.INSUFFICIENT_FUNDS  
    recoverable = false
  } else if (error.message.includes('Network') || error.message.includes('fetch')) {
    type = WalletErrorType.NETWORK_ERROR
    recoverable = true
  } else if (error.message.includes('Wallet not found') || error.message.includes('not installed')) {
    type = WalletErrorType.WALLET_NOT_FOUND
    recoverable = true
  } else if (error.message.includes('Failed to connect') || error.message.includes('Connection')) {
    type = WalletErrorType.CONNECTION_FAILED
    recoverable = true
  }

  return {
    ...error,
    name: error.name,
    message: error.message,
    type,
    recoverable,
    context: { originalMessage: error.message }
  }
}

// ============================================================================
// Wallet-UI Integration
// ============================================================================
export type {
  SolanaCluster,
  SolanaClusterId,
} from '@wallet-ui/core'

export {
  createSolanaMainnet,
  createSolanaDevnet,
  createSolanaTestnet,
  createSolanaLocalnet,
} from '@wallet-ui/core'

// ============================================================================
// Utility Functions
// ============================================================================
export * from './utils/clipboard'
export * from './utils/formatting'
export * from './utils/cluster'
export * from './utils/network'

// ============================================================================
// Mobile Wallet Adapter Integration
// ============================================================================

/**
 * Register Mobile Wallet Adapter programmatically
 * Useful for headless implementations that need mobile support
 */
export async function registerMobileWalletAdapter(config: MobileWalletAdapterConfig) {
  const {
    registerMwa,
    createDefaultAuthorizationCache,
    createDefaultChainSelector,
    createDefaultWalletNotFoundHandler,
    MWA_SOLANA_CHAINS,
  } = (await import('@solana-mobile/wallet-standard-mobile')) as any
  
  registerMwa({
    appIdentity: config.appIdentity,
    authorizationCache: config.authorizationCache ?? createDefaultAuthorizationCache(),
    chains: (config.chains ?? MWA_SOLANA_CHAINS) as any,
    chainSelector: config.chainSelector ?? createDefaultChainSelector(),
    remoteHostAuthority: config.remoteHostAuthority,
    onWalletNotFound: config.onWalletNotFound ?? createDefaultWalletNotFoundHandler(),
  })
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Create memory-based storage (useful for SSR or testing)
 */
export const createMemoryStorage = () => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key)
  }
}

/**
 * Create localStorage wrapper with SSR fallback
 */
export const createLocalStorage = () => {
  if (typeof window === 'undefined') return createMemoryStorage()
  return {
    getItem: (key: string) => {
      try { return localStorage.getItem(key) } catch { return null }
    },
    setItem: (key: string, value: string) => {
      try { localStorage.setItem(key, value) } catch { /* ignore */ }
    },
    removeItem: (key: string) => {
      try { localStorage.removeItem(key) } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Wallet Detection Utilities
// ============================================================================

/**
 * Check if a wallet is installed by detecting window object
 */
export const isWalletInstalled = (walletName: string): boolean => {
  if (typeof window === 'undefined') return false
  
  const lowerName = walletName.toLowerCase()
  return Boolean(
    (window as any)[lowerName] || 
    (window as any).solana || 
    (window as any)[`${lowerName}Wallet`] ||
    typeof (window as any).navigator?.wallet !== 'undefined'
  )
}

/**
 * Get list of installed wallets from a given list
 */
export const getInstalledWallets = (
  walletList: string[] = ['phantom', 'solflare', 'backpack', 'glow', 'sollet']
): string[] => {
  return walletList.filter(isWalletInstalled)
}