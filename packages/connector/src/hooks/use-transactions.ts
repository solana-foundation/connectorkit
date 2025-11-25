'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { address as toAddress } from '@solana/addresses';
import { signature as toSignature } from '@solana/keys';
import { useAccount } from './use-account';
import { useCluster } from './use-cluster';
import { useSolanaClient } from './use-kit-solana-client';
import { getTransactionUrl } from '../utils/cluster';

export interface TransactionInfo {
    /** Transaction signature */
    signature: string;
    /** Block time (unix timestamp) */
    blockTime: number | null;
    /** Slot number */
    slot: number;
    /** Transaction status */
    status: 'success' | 'failed';
    /** Error message if failed */
    error?: string;
    /** Transaction type (if detected) */
    type?: 'transfer' | 'swap' | 'nft' | 'stake' | 'unknown';
    /** Formatted date string */
    formattedDate: string;
    /** Formatted time string */
    formattedTime: string;
    /** Explorer URL */
    explorerUrl: string;
}

export interface UseTransactionsOptions {
    /** Number of transactions to fetch */
    limit?: number;
    /** Whether to auto-refresh */
    autoRefresh?: boolean;
    /** Refresh interval in milliseconds */
    refreshInterval?: number;
}

export interface UseTransactionsReturn {
    /** List of transactions */
    transactions: TransactionInfo[];
    /** Whether transactions are loading */
    isLoading: boolean;
    /** Error if fetch failed */
    error: Error | null;
    /** Whether there are more transactions to load */
    hasMore: boolean;
    /** Load more transactions */
    loadMore: () => Promise<void>;
    /** Refetch transactions */
    refetch: () => Promise<void>;
    /** Last updated timestamp */
    lastUpdated: Date | null;
}

function formatDate(timestamp: number | null): { date: string; time: string } {
    if (!timestamp) {
        return { date: 'Unknown', time: '' };
    }
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    let formattedDate: string;
    if (diffDays === 0) {
        formattedDate = 'Today';
    } else if (diffDays === 1) {
        formattedDate = 'Yesterday';
    } else if (diffDays < 7) {
        formattedDate = `${diffDays} days ago`;
    } else {
        formattedDate = date.toLocaleDateString();
    }
    
    const formattedTime = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });
    
    return { date: formattedDate, time: formattedTime };
}

/**
 * Hook for fetching wallet transaction history.
 * 
 * @example Basic usage
 * ```tsx
 * function TransactionList() {
 *   const { transactions, isLoading } = useTransactions({ limit: 10 });
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   return (
 *     <div>
 *       {transactions.map(tx => (
 *         <div key={tx.signature}>
 *           {tx.status} - {tx.formattedDate}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTransactions(options: UseTransactionsOptions = {}): UseTransactionsReturn {
    const {
        limit = 10,
        autoRefresh = false,
        refreshInterval = 60000,
    } = options;
    
    const { address, connected } = useAccount();
    const { cluster } = useCluster();
    const client = useSolanaClient();
    
    const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [beforeSignature, setBeforeSignature] = useState<string | undefined>(undefined);
    
    // Extract the actual client to use as a stable dependency
    const rpcClient = client?.client ?? null;
    
    const fetchTransactions = useCallback(async (loadMore = false) => {
        if (!connected || !address || !rpcClient || !cluster) {
            setTransactions([]);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const rpc = rpcClient.rpc;
            const walletAddress = toAddress(address);
            
            const signaturesResult = await rpc.getSignaturesForAddress(
                walletAddress,
                {
                    limit,
                    ...(loadMore && beforeSignature ? { before: toSignature(beforeSignature) } : {}),
                }
            ).send();
            
            const newTransactions: TransactionInfo[] = signaturesResult.map(sig => {
                const blockTimeNum = sig.blockTime ? Number(sig.blockTime) : null;
                const { date, time } = formatDate(blockTimeNum);
                
                return {
                    signature: String(sig.signature),
                    blockTime: blockTimeNum,
                    slot: Number(sig.slot),
                    status: sig.err ? 'failed' as const : 'success' as const,
                    error: sig.err ? JSON.stringify(sig.err) : undefined,
                    type: 'unknown' as const,
                    formattedDate: date,
                    formattedTime: time,
                    explorerUrl: getTransactionUrl(String(sig.signature), cluster),
                };
            });
            
            if (loadMore) {
                setTransactions(prev => [...prev, ...newTransactions]);
            } else {
                setTransactions(newTransactions);
            }
            
            // Update pagination
            if (newTransactions.length > 0) {
                setBeforeSignature(newTransactions[newTransactions.length - 1].signature);
            }
            setHasMore(newTransactions.length === limit);
            
            setLastUpdated(new Date());
        } catch (err) {
            setError(err as Error);
            console.error('Failed to fetch transactions:', err);
        } finally {
            setIsLoading(false);
        }
    }, [connected, address, rpcClient, cluster, limit, beforeSignature]);
    
    const refetch = useCallback(async () => {
        setBeforeSignature(undefined);
        await fetchTransactions(false);
    }, [fetchTransactions]);
    
    const loadMore = useCallback(async () => {
        if (hasMore && !isLoading) {
            await fetchTransactions(true);
        }
    }, [hasMore, isLoading, fetchTransactions]);
    
    // Fetch on mount and when dependencies change
    useEffect(() => {
        setBeforeSignature(undefined);
        fetchTransactions(false);
    }, [connected, address, cluster]);
    
    // Auto-refresh
    useEffect(() => {
        if (!connected || !autoRefresh) return;
        
        const interval = setInterval(refetch, refreshInterval);
        return () => clearInterval(interval);
    }, [connected, autoRefresh, refreshInterval, refetch]);
    
    return useMemo(() => ({
        transactions,
        isLoading,
        error,
        hasMore,
        loadMore,
        refetch,
        lastUpdated,
    }), [transactions, isLoading, error, hasMore, loadMore, refetch, lastUpdated]);
}

