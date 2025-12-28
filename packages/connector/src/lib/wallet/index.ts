// Wallet Standard Shim
export {
    getWalletsRegistry,
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
    STORAGE_VERSION,
} from './enhanced-storage';

// Wallet Detector
export { WalletDetector, type LegacyPublicKey, type DirectWallet } from './detector';

// Authenticity Verifier
export { WalletAuthenticityVerifier, type WalletVerificationResult } from './authenticity-verifier';

// Connection Manager
export { ConnectionManager } from './connection-manager';

// Auto Connector
export { AutoConnector } from './auto-connector';
