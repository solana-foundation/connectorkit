/**
 * @solana/connector - Kit Constants
 *
 * Core Solana constants used throughout the connector.
 * These match the values from @solana/kit ecosystem.
 */

/** 1 billion lamports per SOL */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Convert lamports to SOL
 *
 * @deprecated Use `lamportsToSol` from `@solana/kit` instead. Note the kit
 * version operates on branded `Lamports` input and returns an exact
 * fixed-point `Sol` value rather than a lossy `number`.
 *
 * @param lamports - Amount in lamports
 * @returns Amount in SOL
 */
export function lamportsToSol(lamports: number | bigint): number {
    return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 *
 * @deprecated Use `solToLamports` from `@solana/kit` instead. Note the kit
 * version operates on an exact fixed-point `Sol` value (see kit's `sol()`
 * helper) and returns branded `Lamports`.
 *
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}
