/**
 * @connector-kit/connector - wallet-standard shim
 * 
 * Minimal wallet-standard types and utilities that can work with or without wallet-ui/react.
 * This provides a clean abstraction layer that allows us to optionally use wallet-ui types
 * while maintaining compatibility with direct wallet-standard usage.
 */

export interface WalletStandardWallet {
  name: string
  icon?: string
  chains: readonly string[]
  features: Record<string, unknown>
  accounts: readonly WalletStandardAccount[]
}

export interface WalletStandardAccount {
  address: string
  publicKey: Uint8Array
  chains: readonly string[]
  features: string[]
  label?: string
  icon?: string
}

export interface WalletStandardEvents {
  register(wallet: WalletStandardWallet): void
  unregister(wallet: WalletStandardWallet): void
}

// Re-export as base types
export type Wallet = WalletStandardWallet
export type WalletAccount = WalletStandardAccount

export interface WalletsRegistry {
  get(): readonly Wallet[]
  on(event: 'register' | 'unregister', callback: (wallet: Wallet) => void): () => void
}

/**
 * Get the wallets registry
 * Attempts to use wallet-ui/react if available, falls back to wallet-standard/app
 */
export function getWalletsRegistry(): WalletsRegistry {
  if (typeof window === 'undefined') {
    // SSR - return empty registry
    return {
      get: () => [],
      on: () => () => {}
    }
  }

  // Always use wallet-standard/app for now
  // wallet-ui/react is an optional peer dependency for React-specific features
  try {
    // Dynamic import to handle both CJS and ESM
    const { getWallets } = require('@wallet-standard/app')
    return getWallets()
  } catch (error) {
    // Fallback to empty registry if wallet-standard is not available
    console.warn('Failed to load wallet-standard:', error)
    return {
      get: () => [],
      on: () => () => {}
    }
  }
}

