import type { ConnectorConfig } from '../lib/connector-client'
import type { SolanaCluster } from '@wallet-ui/core'
import type React from 'react'

export interface DefaultConfigOptions {
  /** Application name shown in wallet connection prompts */
  appName: string
  /** Application URL for wallet connection metadata */
  appUrl?: string
  /** Enable automatic wallet reconnection on page load */
  autoConnect?: boolean
  /** Enable debug logging */
  debug?: boolean
  /** Solana network to connect to */
  network?: 'mainnet-beta' | 'devnet' | 'testnet'
  /** Enable Mobile Wallet Adapter support */
  enableMobile?: boolean
  /** Custom storage implementation */
  storage?: ConnectorConfig['storage']
  /** Custom cluster configuration - overrides network if provided */
  clusters?: SolanaCluster[]
  /** Persist cluster selection across sessions */
  persistClusterSelection?: boolean
  /** Enable error boundaries for automatic error handling (default: true) */
  enableErrorBoundary?: boolean
  /** Maximum retry attempts for error recovery (default: 3) */
  maxRetries?: number
  /** Custom error handler */
  onError?: (error: Error, errorInfo: any) => void
}

/** Extended ConnectorConfig with app metadata */
export interface ExtendedConnectorConfig extends ConnectorConfig {
  /** Application name for display and metadata */
  appName?: string
  /** Application URL for metadata */
  appUrl?: string
  /** Whether mobile wallet adapter is enabled */
  enableMobile?: boolean
  /** Selected network for convenience */
  network?: 'mainnet-beta' | 'devnet' | 'testnet'
  /** Error boundary configuration */
  errorBoundary?: {
    /** Enable error boundaries (default: true) */
    enabled?: boolean
    /** Maximum retry attempts (default: 3) */
    maxRetries?: number
    /** Custom error handler */
    onError?: (error: Error, errorInfo: any) => void
    /** Custom fallback component */
    fallback?: (error: any, retry: () => void) => React.ReactNode
  }
}

/**
 * Creates a default connector configuration with sensible defaults for Solana applications
 */
export function getDefaultConfig(options: DefaultConfigOptions): ExtendedConnectorConfig {
  const {
    appName,
    appUrl,
    autoConnect = true,
    debug,
    network = 'mainnet-beta',
    enableMobile = true,
    storage,
    clusters,
    persistClusterSelection = true,
    enableErrorBoundary = true,
    maxRetries = 3,
    onError,
  } = options

  // Default to localStorage if available
  const defaultStorage: ConnectorConfig['storage'] = typeof window !== 'undefined' ? {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value)
      } catch {
        // Silently fail
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key)
      } catch {
        // Silently fail
      }
    },
  } : undefined

  const config: ExtendedConnectorConfig = {
    // Core connector config
    autoConnect,
    debug: debug ?? (process.env.NODE_ENV === 'development'),
    storage: storage ?? defaultStorage,
    // App metadata (now actually stored and used)
    appName,
    appUrl,
    enableMobile,
    network,
    // Error boundary configuration
    errorBoundary: {
      enabled: enableErrorBoundary,
      maxRetries,
      onError,
    },
  }

  // Add cluster configuration if provided
  if (clusters) {
    config.cluster = {
      clusters,
      persistSelection: persistClusterSelection
    }
  }

  return config
}

/**
 * Default Mobile Wallet Adapter configuration for Solana applications
 */
export function getDefaultMobileConfig(options: {
  appName: string
  appUrl?: string
  network?: 'mainnet-beta' | 'devnet' | 'testnet'
}) {
  const baseUrl = options.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000')
  
  return {
    appIdentity: {
      name: options.appName,
      uri: baseUrl,
      icon: `${baseUrl}/favicon.ico`,
    },
    cluster: options.network || 'mainnet-beta',
  }
}
