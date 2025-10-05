/**
 * @connector-kit/connector/headless
 * 
 * Framework-agnostic core - works with Vue, Angular, Vanilla JS
 * Zero React dependencies for maximum compatibility
 */


// ============================================================================
// Core Client & Registry
// ============================================================================
export { ConnectorClient } from './lib/connector-client'
export { getWalletsRegistry } from './lib/wallet-standard-shim'

// ============================================================================
// Configuration
// ============================================================================
export { getDefaultConfig, getDefaultMobileConfig, createConfig, isUnifiedConfig } from './config'
export type { DefaultConfigOptions, ExtendedConnectorConfig, UnifiedConfigOptions, UnifiedConfig } from './config'

// ============================================================================
// Essential Types
// ============================================================================
export type { 
  ConnectorConfig,
  ConnectorState,
  WalletInfo,
  AccountInfo,
  ConnectorHealth,
  ConnectorEvent,
  ConnectorEventListener,
  ConnectorDebugMetrics,
  TransactionActivity,
  ConnectorDebugState
} from './lib/connector-client'

export type {
  Wallet,
  WalletAccount,
  WalletStandardWallet,
  WalletStandardAccount
} from './lib/wallet-standard-shim'

export type { MobileWalletAdapterConfig } from './ui/connector-provider'

// ============================================================================
// Transaction Signing
// ============================================================================
export {
  createTransactionSigner,
  TransactionSignerError,
  isTransactionSignerError
} from './lib/transaction-signer'

export type {
  TransactionSigner,
  TransactionSignerConfig,
  TransactionSignerCapabilities,
  SignedTransaction
} from './lib/transaction-signer'

// ============================================================================
// RPC Connection Pooling
// ============================================================================
export {
  ConnectionPool,
  getConnectionPool,
  createConnectionPool
} from './lib/connection-pool'

export type {
  ConnectionLike,
  ConnectionPoolOptions,
  ConnectionPoolStats
} from './lib/connection-pool'

// ============================================================================
// Storage System
// ============================================================================
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

// ============================================================================
// Error Handling
// ============================================================================
export { WalletErrorType } from './ui/error-boundary'
export type { WalletError } from './ui/error-boundary'

// ============================================================================
// Wallet-UI Integration
// ============================================================================
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

// ============================================================================
// Browser Compatibility
// ============================================================================
export { 
  installPolyfills, 
  isPolyfillInstalled, 
  isCryptoAvailable, 
  getPolyfillStatus 
} from './lib/polyfills'

// ============================================================================
// Utility Functions
// ============================================================================
export * from './utils/clipboard'
export * from './utils/formatting'
export * from './utils/formatting-light'
export * from './utils/cluster'
export * from './utils/network'

// ============================================================================
// Explorer URLs & Transaction Utilities
// ============================================================================
export {
  getSolanaExplorerUrl,
  getSolscanUrl,
  getXrayUrl,
  getSolanaFmUrl,
  getAllExplorerUrls,
  formatSignature,
  copySignature
} from './lib/explorer-urls'

export type { ExplorerType, ExplorerOptions } from './lib/explorer-urls'