/**
 * Enhanced useBalance hook with React 19 performance patterns
 */

'use client'

import { 
  useMemo, 
  useRef, 
  useCallback,
  useDeferredValue,
  useSyncExternalStore,
  startTransition
} from 'react'
import { useArcClient, type ArcClientSnapshot } from '../core/arc-client-provider'
import { address, type Address } from '@solana/kit'
import type { Transport } from '../transports/types'

export interface UseBalanceEnhancedOptions {
  address?: string | Address
  mint?: Address
  refreshInterval?: number
  enabled?: boolean
  staleTime?: number 
  cacheTime?: number 
  onUpdate?: (balance: bigint) => void
  retryOnError?: boolean
}

export interface UseBalanceEnhancedReturn {
  balance: bigint | null
  balanceSOL: number
  isLoading: boolean
  isError: boolean
  isStale: boolean
  error: Error | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

interface BalanceRpcResponse {
  value: string | number | bigint
}

interface ClientConfigSubset {
  transport: Transport
  commitment?: 'processed' | 'confirmed' | 'finalized'
}

class BalanceStore {
  private subscribers = new Set<() => void>()
  private state: {
    balance: bigint | null
    isLoading: boolean
    isError: boolean
    error: Error | null
    lastUpdated: Date | null
    isStale: boolean
  }
  private options: UseBalanceEnhancedOptions
  private client: ArcClientSnapshot | null
  private refreshTimer?: ReturnType<typeof setTimeout>
  private staleTimer?: ReturnType<typeof setTimeout>

  constructor(options: UseBalanceEnhancedOptions, client: ArcClientSnapshot | null) {
    this.options = options
    this.client = client
    this.state = {
      balance: null,
      isLoading: false,
      isError: false,
      error: null,
      lastUpdated: null,
      isStale: false
    }

    // Start initial fetch if enabled
    if (options.enabled !== false && options.address) {
      this.fetchBalance()
    }

    // Setup refresh interval
    if (options.refreshInterval && options.refreshInterval > 0) {
      this.refreshTimer = setInterval(() => {
        this.fetchBalance()
      }, options.refreshInterval)
    }
  }

  private notify() {
    this.subscribers.forEach(callback => callback())
  }

  subscribe = (callback: () => void) => {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
      if (this.subscribers.size === 0) {
        this.cleanup()
      }
    }
  }

  getSnapshot = () => {
    return { ...this.state }
  }

  private async fetchBalance() {
    if (!this.options.address || !this.client) return

    try {
      // Set loading state (only if not already loading)
      if (!this.state.isLoading) {
        this.state = { ...this.state, isLoading: true, isError: false }
        this.notify()
      }

      const addr = typeof this.options.address === 'string' 
        ? address(this.options.address)
        : this.options.address

      // Use client transport to fetch balance
      const { transport, commitment } = this.client.config as ClientConfigSubset
      const result = await transport.request<BalanceRpcResponse>({
        method: 'getBalance',
        params: [addr, { commitment: commitment ?? 'confirmed' }]
      })
      
      const raw = result.value
      const balance = typeof raw === 'bigint' ? raw : BigInt(raw ?? 0)

      // Update state with success
      this.state = {
        balance,
        isLoading: false,
        isError: false,
        error: null,
        lastUpdated: new Date(),
        isStale: false
      }

      // Setup stale timer
      if (this.options.staleTime && this.options.staleTime > 0) {
        this.staleTimer = setTimeout(() => {
          this.state = { ...this.state, isStale: true }
          this.notify()
        }, this.options.staleTime)
      }

      // Call update callback
      if (this.options.onUpdate && balance !== null) {
        startTransition(() => {
          this.options.onUpdate!(balance)
        })
      }

      this.notify()

    } catch (error) {
      // Handle error with retry logic
      const err = error instanceof Error ? error : new Error('Balance fetch failed')
      
      this.state = {
        ...this.state,
        isLoading: false,
        isError: true,
        error: err
      }
      this.notify()

      // Retry on error if enabled
      if (this.options.retryOnError !== false) {
        setTimeout(() => {
          this.fetchBalance()
        }, 1000) // Retry after 1 second
      }
    }
  }

  refresh = async () => {
    await this.fetchBalance()
  }

  private cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    if (this.staleTimer) {
      clearTimeout(this.staleTimer)
    }
  }

  updateOptions(newOptions: UseBalanceEnhancedOptions) {
    const addressChanged = newOptions.address !== this.options.address
    const mintChanged = newOptions.mint !== this.options.mint
    
    this.options = newOptions

    // Refetch if address or mint changed
    if ((addressChanged || mintChanged) && newOptions.enabled !== false) {
      this.fetchBalance()
    }
  }
}

const storeCache = new Map<string, BalanceStore>()

export function useBalanceEnhanced(options: UseBalanceEnhancedOptions = {}): UseBalanceEnhancedReturn {
  const client = useArcClient()
  
  const deferredOptions = useDeferredValue(options)
  
  const memoizedOptions = useMemo(() => ({
    address: deferredOptions.address,
    mint: deferredOptions.mint,
    refreshInterval: deferredOptions.refreshInterval ?? 30000, // 30 seconds default
    enabled: deferredOptions.enabled ?? true,
    staleTime: deferredOptions.staleTime ?? 60000, // 1 minute default
    cacheTime: deferredOptions.cacheTime ?? 300000, // 5 minutes default
    onUpdate: deferredOptions.onUpdate,
    retryOnError: deferredOptions.retryOnError ?? true
  }), [deferredOptions])

  const cacheKey = useMemo(() => {
    const addr = memoizedOptions.address ? String(memoizedOptions.address) : 'none'
    const mint = memoizedOptions.mint ? String(memoizedOptions.mint) : 'sol'
    return `balance:${addr}:${mint}`
  }, [memoizedOptions.address, memoizedOptions.mint])

  const store = useMemo(() => {
    let store = storeCache.get(cacheKey)
    if (!store) {
      store = new BalanceStore(memoizedOptions, client)
      storeCache.set(cacheKey, store)
    } else {
      store.updateOptions(memoizedOptions)
    }
    return store
  }, [cacheKey, memoizedOptions, client])

  // Create stable server snapshot to prevent infinite loops
  const getServerSnapshot = useCallback(() => ({
    balance: null,
    isLoading: false,
    isError: false,
    error: null,
    lastUpdated: null,
    isStale: false
  }), [])
  
  // Memoize the subscribe and getSnapshot functions
  const subscribe = useMemo(() => store.subscribe, [store])
  const getSnapshot = useMemo(() => store.getSnapshot, [store])

  // Subscribe to store updates
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot // Stable server-side snapshot
  )

  // Stable refresh function
  const refresh = useCallback(() => store.refresh(), [store])

  // Calculate SOL balance
  const balanceSOL = useMemo(() => {
    return state.balance ? Number(state.balance) / 1_000_000_000 : 0
  }, [state.balance])

  return {
    balance: state.balance,
    balanceSOL,
    isLoading: state.isLoading,
    isError: state.isError,
    isStale: state.isStale,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refresh
  }
}

/**
 * React 19 Usage Examples:
 * 
 * ```tsx
 * // Basic usage with automatic updates
 * const { balance, balanceSOL, isLoading } = useBalanceEnhanced({
 *   address: wallet.publicKey,
 *   refreshInterval: 10000 // Update every 10 seconds
 * })
 * 
 * // With stale-while-revalidate pattern
 * const { balance, isStale, refresh } = useBalanceEnhanced({
 *   address: wallet.publicKey,
 *   staleTime: 30000, // Consider stale after 30 seconds
 *   cacheTime: 300000 // Keep in cache for 5 minutes
 * })
 * 
 * if (isStale) {
 *   // Show stale indicator while background refresh happens
 *   refresh()
 * }
 * 
 * // With callback for real-time updates
 * useBalanceEnhanced({
 *   address: wallet.publicKey,
 *   onUpdate: (newBalance) => {
 *     // Update other parts of your app
 *     updatePortfolioValue(newBalance)
 *   }
 * })
 * ```
 */
