'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { address as toAddress } from '@solana/addresses';
import { signature as toSignature } from '@solana/keys';
import type { SolanaCluster } from '@wallet-ui/core';
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

// TypeScript interfaces for RPC transaction structures
interface AccountKey {
    pubkey: string;
    writable?: boolean;
    signer?: boolean;
}

interface UiTokenAmount {
    amount: string | bigint;
    decimals: number;
    uiAmount: number | null;
    uiAmountString?: string;
}

interface TokenBalance {
    accountIndex: number;
    mint: string;
    owner?: string;
    programId?: string;
    uiTokenAmount: UiTokenAmount;
}

interface TransactionMeta {
    err: unknown;
    fee: number | bigint;
    innerInstructions?: unknown[];
    loadedAddresses?: unknown;
    logMessages?: string[];
    postBalances: (number | bigint)[];
    postTokenBalances?: TokenBalance[];
    preBalances: (number | bigint)[];
    preTokenBalances?: TokenBalance[];
    rewards?: unknown[];
    returnData?: unknown;
}

interface Instruction {
    programId?: string;
    programIdIndex?: number;
    accounts?: unknown[];
    data?: string;
    parsed?: unknown;
}

interface TransactionMessage {
    accountKeys: (string | AccountKey)[];
    instructions?: Instruction[];
    recentBlockhash?: string;
    header?: {
        numReadonlySignedAccounts?: number;
        numReadonlyUnsignedAccounts?: number;
        numRequiredSignatures?: number;
    };
}

interface RpcTransaction {
    meta: TransactionMeta | null;
    transaction: {
        message: TransactionMessage;
        signatures?: string[];
    };
    version?: 'legacy' | number;
}

interface ParsedTokenTransfer {
    tokenMint: string;
    tokenAmount: number;
    tokenDecimals: number;
    direction: 'in' | 'out';
    type: 'sent' | 'received';
}

// Type guards
function isAccountKey(value: unknown): value is AccountKey {
    return (
        typeof value === 'object' &&
        value !== null &&
        'pubkey' in value &&
        typeof (value as AccountKey).pubkey === 'string'
    );
}

function isTransactionMeta(value: unknown): value is TransactionMeta {
    if (typeof value !== 'object' || value === null || !('preBalances' in value) || !('postBalances' in value)) {
        return false;
    }

    const meta = value as TransactionMeta;
    if (!Array.isArray(meta.preBalances) || !Array.isArray(meta.postBalances)) {
        return false;
    }

    // Validate that balance arrays contain numbers or bigints
    const isValidBalance = (b: unknown): b is number | bigint => typeof b === 'number' || typeof b === 'bigint';

    return meta.preBalances.every(isValidBalance) && meta.postBalances.every(isValidBalance);
}

function isTokenBalance(value: unknown): value is TokenBalance {
    return (
        typeof value === 'object' &&
        value !== null &&
        'accountIndex' in value &&
        'mint' in value &&
        'uiTokenAmount' in value &&
        typeof (value as TokenBalance).accountIndex === 'number' &&
        typeof (value as TokenBalance).mint === 'string' &&
        typeof (value as TokenBalance).uiTokenAmount === 'object' &&
        (value as TokenBalance).uiTokenAmount !== null
    );
}

function isUiTokenAmount(value: unknown): value is UiTokenAmount {
    return (
        typeof value === 'object' &&
        value !== null &&
        'amount' in value &&
        'decimals' in value &&
        typeof (value as UiTokenAmount).amount === 'string' &&
        typeof (value as UiTokenAmount).decimals === 'number'
    );
}

function isTransactionWithMeta(value: unknown): value is RpcTransaction {
    return (
        typeof value === 'object' &&
        value !== null &&
        'meta' in value &&
        'transaction' in value &&
        (value as RpcTransaction).meta !== null &&
        typeof (value as RpcTransaction).transaction === 'object' &&
        (value as RpcTransaction).transaction !== null &&
        'message' in (value as RpcTransaction).transaction
    );
}

function isTransactionMessage(value: unknown): value is TransactionMessage {
    return (
        typeof value === 'object' &&
        value !== null &&
        'accountKeys' in value &&
        Array.isArray((value as TransactionMessage).accountKeys)
    );
}

// Helper functions
function getAccountKeys(message: TransactionMessage): string[] {
    if (!Array.isArray(message.accountKeys)) {
        return [];
    }

    return message.accountKeys
        .map(key => {
            if (typeof key === 'string') {
                return key;
            }
            if (isAccountKey(key)) {
                return key.pubkey;
            }
            return '';
        })
        .filter(Boolean);
}

function detectProgramIds(message: TransactionMessage, accountKeys: string[]): Set<string> {
    const programIds = new Set<string>();

    if (!Array.isArray(message.instructions)) {
        return programIds;
    }

    for (const instruction of message.instructions) {
        if (typeof instruction === 'object' && instruction !== null) {
            // Try programIdIndex first
            if (typeof instruction.programIdIndex === 'number' && accountKeys[instruction.programIdIndex]) {
                programIds.add(accountKeys[instruction.programIdIndex]);
            }
            // Fallback to programId string
            else if (typeof instruction.programId === 'string') {
                programIds.add(instruction.programId);
            }
            // Handle case where programId might be an Address object (Web3.js 2.0 kit)
            else if (instruction.programId && typeof instruction.programId === 'object') {
                const programIdStr = String(instruction.programId);
                if (programIdStr && programIdStr !== '[object Object]') {
                    programIds.add(programIdStr);
                }
            }
        }
    }

    return programIds;
}

function parseSolChange(meta: TransactionMeta, walletIndex: number): { balanceChange: number; solChange: number } {
    if (!isTransactionMeta(meta) || !Array.isArray(meta.preBalances) || !Array.isArray(meta.postBalances)) {
        return { balanceChange: 0, solChange: 0 };
    }

    const preBalanceRaw = meta.preBalances[walletIndex];
    const postBalanceRaw = meta.postBalances[walletIndex];

    // Handle both number and bigint (Web3.js 2.0 returns bigint)
    const preBalance =
        typeof preBalanceRaw === 'number'
            ? preBalanceRaw
            : typeof preBalanceRaw === 'bigint'
              ? Number(preBalanceRaw)
              : 0;
    const postBalance =
        typeof postBalanceRaw === 'number'
            ? postBalanceRaw
            : typeof postBalanceRaw === 'bigint'
              ? Number(postBalanceRaw)
              : 0;

    const balanceChange = postBalance - preBalance;
    const solChange = balanceChange / LAMPORTS_PER_SOL;

    return { balanceChange, solChange };
}

function parseTokenTransfers(
    meta: TransactionMeta,
    accountKeys: string[],
    walletAddress: string,
): ParsedTokenTransfer | null {
    if (!isTransactionMeta(meta)) {
        return null;
    }

    const preTokenBalances = Array.isArray(meta.preTokenBalances) ? meta.preTokenBalances : [];
    const postTokenBalances = Array.isArray(meta.postTokenBalances) ? meta.postTokenBalances : [];

    // Filter token balances for our wallet
    const ourPreTokens = preTokenBalances.filter(balance => {
        if (!isTokenBalance(balance)) return false;
        const accountKey = accountKeys[balance.accountIndex];
        return (
            (accountKey && accountKey.trim() === walletAddress.trim()) ||
            (balance.owner && balance.owner.trim() === walletAddress.trim())
        );
    });

    const ourPostTokens = postTokenBalances.filter(balance => {
        if (!isTokenBalance(balance)) return false;
        const accountKey = accountKeys[balance.accountIndex];
        return (
            (accountKey && accountKey.trim() === walletAddress.trim()) ||
            (balance.owner && balance.owner.trim() === walletAddress.trim())
        );
    });

    // Collect all unique mints
    const allMints = new Set<string>();
    for (const token of ourPreTokens) {
        if (isTokenBalance(token)) {
            allMints.add(token.mint);
        }
    }
    for (const token of ourPostTokens) {
        if (isTokenBalance(token)) {
            allMints.add(token.mint);
        }
    }

    // Check for token balance changes
    for (const mint of allMints) {
        const preBal = ourPreTokens.find(b => isTokenBalance(b) && b.mint === mint);
        const postBal = ourPostTokens.find(b => isTokenBalance(b) && b.mint === mint);

        if (!isTokenBalance(preBal) && !isTokenBalance(postBal)) {
            continue;
        }

        const preAmount =
            isTokenBalance(preBal) && isUiTokenAmount(preBal.uiTokenAmount) ? Number(preBal.uiTokenAmount.amount) : 0;
        const postAmount =
            isTokenBalance(postBal) && isUiTokenAmount(postBal.uiTokenAmount)
                ? Number(postBal.uiTokenAmount.amount)
                : 0;

        const change = postAmount - preAmount;

        if (change !== 0) {
            const decimals =
                isTokenBalance(postBal) && isUiTokenAmount(postBal.uiTokenAmount)
                    ? postBal.uiTokenAmount.decimals
                    : isTokenBalance(preBal) && isUiTokenAmount(preBal.uiTokenAmount)
                      ? preBal.uiTokenAmount.decimals
                      : 0;

            if (typeof decimals !== 'number' || decimals < 0) {
                continue;
            }

            return {
                tokenMint: mint,
                tokenAmount: Math.abs(change) / Math.pow(10, decimals),
                tokenDecimals: decimals,
                direction: change > 0 ? 'in' : 'out',
                type: change > 0 ? 'received' : 'sent',
            };
        }
    }

    // If no change detected but new token account created
    if (ourPostTokens.length > ourPreTokens.length) {
        const newToken = ourPostTokens.find(
            b => isTokenBalance(b) && !ourPreTokens.some(p => isTokenBalance(p) && p.mint === b.mint),
        );

        if (isTokenBalance(newToken) && isUiTokenAmount(newToken.uiTokenAmount)) {
            const decimals = newToken.uiTokenAmount.decimals;
            if (typeof decimals === 'number' && decimals >= 0) {
                const amount = Number(newToken.uiTokenAmount.amount) / Math.pow(10, decimals);
                return {
                    tokenMint: newToken.mint,
                    tokenAmount: amount,
                    tokenDecimals: decimals,
                    direction: 'in',
                    type: 'received',
                };
            }
        }
    }

    return null;
}

function formatAmount(
    tokenAmount: number | undefined,
    tokenDecimals: number | undefined,
    direction: 'in' | 'out' | undefined,
    solChange: number,
): string | undefined {
    if (tokenAmount !== undefined && tokenDecimals !== undefined && direction !== undefined) {
        const sign = direction === 'in' ? '+' : '-';
        const maxDecimals = Math.min(tokenDecimals, 6);
        return `${sign}${tokenAmount.toLocaleString(undefined, { maximumFractionDigits: maxDecimals })}`;
    }

    if (solChange !== 0) {
        return `${solChange > 0 ? '+' : ''}${solChange.toFixed(4)} SOL`;
    }

    return undefined;
}

// Cache for token metadata
const tokenMetadataCache = new Map<string, { symbol: string; icon: string }>();

/**
 * Fetch token metadata from Solana Token List API for transaction display
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
        const response = await fetch('https://token-list-api.solana.cloud/v1/mints?chainId=101', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses: uncachedMints }),
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) return results;

        const data: { content: Array<{ address: string; symbol: string; logoURI: string }> } = await response.json();

        for (const item of data.content) {
            const metadata = { symbol: item.symbol, icon: item.logoURI };
            results.set(item.address, metadata);
            tokenMetadataCache.set(item.address, metadata);
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
    const beforeSignatureRef = useRef<string | undefined>(undefined);
    const prevDepsRef = useRef<{ connected: boolean; address: string | null; cluster: SolanaCluster | null } | null>(
        null,
    );

    // Extract the actual client to use as a stable dependency
    const rpcClient = client?.client ?? null;

    const parseTransaction = useCallback(
        (
            tx: unknown,
            walletAddress: string,
            sig: string,
            blockTime: number | null,
            slot: number,
            err: unknown,
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

            // Early return if transaction structure is invalid
            if (!isTransactionWithMeta(tx)) {
                return baseInfo;
            }

            try {
                const { meta, transaction } = tx;

                // Type guard ensures meta is not null, but double-check for safety
                if (!isTransactionMeta(meta)) {
                    return baseInfo;
                }

                const { message } = transaction;

                // Early return if message structure is invalid
                if (!isTransactionMessage(message)) {
                    return baseInfo;
                }

                // Get account keys using helper
                const accountKeys = getAccountKeys(message);

                // Find wallet index
                const walletIndex = accountKeys.findIndex(key => key.trim() === walletAddress.trim());

                if (walletIndex === -1) {
                    return baseInfo;
                }

                // Calculate SOL balance change using helper
                const { balanceChange, solChange } = parseSolChange(meta, walletIndex);

                // Detect program IDs using helper
                const programIds = detectProgramIds(message, accountKeys);

                // Check for known programs
                const hasJupiter = programIds.has('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
                const hasOrca = programIds.has('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');
                const hasRaydium = programIds.has('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
                const hasStake = programIds.has('Stake11111111111111111111111111111111111111');
                const hasMetaplex = programIds.has('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
                const hasSystemProgram = programIds.has('11111111111111111111111111111111');
                const hasTokenProgram = programIds.has('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

                // Determine transaction type
                let type: TransactionInfo['type'] = 'unknown';
                let direction: 'in' | 'out' | undefined;
                let counterparty: string | undefined;
                let tokenMint: string | undefined;
                let tokenAmount: number | undefined;
                let tokenDecimals: number | undefined;

                if (hasJupiter || hasOrca || hasRaydium) {
                    type = 'swap';
                } else if (hasStake) {
                    type = 'stake';
                } else if (hasMetaplex) {
                    type = 'nft';
                } else if (hasSystemProgram && Math.abs(balanceChange) > 0) {
                    // Simple SOL transfer
                    type = balanceChange > 0 ? 'received' : 'sent';
                    direction = balanceChange > 0 ? 'in' : 'out';
                    // SOL is native, use wrapped SOL mint for icon
                    tokenMint = 'So11111111111111111111111111111111111111112';

                    // Try to find counterparty
                    if (accountKeys.length >= 2) {
                        counterparty = accountKeys.find(
                            (key, idx) => idx !== walletIndex && key !== '11111111111111111111111111111111',
                        );
                    }
                } else if (hasTokenProgram) {
                    // Token transfer - parse using helper
                    const tokenTransfer = parseTokenTransfers(meta, accountKeys, walletAddress);

                    if (tokenTransfer) {
                        type = tokenTransfer.type;
                        direction = tokenTransfer.direction;
                        tokenMint = tokenTransfer.tokenMint;
                        tokenAmount = tokenTransfer.tokenAmount;
                        tokenDecimals = tokenTransfer.tokenDecimals;
                    }
                } else if (programIds.size > 0) {
                    type = 'program';
                }

                // Format amount string using helper
                const formattedAmount = formatAmount(tokenAmount, tokenDecimals, direction, solChange);

                return {
                    ...baseInfo,
                    type,
                    direction,
                    amount: tokenAmount ?? Math.abs(solChange),
                    formattedAmount,
                    tokenMint,
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
                        ...(loadMore && beforeSignatureRef.current
                            ? { before: toSignature(beforeSignatureRef.current) }
                            : {}),
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
                if (typeof newTransactions !== 'undefined' && Array.isArray(newTransactions)) {
                    if (newTransactions.length > 0) {
                        const newBeforeSignature = newTransactions[newTransactions.length - 1].signature;
                        beforeSignatureRef.current = newBeforeSignature;
                    }
                    setHasMore(newTransactions.length === limit);
                }

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
        const prevDeps = prevDepsRef.current;
        const currentDeps = { connected, address, cluster };

        // Only reset and fetch if connected, address, or cluster actually changed
        const shouldReset =
            !prevDeps ||
            prevDeps.connected !== connected ||
            prevDeps.address !== address ||
            prevDeps.cluster !== cluster;

        if (shouldReset) {
            prevDepsRef.current = currentDeps;
            beforeSignatureRef.current = undefined;
            fetchTransactions(false);
        }
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
