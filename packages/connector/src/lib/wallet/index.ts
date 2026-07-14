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

// Kit wallet core (discovery + connection via @solana/kit-plugin-wallet)
export { KitWalletCore, applyWalletDisplayConfig, normalizeWalletChain } from './kit-wallet-core';

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
