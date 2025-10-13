// Minimal ambient module to satisfy TS when the package types are unavailable during tooling
declare module '@solana-mobile/wallet-standard-mobile' {
    export const registerMwa: (...args: unknown[]) => void;
    export const createDefaultAuthorizationCache: () => unknown;
    export const createDefaultChainSelector: () => unknown;
    export const createDefaultWalletNotFoundHandler: () => (wallet: unknown) => Promise<void>;
    export const MWA_SOLANA_CHAINS: readonly string[];
}
