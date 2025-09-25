'use client'

import { type Address } from '@solana/kit'
import { getClusterInfo, type ClusterInfo } from '../utils/cluster'
import type { Transport } from '../transports/types'
import { createHttpTransport } from '../transports/http'
import type { Provider } from './provider'
import {
  WalletStandardKitSigner,
  type StandardWalletInfo,
} from '../hooks/use-standard-wallets'
import { type ConnectorState, ConnectorClient } from '@connector-kit/connector'
import type { SolanaCluster } from '@wallet-ui/core'

// Connector is the single source of truth; no Arc-managed persistence

/**
 * Configuration for the ArcWebClient.
 * This extends the configuration available in the ArcProvider.
 */
export interface ArcWebClientConfig {
  providers?: Provider[]
  network?: 'mainnet' | 'devnet' | 'testnet'
  rpcUrl?: string
  commitment?: 'processed' | 'confirmed' | 'finalized'
  autoConnect?: boolean
  debug?: boolean
  storage?: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
  }
  /** Pluggable transport for all RPC requests used by hooks/components */
  transport?: Transport
  /** Optional shared connector instance to unify wallet state with external providers */
  connector?: ConnectorClient | null
  
  /** Enhanced cluster configuration using wallet-ui */
  cluster?: {
    rpcUrl?: string
    network?: 'mainnet' | 'devnet' | 'testnet'
    clusters?: SolanaCluster[]
    allowSwitching?: boolean
    persistSelection?: boolean
  }
}

/**
 * The state managed by the ArcWebClient.
 * This is the single source of truth for the UI.
 */
export interface ArcWebClientState {
  // Network State
  network: {
    rpcUrl: string
    isMainnet: boolean
    isDevnet: boolean
    isTestnet: boolean
    canAirdrop: boolean
    clusterInfo: ClusterInfo
  }

  // Wallet State
  wallet: {
    wallets: StandardWalletInfo[]
    selectedWallet: any | null
    connected: boolean
    connecting: boolean
    address: Address | null
    signer: any | null
    accounts?: Array<{ address: Address; icon?: string; raw?: any }>
    selectedAccount?: Address | null
    capabilities?: {
      walletSupportsVersioned: boolean
    }
    // derived connectors facade (thin wrapper)
    connectors?: Array<{
      id: string
      name: string
      icon?: string
      available: () => boolean
      connect: () => Promise<void>
    }>
  }

  // Configuration
  config: ArcWebClientConfig
}

type Listener = (state: ArcWebClientState) => void

/**
 * ArcWebClient - A stateful client for managing the connection
 * to Solana and the user's wallet in a web environment.
 *
 * Inspired by the use-chat pattern, this class encapsulates all of the
 * state management logic, allowing the UI to be a simple, reactive
 * layer that subscribes to state changes.
 */
export class ArcWebClient {
  private listeners: Set<Listener> = new Set()
  private state: ArcWebClientState
  private walletUnsubscribers: Array<() => void> = []
  private connector: ConnectorClient | null = null

  constructor(config: ArcWebClientConfig) {
    const rpcUrl = config.rpcUrl || `https://api.${config.network || 'devnet'}.solana.com`
    const clusterInfo = getClusterInfo(rpcUrl)
    // Default transport if none provided
    const transport =
      config.transport ||
      createHttpTransport({ url: rpcUrl, timeoutMs: 15000, retry: { attempts: 2, strategy: 'exponential', baseDelayMs: 300, jitter: true } })

    this.state = {
      network: {
        rpcUrl,
        isMainnet: clusterInfo.isMainnet,
        isDevnet: clusterInfo.isDevnet,
        isTestnet: clusterInfo.isTestnet,
        canAirdrop: clusterInfo.isDevnet || clusterInfo.isTestnet,
        clusterInfo,
      },
      wallet: {
        wallets: [],
        selectedWallet: null,
        connected: false,
        connecting: false,
        address: null,
        signer: null,
        accounts: [],
        selectedAccount: null,
      },
      config: { ...config, transport },
    }

    this.initializeWallets()
  }

  private initializeWallets() {
    // Skip wallet initialization during SSR to prevent hydration mismatches
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Prefer externally provided connector (from app-level provider) when available
      const providedConnector = this.state.config.connector
      if (!providedConnector) {
        throw new Error('ArcProvider requires @arc/connector-kit AppProvider. Wrap your app with AppProvider and ensure connector is passed to Arc.')
      }
      this.connector = providedConnector

      const syncFromConnector = (s: ConnectorState) => {
        const selectedWallet = s.selectedWallet
        const connected = s.connected
        const connecting = s.connecting
        const selectedAccount = s.selectedAccount
        const accounts = s.accounts

        let signer: any = null
        let address: Address | null = null
        if (connected && selectedWallet && selectedAccount) {
          const rawAccount = (accounts as Array<{ address: string; raw: any }>).find((a) => a.address === selectedAccount)?.raw
          if (rawAccount) {
            signer = new WalletStandardKitSigner(rawAccount, selectedWallet)
            address = rawAccount.address as Address
          }
        }

        this.state = {
          ...this.state,
          wallet: {
            ...this.state.wallet,
            wallets: (s.wallets as Array<any> || []).map((w: any) => ({
              wallet: w.wallet,
              name: w.name as string,
              icon: (w.icon as string) || '',
              installed: !!w.installed,
              connecting: false,
            })),
            selectedWallet,
            connected,
            connecting,
            address,
            signer,
            accounts: (accounts as Array<any>).map((a: any) => ({ address: a.address as Address, icon: a.icon as string | undefined, raw: a.raw })),
            selectedAccount: (selectedAccount as Address | null),
            connectors: ((s.wallets as Array<any>) || []).map((w: any) => ({
              id: w.name as string,
              name: w.name as string,
              icon: (w.icon as string) || '',
              available: () => true,
              connect: async () => { await this.select(w.name) },
            })),
          },
        }
        this.notify()
        }

      // Initial sync and subscribe
      syncFromConnector(this.connector.getSnapshot())
      this.walletUnsubscribers.push(this.connector.subscribe(syncFromConnector))
    } catch (error) {
      console.warn('Failed to initialize connector:', error)
    }
  }

  /** Update configuration without recreating the client */
  updateConfig(next: ArcWebClientConfig): void {
    const rpcUrl = next.rpcUrl || `https://api.${next.network || 'devnet'}.solana.com`
    const clusterInfo = getClusterInfo(rpcUrl)
    const prevRpcUrl = this.state.network.rpcUrl
    // Ensure transport persists or defaults when config updates
    const transport =
      next.transport ||
      this.state.config.transport ||
      createHttpTransport({ url: rpcUrl, timeoutMs: 15000, retry: { attempts: 2, strategy: 'exponential', baseDelayMs: 300, jitter: true } })

    this.state = {
      ...this.state,
      network: {
        rpcUrl,
        isMainnet: clusterInfo.isMainnet,
        isDevnet: clusterInfo.isDevnet,
        isTestnet: clusterInfo.isTestnet,
        canAirdrop: clusterInfo.isDevnet || clusterInfo.isTestnet,
        clusterInfo,
      },
      config: { ...next, transport },
    }

    // If RPC URL changed, we may want to reset ephemeral wallet state if needed
    if (prevRpcUrl !== rpcUrl) {
      // No-op for now; hooks handle cache invalidation
    }

    this.notify()
  }

  /** Cleanup listeners and transient resources */
  destroy(): void {
    for (const unsub of this.walletUnsubscribers) {
      try { unsub() } catch {}
    }
    this.walletUnsubscribers = []
  }

  // Auto-connect is owned by connector-kit; Arc does not manage persistence

  /**
   * Subscribe to state changes.
   *
   * @param listener - A callback that will be invoked when the state changes.
   * @returns A function to unsubscribe.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Get a snapshot of the current state.
   * This is used by useSyncExternalStore to get the current value.
   */
  getSnapshot(): ArcWebClientState {
    return this.state
  }

  /**
   * Select and connect to a wallet.
   */
  async select(walletName: string): Promise<void> {
    // Skip during SSR
    if (typeof window === 'undefined') {
      return;
    }

    this.state = { ...this.state, wallet: { ...this.state.wallet, connecting: true } }
    this.notify()
    try {
      await this.connector?.select(walletName)
      const s = this.connector?.getSnapshot() as any
      const rawAcc = (s?.accounts as Array<any>)?.find((a: any) => a.address === s?.selectedAccount)?.raw
      const w = s?.selectedWallet
      const walletSupportsVersioned = rawAcc && w ? this.detectVersionedSupport(rawAcc, w) : true
      this.state = { ...this.state, wallet: { ...this.state.wallet, capabilities: { walletSupportsVersioned } } }
    } finally {
      this.state = { ...this.state, wallet: { ...this.state.wallet, connecting: false } }
      this.notify()
    }
  }

  /**
   * Select a specific account from the connected wallet.
   * Rebuilds the signer using the chosen Wallet Standard account.
   */
  async selectAccount(accountAddress: Address): Promise<void> {
    if (!this.connector) {
      throw new Error('Connector not initialized')
    }
    if (!accountAddress) {
      throw new Error('Account address is required')
    }

    try {
      await this.connector?.selectAccount(accountAddress as unknown as string)
      const s = this.connector?.getSnapshot() as any
      const rawAcc = (s?.accounts as Array<any>)?.find((a: any) => a.address === s?.selectedAccount)?.raw
      const w = s?.selectedWallet
      if (rawAcc && w) {
        const walletSupportsVersioned = this.detectVersionedSupport(rawAcc, w)
        this.state = { ...this.state, wallet: { ...this.state.wallet, capabilities: { walletSupportsVersioned } } }
        this.notify()
      }
    } catch (error) {
      console.error('Failed to select account:', error)
      throw error
    }
  }

  /**
   * Disconnect from the current wallet.
   */
  async disconnect(): Promise<void> {
    await this.connector?.disconnect()
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state))
  }

  private getStorage(): ArcWebClientConfig['storage'] | null {
    if (this.state.config.storage) return this.state.config.storage
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        getItem: (k: string) => window.localStorage.getItem(k),
        setItem: (k: string, v: string) => window.localStorage.setItem(k, v),
        removeItem: (k: string) => window.localStorage.removeItem(k),
      }
    }
    return null
  }

  /**
   * Best-effort detection of versioned (v0) transaction support from Wallet Standard features
   */
  private detectVersionedSupport(account: any, wallet: any): boolean {
    try {
      const features = (wallet?.features ?? {}) as Record<string, any>
      const accountFeatures = (account?.features ?? {}) as Record<string, any>
      const candidates = [
        accountFeatures['solana:signAndSendTransaction'],
        accountFeatures['solana:signTransaction'],
        features['solana:signAndSendTransaction'],
        features['solana:signTransaction'],
      ].filter(Boolean)

      const supports = (v: any): boolean => {
        const versions = v?.supportedTransactionVersions ?? v?.supportedVersions
        if (!versions) return false
        if (Array.isArray(versions)) return versions.includes(0) || versions.includes('v0') || versions.includes('0')
        if (versions instanceof Set) return versions.has(0) || versions.has('v0') || versions.has('0')
        return false
      }

      for (const c of candidates) {
        if (supports(c)) return true
      }
    } catch {}
    // Default to true since most modern wallets support v0
    return true
  }
}
