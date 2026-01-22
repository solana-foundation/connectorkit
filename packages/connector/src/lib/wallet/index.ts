// Wallet Standard Shim
export {
    getWalletsRegistry,
    ready,
    __resetWalletRegistryForTesting,
    type Wallet,
    type WalletAccount,
    type WalletWithFeatures,
    type StandardFeatures,
    type WalletWithStandardFeatures,
    type WalletsRegistry,
    type WalletStandardWallet,
    type WalletStandardAccount,
} from './standard-shim';

// Enhanced Storage
export {
    EnhancedStorage,
    EnhancedStorageAdapter,
    createEnhancedStorageAccount,
    createEnhancedStorageCluster,
    createEnhancedStorageWallet,
    createEnhancedStorageWalletState,
    saveWalletState,
    clearWalletState,
    STORAGE_VERSION,
    WALLET_STATE_VERSION,
} from './enhanced-storage';

// Wallet Detector
export { WalletDetector, type LegacyPublicKey, type DirectWallet } from './detector';

// Authenticity Verifier
export { WalletAuthenticityVerifier, type WalletVerificationResult } from './authenticity-verifier';

// Connection Manager
export { ConnectionManager } from './connection-manager';

// Auto Connector
export { AutoConnector } from './auto-connector';

// WalletConnect Integration
// Note: These are lazily loaded to avoid requiring @walletconnect/universal-provider
// unless WalletConnect is actually enabled in the config
export {
    registerWalletConnectWallet,
    isWalletConnectAvailable,
    createWalletConnectWallet,
    createMockWalletConnectTransport,
    type WalletConnectRegistration,
} from './walletconnect';
