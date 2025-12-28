/**
 * @solana/connector/headless
 *
 * Framework-agnostic core - works with Vue, Angular, Vanilla JS
 * Zero React dependencies for maximum compatibility
 */

// ============================================================================
// Core Client & Registry
// ============================================================================
export { ConnectorClient } from './lib/core/connector-client';

// ============================================================================
// Configuration
// ============================================================================
export { getDefaultConfig, getDefaultMobileConfig } from './config';
export type { DefaultConfigOptions, ExtendedConnectorConfig } from './config';

// Configuration validation
export { validateConfigOptions, parseConfigOptions } from './config';

// ============================================================================
// Essential Types (via barrel)
// ============================================================================
export * from './types';

export type { MobileWalletAdapterConfig } from './ui/connector-provider';

// ============================================================================
// Wallet System (via barrel)
// ============================================================================
export {
    // Standard shim
    getWalletsRegistry,
    ready,
    type WalletStandardWallet,
    type WalletStandardAccount,
    // Enhanced storage
    EnhancedStorage,
    EnhancedStorageAdapter,
    createEnhancedStorageAccount,
    createEnhancedStorageCluster,
    createEnhancedStorageWallet,
} from './lib/wallet';

// ============================================================================
// Transaction Signing
// ============================================================================
export {
    createTransactionSigner,
    TransactionSignerError,
    isTransactionSignerError,
} from './lib/transaction/transaction-signer';
export {
    createKitTransactionSigner,
    /** @deprecated Use `createKitTransactionSigner` instead */
    createGillTransactionSigner,
} from './lib/transaction/kit-transaction-signer';

export type { TransactionSigner } from './lib/transaction/transaction-signer';

// ============================================================================
// Error Handling
// ============================================================================
export { WalletErrorType } from './ui/error-boundary';
export type { WalletError } from './ui/error-boundary';

// Result-based error handling
export { tryCatch, tryCatchSync, isSuccess, isFailure } from './lib/core/try-catch';
export type { Result, Success, Failure } from './lib/core/try-catch';

// Unified Error System
export {
    ConnectorError,
    ConnectionError,
    ValidationError,
    ConfigurationError,
    NetworkError,
    TransactionError,
    Errors,
    isConnectorError,
    isConnectionError,
    isValidationError,
    isConfigurationError,
    isNetworkError,
    isTransactionError,
    toConnectorError,
    getUserFriendlyMessage,
} from './lib/errors';
export type {
    ConnectionErrorCode,
    ValidationErrorCode,
    ConfigurationErrorCode,
    NetworkErrorCode,
    TransactionErrorCode,
} from './lib/errors';

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
// Kit Signer Integration
// ============================================================================
export * from './lib/kit/signer-types';
export * from './lib/kit/signer-factories';
export * from './lib/kit/signer-integration';
export * from './lib/kit/signer-utils';
export { createSignableMessage } from '@solana/signers';
export { address } from '@solana/addresses';

// ============================================================================
// Connection Abstraction
// ============================================================================
export type { DualConnection, Commitment } from './lib/connection/types';
export { isLegacyConnection, isKitConnection } from './lib/connection/types';
export { getLatestBlockhash, sendRawTransaction } from './lib/connection/helpers';

// ============================================================================
// Utility Functions
// ============================================================================
export * from './utils/clipboard';
export * from './utils/formatting';
export * from './utils/cluster';
export * from './utils/chain';
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

// ============================================================================
// Kit Utilities (replaces gill imports)
// ============================================================================
export {
    LAMPORTS_PER_SOL,
    lamportsToSol,
    solToLamports,
    getExplorerLink,
    getPublicSolanaRpcUrl,
    createSolanaClient,
    prepareTransaction,
} from './lib/kit';

export type {
    SolanaClusterMoniker,
    ModifiedClusterUrl,
    SolanaClient,
    CreateSolanaClientArgs,
    GetExplorerLinkArgs,
    PrepareTransactionConfig,
} from './lib/kit';
