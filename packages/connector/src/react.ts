/**
 * @connector-kit/connector/react
 * 
 * React-specific exports with hooks and components
 * Use this when you only need React functionality
 */

// React-specific components and providers (not in headless)
export { ConnectorProvider, useConnector, useConnectorClient } from './ui/connector-provider'
export { UnifiedProvider, AppProvider, WalletProvider } from './ui/unified-provider'

// React-specific error boundaries
export { ConnectorErrorBoundary, withErrorBoundary } from './components/ErrorBoundary'

// Enhanced React hooks
export { useCluster } from './hooks/use-cluster'
export { useAccount } from './hooks/use-account'
export { useWalletInfo } from './hooks/use-wallet-info'

export type { UseClusterReturn } from './hooks/use-cluster'
export type { UseAccountReturn } from './hooks/use-account'
export type { UseWalletInfoReturn } from './hooks/use-wallet-info'

// React-specific types
export type { 
  ConnectorSnapshot,
  MobileWalletAdapterConfig
} from './ui/connector-provider'

export type { UnifiedProviderProps } from './ui/unified-provider'

// Re-export headless core for convenience
// This includes: ConnectorClient, config, utilities, types, etc.
export * from './headless'