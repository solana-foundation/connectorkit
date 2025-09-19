/**
 * DEPRECATED: Legacy wallet adapter types
 * 
 * These types are provided for backward compatibility only.
 * New code should use `useStandardWallets` which provides universal
 * wallet detection without manual adapter configuration.
 * 
 * Migration guide:
 * - Replace `useWallet({ adapters: [...] })` with `useStandardWallets()`
 * - Remove manual adapter imports and configuration
 * - Use Wallet Standard for automatic wallet detection
 */

import type { TransactionSigner } from '@solana/kit'

// Wallet Standard types - simplified for backward compatibility
export interface WalletAccount {
  address: string
  publicKey: Uint8Array
  chains: string[]
  features: string[]
}

export interface WalletProperties {
  name: string
  icon: string
  version: string
  chains: string[]
  features: string[]
}

export interface WalletMetadata {
  name: string
  icon: string
  url?: string
  description?: string
}

// Wallet connection states
export type WalletConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Wallet events
export interface WalletEvents {
  connect: (accounts: WalletAccount[]) => void
  disconnect: () => void
  accountChanged: (accounts: WalletAccount[]) => void
  error: (error: Error) => void
}

// DEPRECATED: Base adapter interface
export interface WalletAdapter {
  // Basic properties
  readonly name: string
  readonly icon: string
  readonly url?: string
  readonly description?: string
  
  // Wallet Standard compliance
  readonly chains: string[]
  readonly features: string[]
  readonly accounts: WalletAccount[]
  
  // State
  readonly connected: boolean
  readonly connecting: boolean
  readonly readyState: WalletAdapterReadyState
  readonly status?: WalletConnectionStatus
  
  // Core methods
  connect(): Promise<void>
  disconnect(): Promise<void>
  detect?(): Promise<void>
  destroy?(): Promise<void>
  
  // Transaction signing 
  getSigner(): TransactionSigner | null
  
  // Event handling
  on<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): void
  off<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): void
}

// Ready states
export enum WalletAdapterReadyState {
  NotDetected = 'NotDetected',
  Loading = 'Loading',
  Ready = 'Ready',
  Installed = 'Installed',
  Loadable = 'Loadable',
  Unsupported = 'Unsupported'
}

// Error types
export class WalletError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'WalletError'
  }
}

export class WalletConnectionError extends WalletError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR')
    this.name = 'WalletConnectionError'
  }
}

export class WalletNotInstalledError extends WalletError {
  constructor(walletName: string) {
    super(`${walletName} wallet is not installed`, 'NOT_INSTALLED')
    this.name = 'WalletNotInstalledError'
  }
}

export class WalletNotConnectedError extends WalletError {
  constructor() {
    super('Wallet is not connected', 'NOT_CONNECTED')
    this.name = 'WalletNotConnectedError'
  }
}

export class WalletSignTransactionError extends WalletError {
  constructor(message: string) {
    super(message, 'SIGN_TRANSACTION_ERROR')
    this.name = 'WalletSignTransactionError'
  }
}

// Base adapter class (minimal implementation for compatibility)
export abstract class BaseWalletAdapter implements WalletAdapter {
  abstract readonly name: string
  abstract readonly icon: string
  abstract readonly url?: string
  abstract readonly description?: string
  abstract readonly chains: string[]
  abstract readonly features: string[]
  
  public accounts: WalletAccount[] = []
  public connected = false
  public connecting = false
  public readyState = WalletAdapterReadyState.NotDetected
  public status?: WalletConnectionStatus = 'disconnected'
  
  private listeners: Map<keyof WalletEvents, Set<Function>> = new Map()
  
  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract getSigner(): TransactionSigner | null
  
  async detect?(): Promise<void> {
    // Optional method - override in subclasses if needed
  }
  
  async destroy?(): Promise<void> {
    // Optional method - override in subclasses if needed
    this.listeners.clear()
  }
  
  on<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }
  
  off<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): void {
    this.listeners.get(event)?.delete(listener)
  }
  
  protected emit<K extends keyof WalletEvents>(event: K, ...args: Parameters<WalletEvents[K]>): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        (listener as Function)(...args)
      } catch (error) {
        console.error(`Error in ${event} listener:`, error)
      }
    })
  }
}