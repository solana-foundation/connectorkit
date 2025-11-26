'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { address as toAddress } from '@solana/addresses';
import { useAccount } from './use-account';
import { useCluster } from './use-cluster';
import { useSolanaClient } from './use-kit-solana-client';

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
    /** Refetch balance */
    refetch: () => Promise<void>;
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

/**
 * Hook for fetching wallet balance (SOL and tokens).
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
export function useBalance(): UseBalanceReturn {
    const { address, connected } = useAccount();
    const { cluster } = useCluster();
    const client = useSolanaClient();

    const [lamports, setLamports] = useState<bigint>(0n);
    const [tokens, setTokens] = useState<TokenBalance[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Extract the actual client to use as a stable dependency
    const rpcClient = client?.client ?? null;

    const fetchBalance = useCallback(async () => {
        if (!connected || !address || !rpcClient) {
            setLamports(0n);
            setTokens([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Fetch SOL balance using the Kit client
            const rpc = rpcClient.rpc;
            const walletAddress = toAddress(address);

            // Get SOL balance
            const balanceResult = await rpc.getBalance(walletAddress).send();
            setLamports(balanceResult.value);

            // Fetch token accounts
            try {
                const tokenProgramId = toAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
                const tokenAccountsResult = await rpc
                    .getTokenAccountsByOwner(walletAddress, { programId: tokenProgramId }, { encoding: 'jsonParsed' })
                    .send();

                const tokenBalances: TokenBalance[] = [];

                for (const account of tokenAccountsResult.value) {
                    const parsed = account.account.data as any;
                    if (parsed?.parsed?.info) {
                        const info = parsed.parsed.info;
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

                setTokens(tokenBalances);
            } catch (tokenError) {
                // Token fetch failed but SOL balance succeeded
                console.warn('Failed to fetch token balances:', tokenError);
                setTokens([]);
            }

            setLastUpdated(new Date());
        } catch (err) {
            setError(err as Error);
            console.error('Failed to fetch balance:', err);
        } finally {
            setIsLoading(false);
        }
    }, [connected, address, rpcClient]);

    // Fetch on mount and when dependencies change
    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    // Auto-refresh every 30 seconds when connected
    useEffect(() => {
        if (!connected) return;

        const interval = setInterval(fetchBalance, 30000);
        return () => clearInterval(interval);
    }, [connected, fetchBalance]);

    const solBalance = useMemo(() => Number(lamports) / Number(LAMPORTS_PER_SOL), [lamports]);

    const formattedSol = useMemo(() => formatSol(lamports), [lamports]);

    return useMemo(
        () => ({
            solBalance,
            lamports,
            formattedSol,
            tokens,
            isLoading,
            error,
            refetch: fetchBalance,
            lastUpdated,
        }),
        [solBalance, lamports, formattedSol, tokens, isLoading, error, fetchBalance, lastUpdated],
    );
}
