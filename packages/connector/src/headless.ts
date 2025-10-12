/**
 * @connector-kit/connector/headless
 *
 * Framework-agnostic core - works with Vue, Angular, Vanilla JS
 * Zero React dependencies for maximum compatibility
 */

// ============================================================================
// Core Client & Registry
// ============================================================================
export { ConnectorClient } from './lib/core/connector-client';
export { getWalletsRegistry } from './lib/adapters/wallet-standard-shim';

// ============================================================================
// Configuration
// ============================================================================
export { getDefaultConfig, getDefaultMobileConfig, createConfig, isUnifiedConfig } from './config';
export type { DefaultConfigOptions, ExtendedConnectorConfig, UnifiedConfigOptions, UnifiedConfig } from './config';

// ============================================================================
// Essential Types
// ============================================================================
export type { Wallet, WalletAccount, WalletInfo } from './types/wallets';

export type { AccountInfo } from './types/accounts';

export type {
    ConnectorConfig,
    ConnectorState,
    ConnectorHealth,
    ConnectorDebugMetrics,
    ConnectorDebugState,
    Listener,
} from './types/connector';

export type {
    SolanaTransaction,
    TransactionSignerConfig,
    SignedTransaction,
    TransactionSignerCapabilities,
    TransactionActivity,
} from './types/transactions';

export type { ConnectorEvent, ConnectorEventListener } from './types/events';

export type {
    StorageAdapter,
    StorageOptions,
    EnhancedStorageAccountOptions,
    EnhancedStorageClusterOptions,
    EnhancedStorageWalletOptions,
} from './types/storage';

export type { WalletStandardWallet, WalletStandardAccount } from './lib/adapters/wallet-standard-shim';

export type { MobileWalletAdapterConfig } from './ui/connector-provider';

// ============================================================================
// Transaction Signing
// ============================================================================
export {
    createTransactionSigner,
    TransactionSignerError,
    isTransactionSignerError,
} from './lib/transaction/transaction-signer';
export { createGillTransactionSigner } from './lib/transaction/gill-transaction-signer';

export type { TransactionSigner } from './lib/transaction/transaction-signer';

// ============================================================================
// Storage System
// ============================================================================
export {
    EnhancedStorage,
    EnhancedStorageAdapter,
    createEnhancedStorageAccount,
    createEnhancedStorageCluster,
    createEnhancedStorageWallet,
} from './lib/adapters/enhanced-storage';

// ============================================================================
// Error Handling
// ============================================================================
export { WalletErrorType } from './ui/error-boundary';
export type { WalletError } from './ui/error-boundary';

// ============================================================================
// Wallet-UI Integration
// ============================================================================
export type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';

export { createSolanaMainnet, createSolanaDevnet, createSolanaTestnet, createSolanaLocalnet } from '@wallet-ui/core';

// ============================================================================
// Browser Compatibility
// ============================================================================
export { installPolyfills, isPolyfillInstalled, isCryptoAvailable, getPolyfillStatus } from './lib/utils/polyfills';

// ============================================================================
// Utility Functions
// ============================================================================
export * from './utils/clipboard';
export * from './utils/formatting';
export * from './utils/formatting-light';
export * from './utils/cluster';
export * from './utils/network';

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
    copySignature,
} from './lib/utils/explorer-urls';

export type { ExplorerType, ExplorerOptions } from './lib/utils/explorer-urls';
