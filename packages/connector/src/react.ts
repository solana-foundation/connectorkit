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

// React-specific types
export type { 
  ConnectorSnapshot,
  MobileWalletAdapterConfig
} from './ui/connector-provider'

export type { UnifiedProviderProps } from './ui/unified-provider'

// Re-export headless core for convenience
// This includes: ConnectorClient, themes, config, utilities, etc.
export * from './headless'