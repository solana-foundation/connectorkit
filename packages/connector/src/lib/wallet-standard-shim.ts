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
  features: readonly string[]
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

// Cached registry to avoid repeated initialization
let cachedRegistry: WalletsRegistry | null = null

function normalizeAccount(account: any): WalletStandardAccount {
  const publicKey = account.publicKey instanceof Uint8Array
    ? account.publicKey
    : new Uint8Array(account.publicKey ?? [])

  return {
    address: account.address,
    publicKey,
    chains: Array.isArray(account.chains) ? account.chains : [],
    features: Array.isArray(account.features) ? account.features : [],
    label: account.label,
    icon: account.icon,
  }
}

function normalizeWallet(wallet: any): WalletStandardWallet {
  return {
    name: wallet?.name ?? 'Unknown Wallet',
    icon: wallet?.icon,
    chains: Array.isArray(wallet?.chains) ? wallet.chains : [],
    features: wallet?.features ?? {},
    accounts: Array.isArray(wallet?.accounts)
      ? wallet.accounts.map(normalizeAccount)
      : [],
  }
}

function wrapRegistry(raw: any): WalletsRegistry {
  const safe = raw ?? {}
  return {
    get: () => {
      try {
        const wallets = typeof safe.get === 'function' ? safe.get() : []
        if (!Array.isArray(wallets)) return []
        return wallets.map(normalizeWallet)
      } catch {
        return []
      }
    },
    on: (event, callback) => {
      if (typeof safe.on !== 'function') return () => {}
      const handler = (...wallets: any[]) => {
        wallets.forEach(wallet => callback(normalizeWallet(wallet)))
      }
      const cleanup = safe.on(event, handler)
      return typeof cleanup === 'function' ? cleanup : () => {}
    }
  }
}


/**
 * Get the wallets registry using @wallet-standard/react
 * This is the proper way that wallet-ui does it
 */
export function getWalletsRegistry(): WalletsRegistry {
  if (typeof window === 'undefined') {
    return {
      get: () => [],
      on: () => () => {}
    }
  }

  // Return cached registry if available
  if (cachedRegistry) {
    return cachedRegistry
  }

  try {
    // Check window.navigator.wallets first (where wallets register)
    const nav = window.navigator as any
    if (nav.wallets && typeof nav.wallets.get === 'function') {
      console.log('✅ Found wallet standard registry on navigator.wallets')
      cachedRegistry = wrapRegistry(nav.wallets)
      return cachedRegistry
    }
    
    console.log('⚠️ window.navigator.wallets not found')
    
    // Try to initialize via dynamic import
    import('@wallet-standard/app')
      .then(mod => {
        const registry = mod.getWallets?.()
        if (registry && typeof registry.get === 'function') {
          console.log('✅ Wallet Standard initialized via import')
          cachedRegistry = wrapRegistry(registry)
        }
      })
      .catch(error => {
        console.warn('Could not initialize @wallet-standard/app:', error)
      })
  } catch (error) {
    console.warn('Failed to access wallet standard:', error)
  }

  // Return dynamic registry that checks navigator.wallets on each call
  return {
    get: () => {
      if (cachedRegistry) {
        return cachedRegistry.get()
      }
      const nav = (window.navigator as any).wallets
      if (nav && typeof nav.get === 'function') {
        cachedRegistry = wrapRegistry(nav)
        return cachedRegistry.get()
      }
      return []
    },
    on: (event, callback) => {
      if (cachedRegistry) {
        return cachedRegistry.on(event, callback)
      }
      const nav = (window.navigator as any).wallets
      if (nav && typeof nav.on === 'function') {
        cachedRegistry = wrapRegistry(nav)
        return cachedRegistry.on(event, callback)
      }
      return () => {}
    }
  }
}

