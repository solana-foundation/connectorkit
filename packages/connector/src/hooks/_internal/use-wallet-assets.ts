'use client';

import { useCallback, useMemo } from 'react';
import { address as toAddress } from '@solana/addresses';
import { useWallet } from '../use-wallet';
import { useSolanaClient } from '../use-kit-solana-client';
import { useSharedQuery } from './use-shared-query';
import type { SharedQueryOptions } from './use-shared-query';
import type { SolanaClient } from '../../lib/kit';

/**
 * Token Program IDs
 */
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

/**
 * Native SOL mint address (wrapped SOL)
 */
export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Information about a single token account
 */
export interface TokenAccountInfo {
    /** Token account public key */
    pubkey: string;
    /** Token mint address */
    mint: string;
    /** Owner address */
    owner: string;
    /** Raw balance in smallest unit */
    amount: bigint;
    /** Token decimals */
    decimals: number;
    /** Whether the account is frozen */
    isFrozen: boolean;
    /** Which token program this account belongs to */
    programId: 'token' | 'token-2022';
}

/**
 * Combined wallet assets data
 */
export interface WalletAssetsData {
    /** SOL balance in lamports */
    lamports: bigint;
    /** All token accounts (Token Program + Token-2022) */
    tokenAccounts: TokenAccountInfo[];
}

/**
 * Options for useWalletAssets hook
 */
export interface UseWalletAssetsOptions<TSelected = WalletAssetsData>
    extends Omit<SharedQueryOptions<WalletAssetsData, TSelected>, 'select'> {
    /** Override the Solana client from provider */
    client?: SolanaClient | null;
    /** Transform/select a subset of data (reduces rerenders) */
    select?: (data: WalletAssetsData | undefined) => TSelected;
}

/**
 * Return type for useWalletAssets hook
 */
export interface UseWalletAssetsReturn<TSelected = WalletAssetsData> {
    /** The wallet assets data (or selected subset) */
    data: TSelected;
    /** Whether data is loading */
    isLoading: boolean;
    /** Whether a fetch is in progress */
    isFetching: boolean;
    /** Error if fetch failed */
    error: Error | null;
    /** Refetch assets */
    refetch: (options?: { signal?: AbortSignal }) => Promise<unknown>;
    /** Abort in-flight request */
    abort: () => void;
    /** Last updated timestamp */
    updatedAt: number | null;
}

/**
 * Parse a token account from RPC response
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function parseBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
    if (typeof value === 'string') {
        try {
            return BigInt(value);
        } catch {
            return 0n;
        }
    }
    return 0n;
}

interface ParsedTokenAmount {
    amount?: unknown;
    decimals?: unknown;
}

interface ParsedTokenAccountInfo {
    mint?: unknown;
    owner?: unknown;
    tokenAmount?: unknown;
    state?: unknown;
}

function getParsedTokenAccountInfo(data: unknown): ParsedTokenAccountInfo | null {
    if (!isRecord(data)) return null;

    const parsed = data.parsed;
    if (!isRecord(parsed)) return null;

    const info = parsed.info;
    if (!isRecord(info)) return null;

    return info as ParsedTokenAccountInfo;
}

function parseTokenAccount(
    account: { pubkey: unknown; account: { data: unknown } },
    programId: 'token' | 'token-2022',
): TokenAccountInfo | null {
    const info = getParsedTokenAccountInfo(account.account.data);
    if (!info) return null;

    const mint = typeof info.mint === 'string' ? info.mint : null;
    const owner = typeof info.owner === 'string' ? info.owner : null;
    if (!mint || !owner) return null;

    const tokenAmount = isRecord(info.tokenAmount) ? (info.tokenAmount as ParsedTokenAmount) : null;
    const amount = parseBigInt(tokenAmount?.amount);
    const decimals = typeof tokenAmount?.decimals === 'number' ? tokenAmount.decimals : 0;
    const state = typeof info.state === 'string' ? info.state : undefined;

    return {
        pubkey: String(account.pubkey),
        mint,
        owner,
        amount,
        decimals,
        isFrozen: state === 'frozen',
        programId,
    };
}

/**
 * Generate the query key for wallet assets.
 * Use this to invalidate the cache externally.
 *
 * @param rpcUrl - The RPC URL being used
 * @param address - The wallet address
 * @returns The stringified query key, or null if params are invalid
 *
 * @example
 * ```tsx
 * // Invalidate wallet assets after a transaction
 * const key = getWalletAssetsQueryKey(rpcUrl, address);
 * if (key) invalidateSharedQuery(key);
 * ```
 */
export function getWalletAssetsQueryKey(rpcUrl: string | null, address: string | null): string | null {
    if (!rpcUrl || !address) return null;
    return JSON.stringify(['wallet-assets', rpcUrl, address]);
}

/**
 * Internal hook that fetches both SOL balance and all token accounts.
 * Queries both Token Program and Token-2022 in parallel.
 *
 * This hook is used internally by `useBalance` and `useTokens` to share
 * a single RPC query, preventing duplicate requests.
 *
 * @internal
 *
 * @example Basic usage
 * ```tsx
 * const { data, isLoading } = useWalletAssets();
 * // data.lamports - SOL balance
 * // data.tokenAccounts - all token accounts
 * ```
 *
 * @example With select (reduces rerenders)
 * ```tsx
 * const { data: lamports } = useWalletAssets({
 *   select: (assets) => assets?.lamports ?? 0n,
 * });
 * ```
 */
export function useWalletAssets<TSelected = WalletAssetsData>(
    options: UseWalletAssetsOptions<TSelected> = {},
): UseWalletAssetsReturn<TSelected> {
    const {
        enabled = true,
        staleTimeMs = 0,
        cacheTimeMs = 5 * 60 * 1000, // 5 minutes
        refetchOnMount = 'stale',
        refetchIntervalMs = false,
        client: clientOverride,
        select,
    } = options;

    const { account, isConnected } = useWallet();
    const address = account ? String(account) : null;
    const { client: providerClient } = useSolanaClient();

    // Use override client if provided, otherwise use provider client
    const rpcClient = clientOverride ?? providerClient;

    // Generate cache key based on RPC URL and address only
    // This ensures useBalance and useTokens share the same cache entry
    const key = useMemo(() => {
        if (!enabled || !isConnected || !address || !rpcClient) return null;
        const rpcUrl =
            rpcClient.urlOrMoniker instanceof URL ? rpcClient.urlOrMoniker.toString() : String(rpcClient.urlOrMoniker);
        return getWalletAssetsQueryKey(rpcUrl, address);
    }, [enabled, isConnected, address, rpcClient]);

    // Query function that fetches SOL balance and all token accounts
    const queryFn = useCallback(
        async (signal: AbortSignal): Promise<WalletAssetsData> => {
            if (!isConnected || !address || !rpcClient) {
                return { lamports: 0n, tokenAccounts: [] };
            }

            // Throw on abort - fetchSharedQuery will preserve previous data
            if (signal.aborted) {
                throw new DOMException('Query aborted', 'AbortError');
            }

            const rpc = rpcClient.rpc;
            const walletAddress = toAddress(address);
            const tokenProgramId = toAddress(TOKEN_PROGRAM_ID);
            const token2022ProgramId = toAddress(TOKEN_2022_PROGRAM_ID);

            // Fetch SOL balance and both token programs in parallel
            const [balanceResult, tokenAccountsResult, token2022AccountsResult] = await Promise.all([
                rpc.getBalance(walletAddress).send(),
                rpc
                    .getTokenAccountsByOwner(walletAddress, { programId: tokenProgramId }, { encoding: 'jsonParsed' })
                    .send(),
                rpc
                    .getTokenAccountsByOwner(
                        walletAddress,
                        { programId: token2022ProgramId },
                        { encoding: 'jsonParsed' },
                    )
                    .send(),
            ]);

            // Check abort after async operations
            if (signal.aborted) {
                throw new DOMException('Query aborted', 'AbortError');
            }

            // Parse Token Program accounts
            const tokenAccounts: TokenAccountInfo[] = [];

            for (const account of tokenAccountsResult.value) {
                const parsed = parseTokenAccount(account, 'token');
                if (parsed) {
                    tokenAccounts.push(parsed);
                }
            }

            // Parse Token-2022 accounts
            for (const account of token2022AccountsResult.value) {
                const parsed = parseTokenAccount(account, 'token-2022');
                if (parsed) {
                    tokenAccounts.push(parsed);
                }
            }

            return {
                lamports: balanceResult.value,
                tokenAccounts,
            };
        },
        [isConnected, address, rpcClient],
    );

    // Use shared query with optional select
    const { data, error, status, updatedAt, isFetching, refetch, abort } = useSharedQuery<WalletAssetsData, TSelected>(
        key,
        queryFn,
        {
            enabled,
            staleTimeMs,
            cacheTimeMs,
            refetchOnMount,
            refetchIntervalMs,
            select: select as ((data: WalletAssetsData | undefined) => TSelected) | undefined,
        },
    );

    const isLoading = status === 'loading' || status === 'idle';

    return useMemo(
        () => ({
            data: data as TSelected,
            isLoading,
            isFetching,
            error,
            refetch,
            abort,
            updatedAt,
        }),
        [data, isLoading, isFetching, error, refetch, abort, updatedAt],
    );
}
