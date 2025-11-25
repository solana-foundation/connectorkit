/**
 * @solana/connector - Kit Constants
 *
 * Core Solana constants used throughout the connector.
 * These match the values from @solana/kit ecosystem.
 */

/** 1 billion lamports per SOL */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Genesis hash for Solana network clusters
 */
export const GENESIS_HASH = {
    mainnet: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
    devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
    testnet: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY',
} as const;

/**
 * Convert lamports to SOL
 * @param lamports - Amount in lamports
 * @returns Amount in SOL
 */
export function lamportsToSol(lamports: number | bigint): number {
    return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}




