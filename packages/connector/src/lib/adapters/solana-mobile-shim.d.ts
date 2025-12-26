// Minimal ambient module to satisfy TS when the package types are unavailable during tooling
declare module '@solana-mobile/wallet-standard-mobile' {
    import type { IdentifierArray, IdentifierString, Wallet } from '@wallet-standard/base';

    /** Authorization result with chain and capabilities */
    export interface Authorization {
        readonly chain: IdentifierString;
        readonly capabilities: unknown;
        [key: string]: unknown;
    }

    /** Cache for storing and retrieving authorization state */
    export interface AuthorizationCache {
        clear(): Promise<void>;
        get(): Promise<Authorization | undefined>;
        set(authorization: Authorization): Promise<void>;
    }

    /** Selector for choosing which chain to use */
    export interface ChainSelector {
        select(chains: IdentifierArray): Promise<IdentifierString>;
    }

    /** Mobile Wallet Adapter wallet interface */
    export interface SolanaMobileWalletAdapterWallet extends Wallet {
        url: string;
    }

    /** Configuration for registerMwa */
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

    export function registerMwa(config: RegisterMwaConfig): void;
    export function createDefaultAuthorizationCache(): AuthorizationCache;
    export function createDefaultChainSelector(): ChainSelector;
    export function createDefaultWalletNotFoundHandler(): (
        mobileWalletAdapter: SolanaMobileWalletAdapterWallet,
    ) => Promise<void>;
}
