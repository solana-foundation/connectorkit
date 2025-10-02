// Configuration helpers
export { getDefaultConfig, getDefaultMobileConfig } from './config'
export type { DefaultConfigOptions, ExtendedConnectorConfig } from './config'

// Core exports
export { ConnectorClient } from './lib/connector-client'
export type { 
  ConnectorState, 
  ConnectorConfig, 
  WalletInfo, 
  AccountInfo
} from './lib/connector-client'

export { ConnectorProvider, useConnector, useConnectorClient } from './ui/connector-provider'
export type { ConnectorSnapshot } from './ui/connector-provider'
export type { MobileWalletAdapterConfig } from './ui/connector-provider'
export { UnifiedProvider, AppProvider, WalletProvider } from './ui/unified-provider'
export type { UnifiedProviderProps } from './ui/unified-provider'

// Error handling utilities - useful for both pre-built and headless usage
export { 
  ConnectorErrorBoundary, 
  withErrorBoundary,
  WalletErrorType 
} from './components/ErrorBoundary'
export type { WalletError } from './components/ErrorBoundary'

// Configuration types
export type { 
  ConnectorOptions, 
  MobileConnectorOptions
} from './types'

// Utility functions for advanced usage
export {
  createMemoryStorage,
  createLocalStorage,
  isWalletInstalled,
  getInstalledWallets,
  classifyWalletError,
  registerMobileWalletAdapter
} from './headless'