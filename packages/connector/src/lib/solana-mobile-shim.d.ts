// Minimal ambient module to satisfy TS when the package types are unavailable during tooling
declare module '@solana-mobile/wallet-standard-mobile' {
  export const registerMwa: any
  export const createDefaultAuthorizationCache: any
  export const createDefaultChainSelector: any
  export const createDefaultWalletNotFoundHandler: any
  export const MWA_SOLANA_CHAINS: readonly string[]
}



