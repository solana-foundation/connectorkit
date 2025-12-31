/**
 * Mobile Wallet Adapter Configuration Types
 *
 * These types are shared between headless and React implementations.
 * They do NOT import React or any TSX modules.
 */

import type {
    AuthorizationCache,
    ChainSelector,
    SolanaMobileWalletAdapterWallet,
} from '@solana-mobile/wallet-standard-mobile';
import type { IdentifierArray } from '@wallet-standard/base';

/**
 * Internal configuration used by registerMwa.
 * Defined here as the package doesn't export this type.
 */
export interface RegisterMwaConfig {
    appIdentity: {
        name: string;
        uri?: string;
        icon?: string;
    };
    authorizationCache: AuthorizationCache;
    chains: IdentifierArray;
    chainSelector: ChainSelector;
    remoteHostAuthority?: string;
    onWalletNotFound: (mobileWalletAdapter: SolanaMobileWalletAdapterWallet) => Promise<void>;
}

/**
 * Configuration options for Mobile Wallet Adapter integration.
 * Used to configure mobile wallet support in ConnectorProvider.
 */
export interface MobileWalletAdapterConfig {
    /** Application identity shown to users during authorization */
    appIdentity: {
        /** Display name of the application */
        name: string;
        /** URI of the application (optional) */
        uri?: string;
        /** Icon URL of the application (optional) */
        icon?: string;
    };
    /** Remote host authority for remote connections (optional) */
    remoteHostAuthority?: string;
    /** Solana chains to support (defaults to mainnet, devnet, testnet) */
    chains?: RegisterMwaConfig['chains'];
    /** Authorization cache implementation (optional, uses default if not provided) */
    authorizationCache?: AuthorizationCache;
    /** Chain selector implementation (optional, uses default if not provided) */
    chainSelector?: ChainSelector;
    /** Handler called when wallet app is not found (optional, uses default if not provided) */
    onWalletNotFound?: (wallet: SolanaMobileWalletAdapterWallet) => Promise<void>;
}
