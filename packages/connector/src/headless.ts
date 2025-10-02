/**
 * @connector-kit/connector/headless
 * 
 * Framework-agnostic core - works with Vue, Angular, Vanilla JS
 * Zero React dependencies for maximum compatibility
 */

// Core client logic
export { ConnectorClient } from './lib/connector-client'

// Configuration helpers
export { getDefaultConfig, getDefaultMobileConfig } from './config'
export type { DefaultConfigOptions, ExtendedConnectorConfig } from './config'

// Essential types for non-React usage
export type { 
  ConnectorConfig,
  ConnectorState,
  WalletInfo,
  AccountInfo
} from './lib/connector-client'

// Configuration and option types
export type { 
  ConnectorOptions, 
  MobileConnectorOptions
} from './types'

// Mobile Wallet Adapter utilities for headless users
export type { MobileWalletAdapterConfig } from './ui/connector-provider'

// Error handling utilities for headless users
export { WalletErrorType } from './components/ErrorBoundary'
export type { WalletError } from './components/ErrorBoundary'

// Import for internal use only
import { WalletErrorType, type WalletError } from './components/ErrorBoundary'

/**
 * Register Mobile Wallet Adapter programmatically
 * Useful for headless implementations that need mobile support
 */
export async function registerMobileWalletAdapter(config: import('./ui/connector-provider').MobileWalletAdapterConfig) {
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

/**
 * Storage utility helpers for custom implementations
 */
export const createMemoryStorage = () => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key)
  }
}

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

/**
 * Wallet detection utilities for headless implementations
 */
export const isWalletInstalled = (walletName: string): boolean => {
  if (typeof window === 'undefined') return false
  // Simple heuristic - check for common wallet properties
  const lowerName = walletName.toLowerCase()
  return Boolean(
    (window as any)[lowerName] || 
    (window as any).solana || 
    (window as any)[`${lowerName}Wallet`] ||
    // Check for wallet standard registration
    typeof (window as any).navigator?.wallet !== 'undefined'
  )
}

export const getInstalledWallets = (walletList: string[] = ['phantom', 'solflare', 'backpack', 'glow', 'sollet']): string[] => {
  return walletList.filter(isWalletInstalled)
}

/**
 * Classify error utility for headless error handling
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