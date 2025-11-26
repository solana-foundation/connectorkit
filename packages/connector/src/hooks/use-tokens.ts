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
    /** USD price if available */
    usdPrice?: number;
    /** Formatted USD value */
    formattedUsd?: string;
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
    /** Fetch metadata (name, symbol, logo) from Jupiter */
    fetchMetadata?: boolean;
    /** Include native SOL balance */
    includeNativeSol?: boolean;
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

// Jupiter token metadata response
interface JupiterTokenMetadata {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    icon: string;
    usdPrice: number;
}

// Native SOL mint address
const NATIVE_MINT = 'So11111111111111111111111111111111111111112';

// Cache for metadata (to avoid refetching)
const metadataCache = new Map<string, JupiterTokenMetadata>();

/**
 * Fetch token metadata from Jupiter's lite API
 * This API is fast and includes icons + USD prices
 */
async function fetchJupiterMetadata(mints: string[]): Promise<Map<string, JupiterTokenMetadata>> {
    const results = new Map<string, JupiterTokenMetadata>();
    
    if (mints.length === 0) return results;
    
    // Check cache first
    const uncachedMints: string[] = [];
    for (const mint of mints) {
        const cached = metadataCache.get(mint);
        if (cached) {
            results.set(mint, cached);
        } else {
            uncachedMints.push(mint);
        }
    }
    
    // If all mints are cached, return early
    if (uncachedMints.length === 0) return results;
    
    try {
        const url = new URL('https://lite-api.jup.ag/tokens/v2/search');
        url.searchParams.append('query', uncachedMints.join(','));
        
        const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(10000),
        });
        
        if (!response.ok) {
            throw new Error(`Jupiter API error: ${response.status}`);
        }
        
        const items: JupiterTokenMetadata[] = await response.json();
        
        for (const item of items) {
            const metadata: JupiterTokenMetadata = {
                id: item.id,
                name: item.id === NATIVE_MINT ? 'Solana' : item.name,
                symbol: item.symbol,
                decimals: item.decimals,
                icon: item.icon,
                usdPrice: item.usdPrice,
            };
            
            results.set(item.id, metadata);
            metadataCache.set(item.id, metadata);
        }
    } catch (error) {
        console.warn('[useTokens] Jupiter API failed:', error);
    }
    
    return results;
}

/**
 * Format balance for display
 */
function formatBalance(amount: bigint, decimals: number): string {
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.min(decimals, 6),
    });
}

/**
 * Format USD value for display
 */
function formatUsd(amount: bigint, decimals: number, usdPrice: number): string {
    const value = (Number(amount) / Math.pow(10, decimals)) * usdPrice;
    return value.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Hook for fetching wallet token holdings.
 * Fetches metadata (name, symbol, icon, USD price) from Jupiter's API.
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
 *           <img src={token.logo} />
 *           {token.symbol}: {token.formatted}
 *           {token.formattedUsd && <span>({token.formattedUsd})</span>}
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
        fetchMetadata = true,
        includeNativeSol = true,
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
            
            // Fetch SOL balance and token accounts in parallel
            const [balanceResult, tokenAccountsResult] = await Promise.all([
                includeNativeSol ? rpc.getBalance(walletAddress).send() : Promise.resolve(null),
                rpc.getTokenAccountsByOwner(
                    walletAddress,
                    { programId: tokenProgramId },
                    { encoding: 'jsonParsed' }
                ).send(),
            ]);
            
            const tokenList: Token[] = [];
            const mints: string[] = [];
            
            // Add native SOL if requested
            if (includeNativeSol && balanceResult !== null) {
                const solBalance = balanceResult.value;
                if (includeZeroBalance || solBalance > 0n) {
                    tokenList.push({
                        mint: NATIVE_MINT,
                        tokenAccount: address, // SOL uses wallet address
                        amount: solBalance,
                        decimals: 9,
                        formatted: formatBalance(solBalance, 9),
                        isFrozen: false,
                        owner: address,
                    });
                    mints.push(NATIVE_MINT);
                }
            }
            
            // Add SPL tokens
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
                    
                    tokenList.push({
                        mint: info.mint,
                        tokenAccount: account.pubkey,
                        amount,
                        decimals,
                        formatted: formatBalance(amount, decimals),
                        isFrozen: info.state === 'frozen',
                        owner: info.owner,
                    });
                    
                    mints.push(info.mint);
                }
            }
            
            // Set initial tokens immediately so UI is responsive
            setTokens([...tokenList]);
            setTotalAccounts(tokenAccountsResult.value.length + (includeNativeSol ? 1 : 0));
            setLastUpdated(new Date());
            
            // Fetch metadata from Jupiter
            if (fetchMetadata && mints.length > 0) {
                const metadata = await fetchJupiterMetadata(mints);
                
                // Apply metadata to tokens
                for (let i = 0; i < tokenList.length; i++) {
                    const meta = metadata.get(tokenList[i].mint);
                    if (meta) {
                        tokenList[i] = {
                            ...tokenList[i],
                            name: meta.name,
                            symbol: meta.symbol,
                            logo: meta.icon,
                            usdPrice: meta.usdPrice,
                            formattedUsd: formatUsd(tokenList[i].amount, tokenList[i].decimals, meta.usdPrice),
                        };
                    }
                }
                
                // Sort by USD value (highest first), tokens with metadata first
                tokenList.sort((a, b) => {
                    // Tokens with metadata come first
                    const metadataSort = (b.logo ? 1 : 0) - (a.logo ? 1 : 0);
                    if (metadataSort !== 0) return metadataSort;
                    
                    // Then sort by USD value
                    const aValue = (Number(a.amount) / Math.pow(10, a.decimals)) * (a.usdPrice ?? 0);
                    const bValue = (Number(b.amount) / Math.pow(10, b.decimals)) * (b.usdPrice ?? 0);
                    return bValue - aValue;
                });
                
                setTokens([...tokenList]);
            }
        } catch (err) {
            setError(err as Error);
            console.error('[useTokens] Failed to fetch tokens:', err);
        } finally {
            setIsLoading(false);
        }
    }, [connected, address, rpcClient, includeZeroBalance, fetchMetadata, includeNativeSol]);
    
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
