'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { address as toAddress } from '@solana/addresses';
import { signature as toSignature } from '@solana/keys';
import type { SolanaCluster } from '@wallet-ui/core';
import { useAccount } from './use-account';
import { useCluster } from './use-cluster';
import { useSolanaClient } from './use-kit-solana-client';
import { useConnectorClient } from '../ui/connector-provider';
import { useSharedQuery } from './_internal/use-shared-query';
import { fetchSolanaTokenListMetadata } from './_internal/solana-token-list';
import { getTransactionUrl } from '../utils/cluster';
import { LAMPORTS_PER_SOL } from '../lib/kit-utils';
import type { SolanaClient } from '../lib/kit-utils';
import { transformImageUrl } from '../utils/image';

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
    type: 'sent' | 'received' | 'swap' | 'nft' | 'stake' | 'program' | 'tokenAccountClosed' | 'unknown';
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
    /** Swap from token (only for swap transactions) */
    swapFromToken?: {
        mint: string;
        symbol?: string;
        icon?: string;
    };
    /** Swap to token (only for swap transactions) */
    swapToToken?: {
        mint: string;
        symbol?: string;
        icon?: string;
    };
    /** Primary program ID involved in the transaction (best-effort) */
    programId?: string;
    /** Friendly name for the primary program if known */
    programName?: string;
    /** All program IDs involved in the transaction (best-effort) */
    programIds?: string[];
    /** Parsed instruction types (best-effort, only available for some programs in `jsonParsed` mode) */
    instructionTypes?: string[];
    /** Number of top-level instructions in the transaction message (best-effort) */
    instructionCount?: number;
}

export interface UseTransactionsOptions {
    /** Whether the hook is enabled (default: true) */
    enabled?: boolean;
    /** Number of transactions to fetch */
    limit?: number;
    /** Whether to auto-refresh */
    autoRefresh?: boolean;
    /** Refresh interval in milliseconds */
    refreshInterval?: number;
    /** Fetch full transaction details (slower but more info) */
    fetchDetails?: boolean;
    /**
     * Max concurrent `getTransaction` RPC calls when `fetchDetails` is true.
     * Lower this if you see throttling on public RPCs.
     *
     * @default 6
     */
    detailsConcurrency?: number;
    /** Time in ms to consider data fresh (default: 0) */
    staleTimeMs?: number;
    /** Time in ms to keep cache after unmount (default: 300000) */
    cacheTimeMs?: number;
    /** Whether to refetch on mount (default: 'stale') */
    refetchOnMount?: boolean | 'stale';
    /** Override the Solana client from provider */
    client?: SolanaClient | null;
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
    /** Refetch transactions, optionally with an abort signal */
    refetch: (options?: { signal?: AbortSignal }) => Promise<void>;
    /** Abort any in-flight transaction fetch */
    abort: () => void;
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

const DEFAULT_IGNORED_PROGRAM_IDS = new Set<string>([
    '11111111111111111111111111111111', // System Program
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token
]);

function resolveProgramName(programId: string, programLabels: Record<string, string> | undefined): string | undefined {
    return programLabels?.[programId] ?? KNOWN_PROGRAMS[programId];
}

function pickPrimaryProgramId(programIds: Set<string>): string | undefined {
    // Prefer the first non-trivial program (exclude System/Token/ATA).
    for (const id of programIds) {
        if (!DEFAULT_IGNORED_PROGRAM_IDS.has(id)) return id;
    }
    // Fallback to the first program ID (if any).
    return programIds.values().next().value;
}

function getParsedInstructionTypes(message: TransactionMessage): string[] | undefined {
    if (!Array.isArray(message.instructions)) return undefined;

    const types: string[] = [];
    for (const ix of message.instructions) {
        if (!ix || typeof ix !== 'object') continue;
        const parsed = (ix as Instruction).parsed;
        if (!parsed || typeof parsed !== 'object') continue;
        if (!('type' in parsed)) continue;
        const t = (parsed as { type?: unknown }).type;
        if (typeof t !== 'string') continue;
        types.push(t);
        if (types.length >= 10) break;
    }

    const unique = [...new Set(types)];
    return unique.length ? unique : undefined;
}

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

function coerceMaybeAddressString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        const str = String(value);
        if (str && str !== '[object Object]') return str;
    }
    return undefined;
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
        const owner = coerceMaybeAddressString(balance.owner);
        return (
            (accountKey && accountKey.trim() === walletAddress.trim()) ||
            (owner && owner.trim() === walletAddress.trim())
        );
    });

    const ourPostTokens = postTokenBalances.filter(balance => {
        if (!isTokenBalance(balance)) return false;
        const accountKey = accountKeys[balance.accountIndex];
        const owner = coerceMaybeAddressString(balance.owner);
        return (
            (accountKey && accountKey.trim() === walletAddress.trim()) ||
            (owner && owner.trim() === walletAddress.trim())
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

interface ParsedTokenAccountClosure {
    tokenMint: string;
}

function parseTokenAccountClosure(
    meta: TransactionMeta,
    accountKeys: string[],
    walletAddress: string,
): ParsedTokenAccountClosure | null {
    if (!isTransactionMeta(meta)) {
        return null;
    }

    const preTokenBalances = Array.isArray(meta.preTokenBalances) ? meta.preTokenBalances : [];
    const postTokenBalances = Array.isArray(meta.postTokenBalances) ? meta.postTokenBalances : [];

    const ourPreTokens = preTokenBalances.filter(balance => {
        if (!isTokenBalance(balance)) return false;
        const accountKey = accountKeys[balance.accountIndex];
        const owner = coerceMaybeAddressString(balance.owner);
        return (
            (accountKey && accountKey.trim() === walletAddress.trim()) ||
            (owner && owner.trim() === walletAddress.trim())
        );
    });

    const ourPostTokens = postTokenBalances.filter(balance => {
        if (!isTokenBalance(balance)) return false;
        const accountKey = accountKeys[balance.accountIndex];
        const owner = coerceMaybeAddressString(balance.owner);
        return (
            (accountKey && accountKey.trim() === walletAddress.trim()) ||
            (owner && owner.trim() === walletAddress.trim())
        );
    });

    const postKeys = new Set<string>();
    for (const token of ourPostTokens) {
        if (!isTokenBalance(token)) continue;
        postKeys.add(`${token.accountIndex}:${token.mint}`);
    }

    for (const token of ourPreTokens) {
        if (!isTokenBalance(token)) continue;
        const key = `${token.accountIndex}:${token.mint}`;
        if (!postKeys.has(key)) {
            return { tokenMint: token.mint };
        }
    }

    return null;
}

interface ParsedSwapTokens {
    fromToken?: { mint: string };
    toToken?: { mint: string };
}

function parseSwapTokens(
    meta: TransactionMeta,
    accountKeys: string[],
    walletAddress: string,
    solChange: number,
): ParsedSwapTokens {
    if (!isTransactionMeta(meta)) {
        return {};
    }

    const preTokenBalances = Array.isArray(meta.preTokenBalances) ? meta.preTokenBalances : [];
    const postTokenBalances = Array.isArray(meta.postTokenBalances) ? meta.postTokenBalances : [];

    // Filter token balances for our wallet
    const ourPreTokens = preTokenBalances.filter(balance => {
        if (!isTokenBalance(balance)) return false;
        const accountKey = accountKeys[balance.accountIndex];
        const owner = coerceMaybeAddressString(balance.owner);
        return (
            (accountKey && accountKey.trim() === walletAddress.trim()) ||
            (owner && owner.trim() === walletAddress.trim())
        );
    });

    const ourPostTokens = postTokenBalances.filter(balance => {
        if (!isTokenBalance(balance)) return false;
        const accountKey = accountKeys[balance.accountIndex];
        const owner = coerceMaybeAddressString(balance.owner);
        return (
            (accountKey && accountKey.trim() === walletAddress.trim()) ||
            (owner && owner.trim() === walletAddress.trim())
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

    // Find tokens that decreased (from) and increased (to)
    let fromToken: { mint: string } | undefined;
    let toToken: { mint: string } | undefined;

    for (const mint of allMints) {
        const preBal = ourPreTokens.find(b => isTokenBalance(b) && b.mint === mint);
        const postBal = ourPostTokens.find(b => isTokenBalance(b) && b.mint === mint);

        const preAmount =
            isTokenBalance(preBal) && isUiTokenAmount(preBal.uiTokenAmount) ? Number(preBal.uiTokenAmount.amount) : 0;
        const postAmount =
            isTokenBalance(postBal) && isUiTokenAmount(postBal.uiTokenAmount)
                ? Number(postBal.uiTokenAmount.amount)
                : 0;

        const change = postAmount - preAmount;

        if (change < 0 && !fromToken) {
            // Token decreased - this is the "from" token
            fromToken = { mint };
        } else if (change > 0 && !toToken) {
            // Token increased - this is the "to" token
            toToken = { mint };
        }
    }

    // Handle SOL as from/to token (wrapped SOL mint)
    const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';
    if (solChange < -0.001 && !fromToken) {
        // SOL decreased significantly (more than just fees)
        fromToken = { mint: WRAPPED_SOL_MINT };
    } else if (solChange > 0.001 && !toToken) {
        // SOL increased
        toToken = { mint: WRAPPED_SOL_MINT };
    }

    return { fromToken, toToken };
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

function throwIfAborted(signal: AbortSignal | undefined): void {
    if (!signal?.aborted) return;
    throw new DOMException('Query aborted', 'AbortError');
}

/**
 * Clamp an integer to a safe range.
 */
function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.floor(value)));
}

/**
 * Run async work over a list with bounded concurrency.
 * Preserves input order.
 */
async function mapWithConcurrency<TIn, TOut>(
    inputs: readonly TIn[],
    worker: (input: TIn, index: number) => Promise<TOut>,
    options: { concurrency: number; signal?: AbortSignal },
): Promise<TOut[]> {
    const concurrency = clampInt(options.concurrency, 1, 32);
    const results = new Array<TOut>(inputs.length);
    let nextIndex = 0;

    async function run(): Promise<void> {
        while (true) {
            throwIfAborted(options.signal);
            const index = nextIndex;
            nextIndex += 1;
            if (index >= inputs.length) return;
            results[index] = await worker(inputs[index], index);
        }
    }

    const runners = Array.from({ length: Math.min(concurrency, inputs.length) }, () => run());
    await Promise.all(runners);
    return results;
}

/**
 * Fetch token metadata for transaction display (shared token-list cache).
 */
async function fetchTransactionTokenMetadata(
    mints: string[],
    options: { signal?: AbortSignal } = {},
): Promise<Map<string, { symbol: string; icon: string }>> {
    const results = new Map<string, { symbol: string; icon: string }>();
    if (!mints.length) return results;

    const tokenList = await fetchSolanaTokenListMetadata(mints, {
        timeoutMs: 5000,
        signal: options.signal,
    });

    for (const [mint, meta] of tokenList) {
        results.set(mint, { symbol: meta.symbol, icon: meta.logoURI });
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
    const {
        enabled = true,
        limit = 10,
        autoRefresh = false,
        refreshInterval = 60000,
        fetchDetails = true,
        detailsConcurrency = 6,
        staleTimeMs = 0,
        cacheTimeMs = 5 * 60 * 1000, // 5 minutes
        refetchOnMount = 'stale',
        client: clientOverride,
    } = options;

    const { address, connected } = useAccount();
    const { cluster } = useCluster();
    const { client: providerClient } = useSolanaClient();
    const connectorClient = useConnectorClient();

    // Pagination state (local, not shared)
    const [paginatedTransactions, setPaginatedTransactions] = useState<TransactionInfo[]>([]);
    const [isPaginationLoading, setIsPaginationLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const beforeSignatureRef = useRef<string | undefined>(undefined);

    // Use override client if provided, otherwise use provider client
    const rpcClient = clientOverride ?? providerClient;

    // Get imageProxy from connector config
    const connectorConfig = connectorClient?.getConfig();
    const imageProxy = connectorConfig?.imageProxy;
    const programLabels = connectorConfig?.programLabels;

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
                error: err
                    ? JSON.stringify(err, (_key, value) =>
                          typeof value === 'bigint' ? value.toString() : value,
                      )
                    : undefined,
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

                // Precompute token program derived signals (used for transfers and closures)
                const tokenTransfer = hasTokenProgram ? parseTokenTransfers(meta, accountKeys, walletAddress) : null;
                const tokenAccountClosure = hasTokenProgram
                    ? parseTokenAccountClosure(meta, accountKeys, walletAddress)
                    : null;

                // Infer swap tokens from balance deltas (works even when program IDs are unknown)
                const inferredSwapTokens = parseSwapTokens(meta, accountKeys, walletAddress, solChange);
                const inferredSwapFromMint = inferredSwapTokens.fromToken?.mint;
                const inferredSwapToMint = inferredSwapTokens.toToken?.mint;
                const hasNonTrivialProgram = [...programIds].some(id => !DEFAULT_IGNORED_PROGRAM_IDS.has(id));
                const hasInferredSwap =
                    Boolean(inferredSwapFromMint && inferredSwapToMint) &&
                    inferredSwapFromMint !== inferredSwapToMint &&
                    hasNonTrivialProgram &&
                    !tokenAccountClosure;

                const programId = pickPrimaryProgramId(programIds);
                const programName = programId ? resolveProgramName(programId, programLabels) : undefined;
                const programIdsArray = [...programIds];
                const instructionTypes = getParsedInstructionTypes(message);
                const instructionCount = Array.isArray(message.instructions) ? message.instructions.length : undefined;

                // Determine transaction type
                let type: TransactionInfo['type'] = 'unknown';
                let direction: 'in' | 'out' | undefined;
                let counterparty: string | undefined;
                let tokenMint: string | undefined;
                let tokenAmount: number | undefined;
                let tokenDecimals: number | undefined;
                let swapFromToken: TransactionInfo['swapFromToken'];
                let swapToToken: TransactionInfo['swapToToken'];

                if (hasJupiter || hasOrca || hasRaydium) {
                    type = 'swap';
                    // Parse swap tokens
                    if (inferredSwapTokens.fromToken) swapFromToken = { mint: inferredSwapTokens.fromToken.mint };
                    if (inferredSwapTokens.toToken) swapToToken = { mint: inferredSwapTokens.toToken.mint };
                } else if (hasStake) {
                    type = 'stake';
                } else if (hasMetaplex) {
                    type = 'nft';
                } else if (hasInferredSwap) {
                    type = 'swap';
                    swapFromToken = { mint: inferredSwapFromMint! };
                    swapToToken = { mint: inferredSwapToMint! };
                } else if (tokenTransfer) {
                    type = tokenTransfer.type;
                    direction = tokenTransfer.direction;
                    tokenMint = tokenTransfer.tokenMint;
                    tokenAmount = tokenTransfer.tokenAmount;
                    tokenDecimals = tokenTransfer.tokenDecimals;
                } else if (tokenAccountClosure) {
                    type = 'tokenAccountClosed';
                    tokenMint = tokenAccountClosure.tokenMint;
                    direction = solChange > 0 ? 'in' : undefined;
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
                    swapFromToken,
                    swapToToken,
                    programId,
                    programName,
                    programIds: programIdsArray.length ? programIdsArray : undefined,
                    instructionTypes,
                    instructionCount,
                };
            } catch (parseError) {
                console.warn('Failed to parse transaction:', parseError);
                return baseInfo;
            }
        },
        [programLabels],
    );

    // Generate cache key based on RPC URL, address, cluster, and options
    const key = useMemo(() => {
        if (!enabled || !connected || !address || !rpcClient || !cluster) return null;
        const rpcUrl =
            rpcClient.urlOrMoniker instanceof URL
                ? rpcClient.urlOrMoniker.toString()
                : String(rpcClient.urlOrMoniker);
        return JSON.stringify(['wallet-transactions', rpcUrl, address, cluster.id, limit, fetchDetails]);
    }, [enabled, connected, address, rpcClient, cluster, limit, fetchDetails]);

    // Reset pagination immediately when the query key changes.
    // This prevents "old paginated transactions" flashing while the new key loads.
    useEffect(() => {
        beforeSignatureRef.current = undefined;
        setPaginatedTransactions([]);
        setIsPaginationLoading(false);
        setHasMore(true);
    }, [key]);

    // Helper to fetch and enrich transactions
    const fetchAndEnrichTransactions = useCallback(
        async (
            beforeSignature: string | undefined,
            currentCluster: SolanaCluster,
            signal?: AbortSignal,
        ): Promise<{ transactions: TransactionInfo[]; hasMore: boolean }> => {
            if (!rpcClient || !address) {
                return { transactions: [], hasMore: false };
            }

            throwIfAborted(signal);

            const rpc = rpcClient.rpc;
            const walletAddress = toAddress(address);

            const signaturesResult = await rpc
                .getSignaturesForAddress(walletAddress, {
                    limit,
                    ...(beforeSignature ? { before: toSignature(beforeSignature) } : {}),
                })
                .send();

            throwIfAborted(signal);

            let newTransactions: TransactionInfo[];

            if (fetchDetails && signaturesResult.length > 0) {
                // Fetch full transaction details with bounded concurrency (prevents RPC throttling).
                const txDetails = await mapWithConcurrency(
                    signaturesResult,
                    async sig =>
                        rpc
                            .getTransaction(toSignature(String(sig.signature)), {
                                encoding: 'jsonParsed',
                                maxSupportedTransactionVersion: 0,
                            })
                            .send()
                            .catch(() => null),
                    { concurrency: detailsConcurrency, signal },
                );

                throwIfAborted(signal);

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
                        getTransactionUrl(String(sig.signature), currentCluster),
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
                        explorerUrl: getTransactionUrl(String(sig.signature), currentCluster),
                    };
                });
            }

            // Fetch token metadata for transactions that have token mints
            const mintsToFetch = [
                ...new Set([
                    ...newTransactions.filter(tx => tx.tokenMint).map(tx => tx.tokenMint!),
                    ...newTransactions.filter(tx => tx.swapFromToken?.mint).map(tx => tx.swapFromToken!.mint),
                    ...newTransactions.filter(tx => tx.swapToToken?.mint).map(tx => tx.swapToToken!.mint),
                ]),
            ];

            if (mintsToFetch.length > 0) {
                throwIfAborted(signal);

                const tokenMetadata = await fetchTransactionTokenMetadata(mintsToFetch, { signal });

                if (tokenMetadata.size > 0) {
                    newTransactions = newTransactions.map(tx => {
                        let enrichedTx = { ...tx };

                        if (tx.tokenMint && tokenMetadata.has(tx.tokenMint)) {
                            const meta = tokenMetadata.get(tx.tokenMint)!;
                            enrichedTx = {
                                ...enrichedTx,
                                tokenSymbol: meta.symbol,
                                tokenIcon: transformImageUrl(meta.icon, imageProxy),
                                formattedAmount: tx.formattedAmount
                                    ? `${tx.formattedAmount} ${meta.symbol}`
                                    : tx.formattedAmount,
                            };
                        }

                        if (tx.swapFromToken?.mint && tokenMetadata.has(tx.swapFromToken.mint)) {
                            const meta = tokenMetadata.get(tx.swapFromToken.mint)!;
                            enrichedTx = {
                                ...enrichedTx,
                                swapFromToken: {
                                    ...tx.swapFromToken,
                                    symbol: meta.symbol,
                                    icon: transformImageUrl(meta.icon, imageProxy),
                                },
                            };
                        }

                        if (tx.swapToToken?.mint && tokenMetadata.has(tx.swapToToken.mint)) {
                            const meta = tokenMetadata.get(tx.swapToToken.mint)!;
                            enrichedTx = {
                                ...enrichedTx,
                                swapToToken: {
                                    ...tx.swapToToken,
                                    symbol: meta.symbol,
                                    icon: transformImageUrl(meta.icon, imageProxy),
                                },
                            };
                        }

                        return enrichedTx;
                    });
                }
            }

            return {
                transactions: newTransactions,
                hasMore: newTransactions.length === limit,
            };
        },
        [rpcClient, address, limit, fetchDetails, detailsConcurrency, parseTransaction, imageProxy],
    );

    // Query function for initial page (deduped via useSharedQuery)
    const queryFn = useCallback(
        async (signal: AbortSignal): Promise<TransactionInfo[]> => {
            if (!connected || !address || !rpcClient || !cluster) {
                return [];
            }

            // Throw on abort - fetchSharedQuery will preserve previous data
            throwIfAborted(signal);

            const result = await fetchAndEnrichTransactions(undefined, cluster, signal);

            // Re-check abort after awaited work (prevents publishing results after abort)
            throwIfAborted(signal);

            return result.transactions;
        },
        [connected, address, rpcClient, cluster, fetchAndEnrichTransactions],
    );

    // Use shared query for initial fetch (deduped across components)
    const {
        data: initialTransactions,
        error,
        isFetching: isInitialLoading,
        updatedAt,
        refetch: sharedRefetch,
        abort,
    } = useSharedQuery<TransactionInfo[]>(key, queryFn, {
        enabled,
        staleTimeMs,
        cacheTimeMs,
        refetchOnMount,
        refetchIntervalMs: autoRefresh ? refreshInterval : false,
    });

    // When the initial page changes (refetch/key change), update cursor + hasMore,
    // and drop any prior pagination results (keeps list consistent).
    useEffect(() => {
        if (!initialTransactions) return;

        beforeSignatureRef.current = initialTransactions.length
            ? initialTransactions[initialTransactions.length - 1].signature
            : undefined;

        setHasMore(initialTransactions.length === limit);
        setPaginatedTransactions(prev => (prev.length ? [] : prev));
    }, [initialTransactions, limit]);

    // Load more transactions (pagination - local only)
    const loadMoreFn = useCallback(async () => {
        if (!hasMore || isPaginationLoading || !cluster) return;

        setIsPaginationLoading(true);
        try {
            const result = await fetchAndEnrichTransactions(beforeSignatureRef.current, cluster);

            if (result.transactions.length > 0) {
                beforeSignatureRef.current = result.transactions[result.transactions.length - 1].signature;
                setPaginatedTransactions(prev => [...prev, ...result.transactions]);
            }
            setHasMore(result.hasMore);
        } catch (err) {
            console.error('Failed to load more transactions:', err);
        } finally {
            setIsPaginationLoading(false);
        }
    }, [hasMore, isPaginationLoading, cluster, fetchAndEnrichTransactions]);

    // Wrap refetch to reset pagination
    const refetch = useCallback(
        async (opts?: { signal?: AbortSignal }) => {
            beforeSignatureRef.current = undefined;
            setPaginatedTransactions([]);
            setHasMore(true);
            await sharedRefetch(opts);
        },
        [sharedRefetch],
    );

    // Combine initial transactions with paginated ones
    const transactions = useMemo(() => {
        const initial = initialTransactions ?? [];
        return [...initial, ...paginatedTransactions];
    }, [initialTransactions, paginatedTransactions]);

    // Combined loading state
    const isLoading = isInitialLoading || isPaginationLoading;

    // Preserve old behavior: don't surface "refresh failed" errors if we already have data
    const visibleError = updatedAt ? null : error;

    return useMemo(
        () => ({
            transactions,
            isLoading,
            error: visibleError,
            hasMore,
            loadMore: loadMoreFn,
            refetch,
            abort,
            lastUpdated: updatedAt ? new Date(updatedAt) : null,
        }),
        [transactions, isLoading, visibleError, hasMore, loadMoreFn, refetch, abort, updatedAt],
    );
}
