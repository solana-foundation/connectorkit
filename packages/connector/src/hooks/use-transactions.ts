'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { address as toAddress } from '@solana/addresses';
import { signature as toSignature } from '@solana/keys';
import { useAccount } from './use-account';
import { useCluster } from './use-cluster';
import { useSolanaClient } from './use-kit-solana-client';
import { getTransactionUrl } from '../utils/cluster';
import { LAMPORTS_PER_SOL } from '../lib/kit-utils';

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
    type: 'sent' | 'received' | 'swap' | 'nft' | 'stake' | 'program' | 'unknown';
    /** Direction for transfers */
    direction?: 'in' | 'out';
    /** Amount in SOL (for transfers) */
    amount?: number;
    /** Formatted amount string */
    formattedAmount?: string;
    /** Token mint address (for token transfers) */
    tokenMint?: string;
    /** Token symbol (if known) */
    tokenSymbol?: string;
    /** Token icon URL (if known) */
    tokenIcon?: string;
    /** Counterparty address (who you sent to or received from) */
    counterparty?: string;
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
    /** Fetch full transaction details (slower but more info) */
    fetchDetails?: boolean;
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

// Known program IDs for detection
const KNOWN_PROGRAMS: Record<string, string> = {
    '11111111111111111111111111111111': 'System Program',
    TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: 'Token Program',
    ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: 'Associated Token',
    JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 'Jupiter',
    whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Orca Whirlpool',
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
    Stake11111111111111111111111111111111111111: 'Stake Program',
    metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: 'Metaplex',
};

// Cache for token metadata
const tokenMetadataCache = new Map<string, { symbol: string; icon: string }>();

/**
 * Fetch token metadata from Jupiter for transaction display
 */
async function fetchTokenMetadata(mints: string[]): Promise<Map<string, { symbol: string; icon: string }>> {
    const results = new Map<string, { symbol: string; icon: string }>();
    if (mints.length === 0) return results;

    // Check cache
    const uncachedMints: string[] = [];
    for (const mint of mints) {
        const cached = tokenMetadataCache.get(mint);
        if (cached) {
            results.set(mint, cached);
        } else {
            uncachedMints.push(mint);
        }
    }

    if (uncachedMints.length === 0) return results;

    try {
        const url = new URL('https://lite-api.jup.ag/tokens/v2/search');
        url.searchParams.append('query', uncachedMints.join(','));

        const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) return results;

        const items: Array<{ id: string; symbol: string; icon: string }> = await response.json();

        for (const item of items) {
            const metadata = { symbol: item.symbol, icon: item.icon };
            results.set(item.id, metadata);
            tokenMetadataCache.set(item.id, metadata);
        }
    } catch (error) {
        console.warn('[useTransactions] Failed to fetch token metadata:', error);
    }

    return results;
}

/**
 * Hook for fetching wallet transaction history.
 * Parses transactions to detect type (sent/received/swap) and amounts.
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
 *           {tx.type} {tx.formattedAmount} - {tx.formattedDate}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTransactions(options: UseTransactionsOptions = {}): UseTransactionsReturn {
    const { limit = 10, autoRefresh = false, refreshInterval = 60000, fetchDetails = true } = options;

    const { address, connected } = useAccount();
    const { cluster } = useCluster();
    const client = useSolanaClient();

    const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [beforeSignature, setBeforeSignature] = useState<string | undefined>(undefined);
    const beforeSignatureRef = useRef<string | undefined>(undefined);

    // Extract the actual client to use as a stable dependency
    const rpcClient = client?.client ?? null;

    const parseTransaction = useCallback(
        (
            tx: any,
            walletAddress: string,
            sig: string,
            blockTime: number | null,
            slot: number,
            err: any,
            explorerUrl: string,
        ): TransactionInfo => {
            const { date, time } = formatDate(blockTime);

            const baseInfo: TransactionInfo = {
                signature: sig,
                blockTime,
                slot,
                status: err ? 'failed' : 'success',
                error: err ? JSON.stringify(err) : undefined,
                type: 'unknown',
                formattedDate: date,
                formattedTime: time,
                explorerUrl,
            };

            if (!tx?.meta || !tx?.transaction) {
                return baseInfo;
            }

            try {
                const meta = tx.meta;
                const message = tx.transaction.message;

                // Get account keys
                const accountKeys: string[] =
                    message.accountKeys?.map((k: any) => (typeof k === 'string' ? k : k.pubkey)) || [];

                // Find wallet index
                const walletIndex = accountKeys.findIndex((key: string) => key.trim() === walletAddress.trim());

                if (walletIndex === -1) {
                    return baseInfo;
                }

                // Calculate SOL balance change
                const preBalance = meta.preBalances?.[walletIndex] || 0;
                const postBalance = meta.postBalances?.[walletIndex] || 0;
                const balanceChange = Number(postBalance) - Number(preBalance);
                const solChange = balanceChange / LAMPORTS_PER_SOL;

                // Detect transaction type based on programs involved
                const programIds = new Set(
                    (message.instructions || [])
                        .map((ix: any) => accountKeys[ix.programIdIndex] || ix.programId)
                        .filter(Boolean),
                );

                // Check for known programs
                const hasJupiter = programIds.has('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
                const hasOrca = programIds.has('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');
                const hasRaydium = programIds.has('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
                const hasStake = programIds.has('Stake11111111111111111111111111111111111111');
                const hasMetaplex = programIds.has('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
                const hasSystemProgram = programIds.has('11111111111111111111111111111111');
                const hasTokenProgram = programIds.has('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

                // Determine type
                let type: TransactionInfo['type'] = 'unknown';
                let direction: 'in' | 'out' | undefined;
                let counterparty: string | undefined;
                let tokenMint: string | undefined;
                let tokenAmount: number | undefined;
                let tokenDecimals: number | undefined;
                let tokenSymbol: string | undefined;

                if (hasJupiter || hasOrca || hasRaydium) {
                    type = 'swap';
                } else if (hasStake) {
                    type = 'stake';
                } else if (hasMetaplex) {
                    type = 'nft';
                } else if (hasSystemProgram && Math.abs(balanceChange) > 0) {
                    // Simple SOL transfer
                    if (balanceChange > 0) {
                        type = 'received';
                        direction = 'in';
                    } else {
                        type = 'sent';
                        direction = 'out';
                    }
                    // SOL is native, use wrapped SOL mint for icon
                    tokenMint = 'So11111111111111111111111111111111111111112';

                    // Try to find counterparty
                    if (accountKeys.length >= 2) {
                        counterparty = accountKeys.find(
                            (key: string, idx: number) =>
                                idx !== walletIndex && key !== '11111111111111111111111111111111',
                        );
                    }
                } else if (hasTokenProgram) {
                    // Token transfer - check token balance changes
                    const preTokenBalances = meta.preTokenBalances || [];
                    const postTokenBalances = meta.postTokenBalances || [];

                    // Find token balances for our wallet
                    const ourPreTokens = preTokenBalances.filter(
                        (b: any) =>
                            accountKeys[b.accountIndex]?.trim() === walletAddress.trim() ||
                            b.owner?.trim() === walletAddress.trim(),
                    );
                    const ourPostTokens = postTokenBalances.filter(
                        (b: any) =>
                            accountKeys[b.accountIndex]?.trim() === walletAddress.trim() ||
                            b.owner?.trim() === walletAddress.trim(),
                    );

                    // Check all token balance changes
                    const allMints = new Set([
                        ...ourPreTokens.map((b: any) => b.mint),
                        ...ourPostTokens.map((b: any) => b.mint),
                    ]);

                    for (const mint of allMints) {
                        const preBal = ourPreTokens.find((b: any) => b.mint === mint);
                        const postBal = ourPostTokens.find((b: any) => b.mint === mint);

                        const preAmount = Number(preBal?.uiTokenAmount?.amount || 0);
                        const postAmount = Number(postBal?.uiTokenAmount?.amount || 0);
                        const change = postAmount - preAmount;

                        if (change !== 0) {
                            tokenMint = mint as string;
                            const decimals = postBal?.uiTokenAmount?.decimals || preBal?.uiTokenAmount?.decimals || 0;
                            tokenDecimals = decimals;
                            tokenAmount = Math.abs(change) / Math.pow(10, decimals);

                            if (change > 0) {
                                type = 'received';
                                direction = 'in';
                            } else {
                                type = 'sent';
                                direction = 'out';
                            }
                            break; // Use first significant change
                        }
                    }

                    // If no change detected but tokens involved, mark as received for new accounts
                    if (!tokenMint && ourPostTokens.length > ourPreTokens.length) {
                        type = 'received';
                        direction = 'in';
                        const newToken = ourPostTokens.find(
                            (b: any) => !ourPreTokens.some((p: any) => p.mint === b.mint),
                        );
                        if (newToken) {
                            tokenMint = newToken.mint;
                            const decimals = newToken.uiTokenAmount?.decimals || 0;
                            tokenDecimals = decimals;
                            tokenAmount = Number(newToken.uiTokenAmount?.amount || 0) / Math.pow(10, decimals);
                        }
                    }
                } else if (programIds.size > 0) {
                    type = 'program';
                }

                // Format amount string
                let formattedAmount: string | undefined;
                if (tokenAmount !== undefined && tokenDecimals !== undefined) {
                    const sign = direction === 'in' ? '+' : '-';
                    const maxDecimals = Math.min(tokenDecimals ?? 6, 6);
                    formattedAmount = `${sign}${tokenAmount.toLocaleString(undefined, { maximumFractionDigits: maxDecimals })}`;
                } else if (solChange !== 0) {
                    formattedAmount = `${solChange > 0 ? '+' : ''}${solChange.toFixed(4)} SOL`;
                }

                return {
                    ...baseInfo,
                    type,
                    direction,
                    amount: tokenAmount ?? Math.abs(solChange),
                    formattedAmount,
                    tokenMint,
                    tokenSymbol,
                    counterparty: counterparty ? `${counterparty.slice(0, 4)}...${counterparty.slice(-4)}` : undefined,
                };
            } catch (parseError) {
                console.warn('Failed to parse transaction:', parseError);
                return baseInfo;
            }
        },
        [],
    );

    const fetchTransactions = useCallback(
        async (loadMore = false) => {
            if (!connected || !address || !rpcClient || !cluster) {
                setTransactions([]);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const rpc = rpcClient.rpc;
                const walletAddress = toAddress(address);

                const signaturesResult = await rpc
                    .getSignaturesForAddress(walletAddress, {
                        limit,
                        ...(loadMore && beforeSignature ? { before: toSignature(beforeSignature) } : {}),
                    })
                    .send();

                let newTransactions: TransactionInfo[];

                if (fetchDetails && signaturesResult.length > 0) {
                    // Fetch full transaction details in parallel
                    const txPromises = signaturesResult.map(s =>
                        rpc
                            .getTransaction(toSignature(String(s.signature)), {
                                encoding: 'jsonParsed',
                                maxSupportedTransactionVersion: 0,
                            })
                            .send()
                            .catch(() => null),
                    );

                    const txDetails = await Promise.all(txPromises);

                    newTransactions = signaturesResult.map((sig, idx) => {
                        const blockTimeNum = sig.blockTime ? Number(sig.blockTime) : null;
                        const tx = txDetails[idx];

                        return parseTransaction(
                            tx,
                            address,
                            String(sig.signature),
                            blockTimeNum,
                            Number(sig.slot),
                            sig.err,
                            getTransactionUrl(String(sig.signature), cluster),
                        );
                    });
                } else {
                    // Basic info only
                    newTransactions = signaturesResult.map(sig => {
                        const blockTimeNum = sig.blockTime ? Number(sig.blockTime) : null;
                        const { date, time } = formatDate(blockTimeNum);

                        return {
                            signature: String(sig.signature),
                            blockTime: blockTimeNum,
                            slot: Number(sig.slot),
                            status: sig.err ? ('failed' as const) : ('success' as const),
                            error: sig.err ? JSON.stringify(sig.err) : undefined,
                            type: 'unknown' as const,
                            formattedDate: date,
                            formattedTime: time,
                            explorerUrl: getTransactionUrl(String(sig.signature), cluster),
                        };
                    });
                }

                // Set transactions immediately for fast UI
                if (loadMore) {
                    setTransactions(prev => [...prev, ...newTransactions]);
                } else {
                    setTransactions(newTransactions);
                }

                // Fetch token metadata for transactions that have token mints
                const mintsToFetch = [...new Set(newTransactions.filter(tx => tx.tokenMint).map(tx => tx.tokenMint!))];

                if (mintsToFetch.length > 0) {
                    const tokenMetadata = await fetchTokenMetadata(mintsToFetch);

                    // Update transactions with token metadata
                    if (tokenMetadata.size > 0) {
                        const enrichedTransactions = newTransactions.map(tx => {
                            if (tx.tokenMint && tokenMetadata.has(tx.tokenMint)) {
                                const meta = tokenMetadata.get(tx.tokenMint)!;
                                return {
                                    ...tx,
                                    tokenSymbol: meta.symbol,
                                    tokenIcon: meta.icon,
                                    // Update formatted amount with symbol
                                    formattedAmount: tx.formattedAmount
                                        ? `${tx.formattedAmount} ${meta.symbol}`
                                        : tx.formattedAmount,
                                };
                            }
                            return tx;
                        });

                        if (loadMore) {
                            setTransactions(prev => {
                                // Replace only the newly loaded transactions
                                const oldTransactions = prev.slice(0, -newTransactions.length);
                                return [...oldTransactions, ...enrichedTransactions];
                            });
                        } else {
                            setTransactions(enrichedTransactions);
                        }
                    }
                }

            // Update pagination
            if (newTransactions.length > 0) {
                const newBeforeSignature = newTransactions[newTransactions.length - 1].signature;
                setBeforeSignature(newBeforeSignature);
                beforeSignatureRef.current = newBeforeSignature;
            }
            setHasMore(newTransactions.length === limit);

                setLastUpdated(new Date());
            } catch (err) {
                setError(err as Error);
                console.error('Failed to fetch transactions:', err);
            } finally {
                setIsLoading(false);
            }
        },
        [connected, address, rpcClient, cluster, limit, fetchDetails, parseTransaction],
    );

    const refetch = useCallback(async () => {
        setBeforeSignature(undefined);
        beforeSignatureRef.current = undefined;
        await fetchTransactions(false);
    }, [fetchTransactions]);

    const loadMoreFn = useCallback(async () => {
        if (hasMore && !isLoading) {
            await fetchTransactions(true);
        }
    }, [hasMore, isLoading, fetchTransactions]);

    // Fetch on mount and when dependencies change
    useEffect(() => {
        setBeforeSignature(undefined);
        beforeSignatureRef.current = undefined;
        fetchTransactions(false);
    }, [connected, address, cluster, fetchTransactions]);

    // Auto-refresh
    useEffect(() => {
        if (!connected || !autoRefresh) return;

        const interval = setInterval(refetch, refreshInterval);
        return () => clearInterval(interval);
    }, [connected, autoRefresh, refreshInterval, refetch]);

    return useMemo(
        () => ({
            transactions,
            isLoading,
            error,
            hasMore,
            loadMore: loadMoreFn,
            refetch,
            lastUpdated,
        }),
        [transactions, isLoading, error, hasMore, loadMoreFn, refetch, lastUpdated],
    );
}
