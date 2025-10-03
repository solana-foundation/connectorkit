/**
 * @connector-kit/connector - Unified configuration
 * 
 * Simplified configuration for apps using ConnectorKit with Armadura or standalone
 * Eliminates config duplication and provides a single source of truth
 */

import type { ExtendedConnectorConfig } from './default-config'
import type { MobileWalletAdapterConfig } from '../ui/connector-provider'
import { getDefaultConfig, getDefaultMobileConfig } from './default-config'
import {
  normalizeNetwork,
  toRpcNetwork,
  getDefaultRpcUrl,
  type SolanaNetwork,
  type SolanaNetworkRpc
} from '../utils/network'

/**
 * Options for creating a unified configuration
 */
export interface UnifiedConfigOptions {
  /** Application name shown in wallet connection prompts */
  appName: string
  /** Application URL for wallet connection metadata */
  appUrl?: string
  /**
   * Solana network to connect to
   * Accepts both conventions: 'mainnet' or 'mainnet-beta'
   */
  network?: SolanaNetwork | SolanaNetworkRpc | string
  /** Enable automatic wallet reconnection on page load */
  autoConnect?: boolean
  /** Enable debug logging */
  debug?: boolean
  /** Enable Mobile Wallet Adapter support */
  enableMobile?: boolean
  /** Custom RPC URL (overrides default for network) */
  rpcUrl?: string
  /** Enable error boundaries for automatic error handling */
  enableErrorBoundary?: boolean
  /** Maximum retry attempts for error recovery */
  maxRetries?: number
  /** Custom error handler */
  onError?: (error: Error, errorInfo: any) => void
}

/**
 * Unified configuration output
 * Contains all configs needed for both ConnectorKit and Armadura
 */
export interface UnifiedConfig {
  /** ConnectorKit configuration */
  connectorConfig: ExtendedConnectorConfig
  /** Mobile Wallet Adapter configuration (optional) */
  mobile?: MobileWalletAdapterConfig
  /** Normalized network name (for Armadura) */
  network: SolanaNetwork
  /** RPC network name (for RPC endpoints) */
  rpcNetwork: SolanaNetworkRpc
  /** RPC endpoint URL */
  rpcUrl: string
  /** Application metadata */
  app: {
    name: string
    url: string
  }
}

/**
 * Create a unified configuration for ConnectorKit and Armadura
 * 
 * This helper eliminates configuration duplication by creating all necessary
 * configs from a single source of truth. It automatically handles network
 * name translation between different conventions.
 * 
 * @example
 * ```tsx
 * import { createConfig, AppProvider } from '@connector-kit/connector'
 * import { ArmaProvider } from '@armadura/sdk'
 * 
 * const config = createConfig({
 *   appName: 'My App',
 *   network: 'mainnet', // Works with 'mainnet' or 'mainnet-beta'
 *   enableMobile: true
 * })
 * 
 * <AppProvider connectorConfig={config.connectorConfig} mobile={config.mobile}>
 *   <ArmaProvider
 *     config={{
 *       network: config.network,
 *       rpcUrl: config.rpcUrl,
 *       providers: [...]
 *     }}
 *     useConnector="auto"
 *   >
 *     {children}
 *   </ArmaProvider>
 * </AppProvider>
 * ```
 */
export function createConfig(options: UnifiedConfigOptions): UnifiedConfig {
  const {
    appName,
    appUrl,
    network = 'mainnet',
    autoConnect = true,
    debug,
    enableMobile = true,
    rpcUrl: customRpcUrl,
    enableErrorBoundary = true,
    maxRetries = 3,
    onError,
  } = options

  // Normalize network name
  const normalizedNetwork = normalizeNetwork(network)
  const rpcNetwork = toRpcNetwork(normalizedNetwork)
  const rpcUrl = customRpcUrl || getDefaultRpcUrl(normalizedNetwork)

  // Determine app URL
  const resolvedAppUrl = appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000')

  // Create ConnectorKit config
  const connectorConfig = getDefaultConfig({
    appName,
    appUrl: resolvedAppUrl,
    network: rpcNetwork, // Use RPC convention for internal consistency
    autoConnect,
    debug,
    enableMobile,
    enableErrorBoundary,
    maxRetries,
    onError,
  })

  // Create mobile config if enabled (mobile doesn't support localnet)
  const mobile = enableMobile && normalizedNetwork !== 'localnet'
    ? getDefaultMobileConfig({
        appName,
        appUrl: resolvedAppUrl,
        network: rpcNetwork as 'mainnet-beta' | 'devnet' | 'testnet',
      })
    : undefined

  return {
    connectorConfig,
    mobile,
    network: normalizedNetwork,
    rpcNetwork,
    rpcUrl,
    app: {
      name: appName,
      url: resolvedAppUrl,
    },
  }
}

/**
 * Type guard to check if a config is a unified config
 */
export function isUnifiedConfig(config: any): config is UnifiedConfig {
  return (
    config &&
    typeof config === 'object' &&
    'connectorConfig' in config &&
    'network' in config &&
    'rpcUrl' in config
  )
}

