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

// Wallet standard types and utilities
export { getWalletsRegistry } from './lib/wallet-standard-shim'
export type {
  Wallet,
  WalletAccount,
  WalletStandardWallet,
  WalletStandardAccount
} from './lib/wallet-standard-shim'


// Enhanced storage (recommended - extends wallet-ui's Storage)
export {
  EnhancedStorage,
  EnhancedStorageAdapter,
  createEnhancedStorageAccount,
  createEnhancedStorageCluster,
  createEnhancedStorageWallet
} from './lib/enhanced-storage'
export type { 
  StorageAdapter,
  StorageOptions,
  EnhancedStorageAccountOptions,
  EnhancedStorageClusterOptions,
  EnhancedStorageWalletOptions
} from './lib/enhanced-storage'

// React providers and hooks
export { ConnectorProvider, useConnector, useConnectorClient } from './ui/connector-provider'
export type { ConnectorSnapshot } from './ui/connector-provider'
export type { MobileWalletAdapterConfig } from './ui/connector-provider'
export { UnifiedProvider, AppProvider, WalletProvider } from './ui/unified-provider'
export type { UnifiedProviderProps } from './ui/unified-provider'

// Enhanced React hooks
export { useCluster } from './hooks/use-cluster'
export { useAccount } from './hooks/use-account'
export { useWalletInfo } from './hooks/use-wallet-info'
export type { UseClusterReturn } from './hooks/use-cluster'
export type { UseAccountReturn } from './hooks/use-account'
export type { UseWalletInfoReturn } from './hooks/use-wallet-info'

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

// Utility functions
export * from './utils/clipboard'
export * from './utils/formatting'
export * from './utils/cluster'

// Re-export wallet-ui types and utilities
export type {
  SolanaCluster,
  SolanaClusterId,
} from '@wallet-ui/core'

export {
  createSolanaMainnet,
  createSolanaDevnet,
  createSolanaTestnet,
  createSolanaLocalnet,
} from '@wallet-ui/core'

// Utility functions for advanced usage
export {
  createMemoryStorage,
  createLocalStorage,
  isWalletInstalled,
  getInstalledWallets,
  classifyWalletError,
  registerMobileWalletAdapter
} from './headless'