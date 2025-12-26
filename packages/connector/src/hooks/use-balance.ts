'use client';

import { useCallback, useMemo } from 'react';
import { useWalletAssets, type WalletAssetsData, type TokenAccountInfo } from './_internal/use-wallet-assets';
import { formatLamportsToSolSafe, formatBigIntBalance } from '../utils/formatting';
import type { SolanaClient } from '../lib/kit-utils';

export interface TokenBalance {
    /** Token mint address */
    mint: string;
    /** Token balance (in smallest unit) */
    amount: bigint;
    /** Token decimals */
    decimals: number;
    /** Formatted balance (human readable) */
    formatted: string;
    /** Token symbol if known */
    symbol?: string;
    /** Token name if known */
    name?: string;
    /** Token logo URL if known */
    logo?: string;
}

/**
 * Options for useBalance hook
 */
export interface UseBalanceOptions {
    /** Whether the hook is enabled (default: true) */
    enabled?: boolean;
    /** Whether to auto-refresh balance (default: true) */
    autoRefresh?: boolean;
    /** Refresh interval in milliseconds (default: 30000) */
    refreshInterval?: number;
    /** Time in ms to consider data fresh (default: 0) */
    staleTimeMs?: number;
    /** Time in ms to keep cache after unmount (default: 300000) */
    cacheTimeMs?: number;
    /** Whether to refetch on mount (default: 'stale') */
    refetchOnMount?: boolean | 'stale';
    /** Override the Solana client from provider */
    client?: SolanaClient | null;
}

export interface UseBalanceReturn {
    /** SOL balance in SOL (not lamports) */
    solBalance: number;
    /** SOL balance in lamports */
    lamports: bigint;
    /** Formatted SOL balance string */
    formattedSol: string;
    /** Token balances */
    tokens: TokenBalance[];
    /** Whether balance is loading */
    isLoading: boolean;
    /** Error if balance fetch failed */
    error: Error | null;
    /** Refetch balance, optionally with an abort signal */
    refetch: (options?: { signal?: AbortSignal }) => Promise<void>;
    /** Abort any in-flight balance fetch */
    abort: () => void;
    /** Last updated timestamp */
    lastUpdated: Date | null;
}

const LAMPORTS_PER_SOL = 1_000_000_000n;

/**
 * Format a token account into a TokenBalance (BigInt-safe)
 */
function formatTokenAccount(account: TokenAccountInfo): TokenBalance {
    const formatted = formatBigIntBalance(account.amount, account.decimals, {
        maxDecimals: Math.min(account.decimals, 6),
    });

    return {
        mint: account.mint,
        amount: account.amount,
        decimals: account.decimals,
        formatted,
    };
}

/** Selected data type for balance hook */
interface BalanceSelection {
    lamports: bigint;
    tokens: TokenBalance[];
}

/**
 * Select function to transform wallet assets into balance data
 */
function selectBalance(assets: WalletAssetsData | undefined): BalanceSelection {
    if (!assets) {
        return { lamports: 0n, tokens: [] };
    }

    // Filter to only non-zero balances and format
    const tokens = assets.tokenAccounts
        .filter(account => account.amount > 0n)
        .map(formatTokenAccount);

    return {
        lamports: assets.lamports,
        tokens,
    };
}

/**
 * Hook for fetching wallet balance (SOL and tokens).
 *
 * Features:
 * - Automatic request deduplication across components
 * - Shared data with useTokens (single RPC query)
 * - Token-2022 support
 * - Shared polling interval (ref-counted)
 * - Configurable auto-refresh behavior
 * - Abort support for in-flight requests
 * - Optional client override
 *
 * @example Basic usage
 * ```tsx
 * function Balance() {
 *   const { solBalance, formattedSol, isLoading } = useBalance();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   return <div>{formattedSol}</div>;
 * }
 * ```
 *
 * @example With options
 * ```tsx
 * function Balance() {
 *   const { formattedSol, refetch, abort } = useBalance({
 *     autoRefresh: false,  // Disable polling
 *     staleTimeMs: 10000,  // Consider data fresh for 10s
 *   });
 *
 *   return (
 *     <div>
 *       {formattedSol}
 *       <button onClick={() => refetch()}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With token balances
 * ```tsx
 * function TokenBalances() {
 *   const { tokens, isLoading } = useBalance();
 *
 *   return (
 *     <div>
 *       {tokens.map(token => (
 *         <div key={token.mint}>
 *           {token.symbol}: {token.formatted}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBalance(options: UseBalanceOptions = {}): UseBalanceReturn {
    const {
        enabled = true,
        autoRefresh = true,
        refreshInterval = 30000,
        staleTimeMs = 0,
        cacheTimeMs = 5 * 60 * 1000, // 5 minutes
        refetchOnMount = 'stale',
        client: clientOverride,
    } = options;

    // Use shared wallet assets with select for reduced rerenders
    const {
        data,
        error,
        isFetching,
        updatedAt,
        refetch: sharedRefetch,
        abort,
    } = useWalletAssets<BalanceSelection>({
        enabled,
        staleTimeMs,
        cacheTimeMs,
        refetchOnMount,
        refetchIntervalMs: autoRefresh ? refreshInterval : false,
        client: clientOverride,
        select: selectBalance,
    });

    const lamports = data?.lamports ?? 0n;
    const tokens = data?.tokens ?? [];

    const solBalance = useMemo(() => Number(lamports) / Number(LAMPORTS_PER_SOL), [lamports]);

    const formattedSol = useMemo(() => formatLamportsToSolSafe(lamports, { maxDecimals: 4, suffix: true }), [lamports]);

    // Preserve old behavior: don't surface "refresh failed" errors if we already have data
    const visibleError = updatedAt ? null : error;

    // Wrap refetch to match expected signature
    const refetch = useCallback(
        async (opts?: { signal?: AbortSignal }) => {
            await sharedRefetch(opts);
        },
        [sharedRefetch],
    );

    return useMemo(
        () => ({
            solBalance,
            lamports,
            formattedSol,
            tokens,
            isLoading: isFetching,
            error: visibleError,
            refetch,
            abort,
            lastUpdated: updatedAt ? new Date(updatedAt) : null,
        }),
        [solBalance, lamports, formattedSol, tokens, isFetching, visibleError, refetch, abort, updatedAt],
    );
}
