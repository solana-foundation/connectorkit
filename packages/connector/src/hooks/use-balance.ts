'use client';

import { useCallback, useMemo } from 'react';
import { address as toAddress } from '@solana/addresses';
import { useAccount } from './use-account';
import { useSolanaClient } from './use-kit-solana-client';
import { useSharedQuery } from './_internal/use-shared-query';
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

function formatSol(lamports: bigint, decimals: number = 4): string {
    const sol = Number(lamports) / Number(LAMPORTS_PER_SOL);
    return (
        sol.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
        }) + ' SOL'
    );
}

/** Internal data structure for balance query */
interface BalanceData {
    lamports: bigint;
    tokens: TokenBalance[];
}

/**
 * Hook for fetching wallet balance (SOL and tokens).
 *
 * Features:
 * - Automatic request deduplication across components
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
    const { address, connected } = useAccount();
    const { client: providerClient } = useSolanaClient();

    const {
        enabled = true,
        autoRefresh = true,
        refreshInterval = 30000,
        staleTimeMs = 0,
        cacheTimeMs = 5 * 60 * 1000, // 5 minutes
        refetchOnMount = 'stale',
        client: clientOverride,
    } = options;

    // Use override client if provided, otherwise use provider client
    const rpcClient = clientOverride ?? providerClient;

    // Generate cache key based on RPC URL and address
    const key = useMemo(() => {
        if (!enabled || !connected || !address || !rpcClient) return null;
        const rpcUrl =
            rpcClient.urlOrMoniker instanceof URL
                ? rpcClient.urlOrMoniker.toString()
                : String(rpcClient.urlOrMoniker);
        return JSON.stringify(['wallet-balance', rpcUrl, address]);
    }, [enabled, connected, address, rpcClient]);

    // Query function that fetches SOL balance and token accounts
    const queryFn = useCallback(
        async (signal: AbortSignal): Promise<BalanceData> => {
            if (!connected || !address || !rpcClient) {
                return { lamports: 0n, tokens: [] };
            }

            // Throw on abort - fetchSharedQuery will preserve previous data
            if (signal.aborted) {
                throw new DOMException('Query aborted', 'AbortError');
            }

            const rpc = rpcClient.rpc;
            const walletAddress = toAddress(address);

            // Fetch SOL balance
            const balanceResult = await rpc.getBalance(walletAddress).send();

            // Throw on abort - fetchSharedQuery will preserve previous data
            if (signal.aborted) {
                throw new DOMException('Query aborted', 'AbortError');
            }

            // Fetch token accounts
            let tokens: TokenBalance[] = [];
            try {
                const tokenProgramId = toAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
                const tokenAccountsResult = await rpc
                    .getTokenAccountsByOwner(walletAddress, { programId: tokenProgramId }, { encoding: 'jsonParsed' })
                    .send();

                // Throw on abort - fetchSharedQuery will preserve previous data
                if (signal.aborted) {
                    throw new DOMException('Query aborted', 'AbortError');
                }

                const tokenBalances: TokenBalance[] = [];

                for (const account of tokenAccountsResult.value) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data = account.account.data as any;
                    if (data?.parsed?.info) {
                        const info = data.parsed.info;
                        const amount = BigInt(info.tokenAmount?.amount || '0');
                        const decimals = info.tokenAmount?.decimals || 0;
                        const formatted = (Number(amount) / Math.pow(10, decimals)).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: Math.min(decimals, 6),
                        });

                        if (amount > 0n) {
                            tokenBalances.push({
                                mint: info.mint,
                                amount,
                                decimals,
                                formatted,
                            });
                        }
                    }
                }

                tokens = tokenBalances;
            } catch (tokenError) {
                // Token fetch failed but SOL balance succeeded
                console.warn('Failed to fetch token balances:', tokenError);
                tokens = [];
            }

            return { lamports: balanceResult.value, tokens };
        },
        [connected, address, rpcClient],
    );

    // Use shared query for deduplication and caching
    const {
        data,
        error,
        isFetching,
        updatedAt,
        refetch: sharedRefetch,
        abort,
    } = useSharedQuery<BalanceData>(key, queryFn, {
        enabled,
        staleTimeMs,
        cacheTimeMs,
        refetchOnMount,
        refetchIntervalMs: autoRefresh ? refreshInterval : false,
    });

    const lamports = data?.lamports ?? 0n;
    const tokens = data?.tokens ?? [];

    const solBalance = useMemo(() => Number(lamports) / Number(LAMPORTS_PER_SOL), [lamports]);

    const formattedSol = useMemo(() => formatSol(lamports), [lamports]);

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
