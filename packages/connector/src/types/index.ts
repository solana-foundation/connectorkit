/**
 * Central type exports for @connector-kit/connector
 *
 * Domain-organized types for wallets, accounts, transactions, events, storage, and connector state.
 */

// Wallet types
export type { Wallet, WalletAccount, WalletInfo } from './wallets';

// Account types
export type { AccountInfo } from './accounts';

// Connector state and configuration
export type {
    ConnectorState,
    ConnectorConfig,
    ConnectorHealth,
    ConnectorDebugMetrics,
    ConnectorDebugState,
    Listener,
} from './connector';

// Transaction and signer types
export type {
    SolanaTransaction,
    TransactionSignerConfig,
    SignedTransaction,
    TransactionSignerCapabilities,
    TransactionActivity,
} from './transactions';

// Event system types
export type { ConnectorEvent, ConnectorEventListener } from './events';

// Storage types
export type {
    StorageAdapter,
    StorageOptions,
    EnhancedStorageAccountOptions,
    EnhancedStorageClusterOptions,
    EnhancedStorageWalletOptions,
} from './storage';
