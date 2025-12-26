'use client';

import { useCallback, useMemo } from 'react';
import { address as toAddress } from '@solana/addresses';
import { useAccount } from '../use-account';
import { useSolanaClient } from '../use-kit-solana-client';
import { useSharedQuery } from './use-shared-query';
import type { SharedQueryOptions } from './use-shared-query';
import type { SolanaClient } from '../../lib/kit-utils';

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
function parseTokenAccount(
    account: { pubkey: unknown; account: { data: unknown } },
    programId: 'token' | 'token-2022',
): TokenAccountInfo | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = account.account.data as any;
    if (!data?.parsed?.info) return null;

    const info = data.parsed.info;
    const amount = BigInt(info.tokenAmount?.amount || '0');
    const decimals = info.tokenAmount?.decimals ?? 0;

    return {
        pubkey: String(account.pubkey),
        mint: info.mint,
        owner: info.owner,
        amount,
        decimals,
        isFrozen: info.state === 'frozen',
        programId,
    };
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

    const { address, connected } = useAccount();
    const { client: providerClient } = useSolanaClient();

    // Use override client if provided, otherwise use provider client
    const rpcClient = clientOverride ?? providerClient;

    // Generate cache key based on RPC URL and address only
    // This ensures useBalance and useTokens share the same cache entry
    const key = useMemo(() => {
        if (!enabled || !connected || !address || !rpcClient) return null;
        const rpcUrl =
            rpcClient.urlOrMoniker instanceof URL
                ? rpcClient.urlOrMoniker.toString()
                : String(rpcClient.urlOrMoniker);
        return JSON.stringify(['wallet-assets', rpcUrl, address]);
    }, [enabled, connected, address, rpcClient]);

    // Query function that fetches SOL balance and all token accounts
    const queryFn = useCallback(
        async (signal: AbortSignal): Promise<WalletAssetsData> => {
            if (!connected || !address || !rpcClient) {
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
        [connected, address, rpcClient],
    );

    // Use shared query with optional select
    const { data, error, status, updatedAt, isFetching, refetch, abort } = useSharedQuery<
        WalletAssetsData,
        TSelected
    >(key, queryFn, {
        enabled,
        staleTimeMs,
        cacheTimeMs,
        refetchOnMount,
        refetchIntervalMs,
        select: select as ((data: WalletAssetsData | undefined) => TSelected) | undefined,
    });

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
