/**
 * @connector-kit/connector - wallet-standard integration
 * 
 * Simplified wallet standard types and registry access
 */

export interface Wallet {
  name: string
  icon?: string
  chains: readonly string[]
  features: Record<string, unknown>
  accounts: readonly WalletAccount[]
}

export interface WalletAccount {
  address: string
  publicKey: Uint8Array
  chains: readonly string[]
  features: readonly string[]
  label?: string
  icon?: string
}

export interface WalletsRegistry {
  get(): readonly Wallet[]
  on(event: 'register' | 'unregister', callback: (wallet: Wallet) => void): () => void
}

// Legacy aliases for backward compatibility
export type WalletStandardWallet = Wallet
export type WalletStandardAccount = WalletAccount

// Simple registry reference
let registry: any = null

function normalizeWallet(wallet: any): Wallet {
  return {
    name: wallet?.name ?? 'Unknown Wallet',
    icon: wallet?.icon,
    chains: wallet?.chains ?? [],
    features: wallet?.features ?? {},
    accounts: wallet?.accounts ?? [],
  }
}


/**
 * Get the wallets registry - simplified approach
 */
export function getWalletsRegistry(): WalletsRegistry {
  if (typeof window === 'undefined') {
    return {
      get: () => [],
      on: () => () => {}
    }
  }

  // Initialize wallet standard if not available
  if (!registry) {
    const nav = window.navigator as any
    
    // Try direct registry first
    if (nav.wallets && typeof nav.wallets.get === 'function') {
      registry = nav.wallets
    } else {
      // Initialize wallet standard
      import('@wallet-standard/app')
        .then(mod => {
          const walletStandardRegistry = mod.getWallets?.()
          if (walletStandardRegistry) {
            registry = walletStandardRegistry
          }
        })
        .catch(() => {
          // Wallet standard unavailable - not critical since we have instant auto-connect
        })
    }
  }

  // Return simplified registry interface
  return {
    get: () => {
      try {
        const nav = window.navigator as any
        const activeRegistry = nav.wallets || registry
        if (activeRegistry && typeof activeRegistry.get === 'function') {
          const wallets = activeRegistry.get()
          return Array.isArray(wallets) ? wallets.map(normalizeWallet) : []
        }
        return []
      } catch {
        return []
      }
    },
    on: (event, callback) => {
      try {
        const nav = window.navigator as any
        const activeRegistry = nav.wallets || registry
        if (activeRegistry && typeof activeRegistry.on === 'function') {
          return activeRegistry.on(event, (wallet: any) => callback(normalizeWallet(wallet)))
        }
        return () => {}
      } catch {
        return () => {}
      }
    }
  }
}

