/**
 * Central type exports for @solana/connector
 *
 * Domain-organized types for wallets, accounts, transactions, events, storage, and connector state.
 */

// Wallet types
export type { Wallet, WalletAccount, WalletInfo, WalletName, AccountAddress } from './wallets';
export { isWalletName, isAccountAddress } from './wallets';

// Account types
export type { AccountInfo } from './accounts';

// Connector state and configuration
export type {
    ConnectorState,
    ConnectorConfig,
    WalletDisplayConfig,
    CoinGeckoConfig,
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
    TransactionActivityStatus,
    TransactionMethod,
    TransactionMetadata,
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
    EnhancedStorageWalletStateOptions,
    PersistedWalletState,
} from './storage';

// WalletConnect types
export type {
    WalletConnectConfig,
    WalletConnectMetadata,
    WalletConnectTransport,
    WalletConnectSolanaAccount,
    WalletConnectSignMessageParams,
    WalletConnectSignMessageResult,
    WalletConnectSignTransactionParams,
    WalletConnectSignTransactionResult,
    WalletConnectSignAllTransactionsParams,
    WalletConnectSignAllTransactionsResult,
    WalletConnectSignAndSendTransactionParams,
    WalletConnectSignAndSendTransactionResult,
} from './walletconnect';

// Mobile Wallet Adapter types
export type { MobileWalletAdapterConfig, RegisterMwaConfig } from './mobile';

// Session types (vNext connector/session abstraction)
export type {
    WalletConnectorId,
    WalletConnectorMetadata,
    WalletConnector,
    ConnectOptions,
    SessionAccount,
    WalletSession,
    WalletStatus,
    WalletStatusDisconnected,
    WalletStatusConnecting,
    WalletStatusConnected,
    WalletStatusError,
} from './session';

export {
    createConnectorId,
    isWalletConnectorId,
    getWalletNameFromConnectorId,
    isDisconnected,
    isConnecting,
    isConnected,
    isStatusError,
    INITIAL_WALLET_STATUS,
    toLegacyWalletState,
} from './session';
