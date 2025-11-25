'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { address as toAddress } from '@solana/addresses';
import { useAccount } from './use-account';
import { useSolanaClient } from './use-kit-solana-client';

export interface Token {
    /** Token mint address */
    mint: string;
    /** Token account address */
    tokenAccount: string;
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
    /** Whether token is frozen */
    isFrozen: boolean;
    /** Owner address */
    owner: string;
}

export interface UseTokensOptions {
    /** Whether to include zero balance tokens */
    includeZeroBalance?: boolean;
    /** Whether to auto-refresh */
    autoRefresh?: boolean;
    /** Refresh interval in milliseconds */
    refreshInterval?: number;
}

export interface UseTokensReturn {
    /** List of tokens */
    tokens: Token[];
    /** Whether tokens are loading */
    isLoading: boolean;
    /** Error if fetch failed */
    error: Error | null;
    /** Refetch tokens */
    refetch: () => Promise<void>;
    /** Last updated timestamp */
    lastUpdated: Date | null;
    /** Total number of token accounts */
    totalAccounts: number;
}

/**
 * Hook for fetching wallet token holdings.
 * 
 * @example Basic usage
 * ```tsx
 * function TokenList() {
 *   const { tokens, isLoading } = useTokens();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   return (
 *     <div>
 *       {tokens.map(token => (
 *         <div key={token.mint}>
 *           {token.symbol || token.mint.slice(0, 8)}: {token.formatted}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTokens(options: UseTokensOptions = {}): UseTokensReturn {
    const {
        includeZeroBalance = false,
        autoRefresh = false,
        refreshInterval = 60000,
    } = options;
    
    const { address, connected } = useAccount();
    const client = useSolanaClient();
    
    const [tokens, setTokens] = useState<Token[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [totalAccounts, setTotalAccounts] = useState(0);
    
    // Extract the actual client to use as a stable dependency
    const rpcClient = client?.client ?? null;
    
    const fetchTokens = useCallback(async () => {
        if (!connected || !address || !rpcClient) {
            setTokens([]);
            setTotalAccounts(0);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const rpc = rpcClient.rpc;
            const walletAddress = toAddress(address);
            const tokenProgramId = toAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
            
            // Fetch token accounts
            const tokenAccountsResult = await rpc.getTokenAccountsByOwner(
                walletAddress,
                { programId: tokenProgramId },
                { encoding: 'jsonParsed' }
            ).send();
            
            const tokenList: Token[] = [];
            
            for (const account of tokenAccountsResult.value) {
                const parsed = account.account.data as any;
                if (parsed?.parsed?.info) {
                    const info = parsed.parsed.info;
                    const amount = BigInt(info.tokenAmount?.amount || '0');
                    const decimals = info.tokenAmount?.decimals || 0;
                    
                    // Skip zero balance tokens unless requested
                    if (!includeZeroBalance && amount === 0n) {
                        continue;
                    }
                    
                    const formatted = (Number(amount) / Math.pow(10, decimals)).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: Math.min(decimals, 6),
                    });
                    
                    tokenList.push({
                        mint: info.mint,
                        tokenAccount: account.pubkey,
                        amount,
                        decimals,
                        formatted,
                        isFrozen: info.state === 'frozen',
                        owner: info.owner,
                    });
                }
            }
            
            // Sort by amount (highest first)
            tokenList.sort((a, b) => {
                const aValue = Number(a.amount) / Math.pow(10, a.decimals);
                const bValue = Number(b.amount) / Math.pow(10, b.decimals);
                return bValue - aValue;
            });
            
            setTokens(tokenList);
            setTotalAccounts(tokenAccountsResult.value.length);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err as Error);
            console.error('Failed to fetch tokens:', err);
        } finally {
            setIsLoading(false);
        }
    }, [connected, address, rpcClient, includeZeroBalance]);
    
    // Fetch on mount and when dependencies change
    useEffect(() => {
        fetchTokens();
    }, [fetchTokens]);
    
    // Auto-refresh
    useEffect(() => {
        if (!connected || !autoRefresh) return;
        
        const interval = setInterval(fetchTokens, refreshInterval);
        return () => clearInterval(interval);
    }, [connected, autoRefresh, refreshInterval, fetchTokens]);
    
    return useMemo(() => ({
        tokens,
        isLoading,
        error,
        refetch: fetchTokens,
        lastUpdated,
        totalAccounts,
    }), [tokens, isLoading, error, fetchTokens, lastUpdated, totalAccounts]);
}

