/**
 * @connector-kit/connector - Storage Manager
 * 
 * Storage abstraction compatible with wallet-ui's nanostores pattern
 * but doesn't require nanostores as a dependency.
 */

import type { SolanaClusterId } from '@wallet-ui/core'

export interface StorageAdapter<T> {
  get(): T
  set(value: T): void
  subscribe?(callback: (value: T) => void): () => void
}

/**
 * Simple localStorage-backed storage with subscription support
 */
export class SimpleStorage<T> implements StorageAdapter<T> {
  private listeners = new Set<(value: T) => void>()
  private currentValue: T
  
  constructor(
    private key: string,
    private initialValue: T,
    private storage: Storage = typeof window !== 'undefined' ? window.localStorage : null as any
  ) {
    this.currentValue = this.get()
  }

  get(): T {
    if (!this.storage) return this.initialValue
    
    try {
      const item = this.storage.getItem(this.key)
      if (item === null) return this.initialValue
      return JSON.parse(item) as T
    } catch {
      return this.initialValue
    }
  }

  set(value: T): void {
    if (!this.storage) {
      this.currentValue = value
      this.notifyListeners(value)
      return
    }

    try {
      this.storage.setItem(this.key, JSON.stringify(value))
      this.currentValue = value
      this.notifyListeners(value)
    } catch (error) {
      // Storage failed (quota exceeded, etc.)
      console.warn(`Failed to persist ${this.key}:`, error)
    }
  }

  subscribe(callback: (value: T) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(value: T): void {
    this.listeners.forEach(cb => {
      try {
        cb(value)
      } catch (error) {
        console.error('Storage listener error:', error)
      }
    })
  }
}

/**
 * Create a storage instance for wallet account persistence
 */
export function createAccountStorage(key = 'connector-kit:account'): StorageAdapter<string | undefined> {
  return new SimpleStorage<string | undefined>(key, undefined)
}

/**
 * Create a storage instance for cluster selection persistence
 */
export function createClusterStorage(key = 'connector-kit:cluster'): StorageAdapter<SolanaClusterId> {
  return new SimpleStorage<SolanaClusterId>(key, 'solana:mainnet')
}

/**
 * Create a storage instance for wallet name persistence
 */
export function createWalletStorage(key = 'connector-kit:wallet'): StorageAdapter<string | undefined> {
  return new SimpleStorage<string | undefined>(key, undefined)
}

/**
 * Create a memory-only storage (useful for SSR or testing)
 */
export class MemoryStorage<T> implements StorageAdapter<T> {
  private value: T
  private listeners = new Set<(value: T) => void>()

  constructor(initialValue: T) {
    this.value = initialValue
  }

  get(): T {
    return this.value
  }

  set(value: T): void {
    this.value = value
    this.listeners.forEach(cb => cb(value))
  }

  subscribe(callback: (value: T) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
}

