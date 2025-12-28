'use client';

import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useAccount } from './use-account';
import { useCluster } from './use-cluster';
import { useConnectorClient } from '../ui/connector-provider';
import { createTimeoutSignal } from '../utils/abort';
import { transformImageUrl } from '../utils/image';
import { formatBigIntBalance, formatBigIntUsd } from '../utils/formatting';
import {
    useWalletAssets,
    getWalletAssetsQueryKey,
    NATIVE_SOL_MINT,
    type WalletAssetsData,
    type TokenAccountInfo,
} from './_internal/use-wallet-assets';
import { fetchSolanaTokenListMetadata } from './_internal/solana-token-list';
import type { CoinGeckoConfig } from '../types/connector';
import type { SolanaClient } from '../lib/kit';
import type { ClusterType } from '../utils/cluster';

/**
 * Generate the query key for tokens data.
 * Use this to invalidate the tokens cache externally.
 *
 * Note: Balance and tokens share the same underlying cache (wallet-assets).
 *
 * @param rpcUrl - The RPC URL being used
 * @param address - The wallet address
 * @returns The query key string, or null if params are invalid
 *
 * @example
 * ```tsx
 * // Invalidate tokens after receiving new tokens
 * const key = getTokensQueryKey(rpcUrl, address);
 * if (key) invalidateSharedQuery(key);
 * ```
 */
export function getTokensQueryKey(rpcUrl: string | null, address: string | null): string | null {
    return getWalletAssetsQueryKey(rpcUrl, address);
}

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
    /** Which token program (token or token-2022) */
    programId?: 'token' | 'token-2022';
}

export interface UseTokensOptions {
    /** Whether the hook is enabled (default: true) */
    enabled?: boolean;
    /** Whether to include zero balance tokens */
    includeZeroBalance?: boolean;
    /** Whether to auto-refresh */
    autoRefresh?: boolean;
    /** Refresh interval in milliseconds */
    refreshInterval?: number;
    /** Fetch metadata (name, symbol, logo) and USD prices */
    fetchMetadata?: boolean;
    /** Include native SOL balance */
    includeNativeSol?: boolean;
    /** Time in ms to consider data fresh (default: 0) */
    staleTimeMs?: number;
    /** Time in ms to keep cache after unmount (default: 300000) */
    cacheTimeMs?: number;
    /** Whether to refetch on mount (default: 'stale') */
    refetchOnMount?: boolean | 'stale';
    /** Override the Solana client from provider */
    client?: SolanaClient | null;
}

export interface UseTokensReturn {
    /** List of tokens */
    tokens: Token[];
    /** Whether tokens are loading */
    isLoading: boolean;
    /** Error if fetch failed */
    error: Error | null;
    /** Refetch tokens, optionally with an abort signal */
    refetch: (options?: { signal?: AbortSignal }) => Promise<void>;
    /** Abort any in-flight token fetch */
    abort: () => void;
    /** Last updated timestamp */
    lastUpdated: Date | null;
    /** Total number of token accounts */
    totalAccounts: number;
}

// Combined token metadata (Solana Token List + CoinGecko price)
interface TokenMetadata {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    coingeckoId?: string;
    usdPrice?: number;
}

// Cache configuration
const CACHE_MAX_SIZE = 500;
const PRICE_CACHE_TTL = 60000; // 60 seconds
const STALE_CLEANUP_INTERVAL = 120000; // 2 minutes

/**
 * CoinGecko API defaults
 */
const COINGECKO_DEFAULT_MAX_RETRIES = 3;
const COINGECKO_DEFAULT_BASE_DELAY = 1000;
const COINGECKO_DEFAULT_MAX_TIMEOUT = 30000;
const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';

/**
 * LRU Cache with optional TTL support.
 */
class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private readonly maxSize: number;
    private readonly getTtl?: (value: V) => number | undefined;
    private readonly getTimestamp?: (value: V) => number | undefined;

    constructor(
        maxSize: number,
        options?: {
            getTtl?: (value: V) => number | undefined;
            getTimestamp?: (value: V) => number | undefined;
        },
    ) {
        this.maxSize = maxSize;
        this.getTtl = options?.getTtl;
        this.getTimestamp = options?.getTimestamp;
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value === undefined) return undefined;

        if (this.getTtl && this.getTimestamp) {
            const ttl = this.getTtl(value);
            const timestamp = this.getTimestamp(value);
            if (ttl !== undefined && timestamp !== undefined) {
                if (Date.now() - timestamp >= ttl) {
                    this.cache.delete(key);
                    return undefined;
                }
            }
        }

        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, value);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }

    pruneStale(): number {
        if (!this.getTtl || !this.getTimestamp) return 0;

        const now = Date.now();
        let pruned = 0;

        for (const [key, value] of this.cache) {
            const ttl = this.getTtl(value);
            const timestamp = this.getTimestamp(value);
            if (ttl !== undefined && timestamp !== undefined) {
                if (now - timestamp >= ttl) {
                    this.cache.delete(key);
                    pruned++;
                }
            }
        }

        return pruned;
    }
}

// Cache for metadata (LRU, no TTL - metadata rarely changes)
const metadataCache = new LRUCache<string, TokenMetadata>(CACHE_MAX_SIZE);

// Price cache with TTL (LRU + TTL - prices change frequently)
const priceCache = new LRUCache<string, { price: number; timestamp: number }>(CACHE_MAX_SIZE, {
    getTtl: () => PRICE_CACHE_TTL,
    getTimestamp: entry => entry.timestamp,
});

// Periodic stale entry cleanup for price cache
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
let cleanupRefCount = 0;

function startCacheCleanup(): void {
    cleanupRefCount++;
    if (cleanupIntervalId === null) {
        cleanupIntervalId = setInterval(() => {
            priceCache.pruneStale();
        }, STALE_CLEANUP_INTERVAL);
    }
}

function stopCacheCleanup(): void {
    cleanupRefCount = Math.max(0, cleanupRefCount - 1);
    if (cleanupRefCount === 0 && cleanupIntervalId !== null) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
    }
}

/**
 * Clear all token caches. Called on disconnect/session end.
 */
export function clearTokenCaches(): void {
    metadataCache.clear();
    priceCache.clear();
}

/**
 * Calculate exponential backoff delay with jitter.
 */
function calculateBackoffDelay(attempt: number, baseDelay: number, retryAfter?: number): number {
    if (retryAfter !== undefined && retryAfter > 0) {
        const jitter = Math.random() * 500;
        return retryAfter * 1000 + jitter;
    }

    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 500;
    return exponentialDelay + jitter;
}

/**
 * Parse Retry-After header value.
 */
function parseRetryAfter(retryAfterHeader: string | null): number | undefined {
    if (!retryAfterHeader) return undefined;

    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds) && seconds >= 0) {
        return seconds;
    }

    const date = Date.parse(retryAfterHeader);
    if (!isNaN(date)) {
        const waitMs = date - Date.now();
        return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
    }

    return undefined;
}

/**
 * Fetch prices from CoinGecko API with rate limit handling.
 */
async function fetchCoinGeckoPrices(coingeckoIds: string[], config?: CoinGeckoConfig): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    if (coingeckoIds.length === 0) return results;

    const now = Date.now();
    const uncachedIds: string[] = [];

    for (const id of coingeckoIds) {
        const cached = priceCache.get(id);
        if (cached && now - cached.timestamp < PRICE_CACHE_TTL) {
            results.set(id, cached.price);
        } else {
            uncachedIds.push(id);
        }
    }

    if (uncachedIds.length === 0) return results;

    const maxRetries = config?.maxRetries ?? COINGECKO_DEFAULT_MAX_RETRIES;
    const baseDelay = config?.baseDelay ?? COINGECKO_DEFAULT_BASE_DELAY;
    const maxTimeout = config?.maxTimeout ?? COINGECKO_DEFAULT_MAX_TIMEOUT;
    const apiKey = config?.apiKey;
    const isPro = config?.isPro ?? false;

    const url = `${COINGECKO_API_BASE_URL}/simple/price?ids=${uncachedIds.join(',')}&vs_currencies=usd`;

    const headers: HeadersInit = {};
    if (apiKey) {
        headers[isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = apiKey;
    }

    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= maxTimeout) {
            console.warn(
                `[useTokens] CoinGecko API: Total timeout (${maxTimeout}ms) exceeded after ${attempt} attempts.`,
            );
            break;
        }

        const remainingTimeout = maxTimeout - elapsedTime;
        const requestTimeout = Math.min(10000, remainingTimeout);
        const { signal, cleanup } = createTimeoutSignal(requestTimeout);

        try {
            const response = await fetch(url, { headers, signal });
            cleanup();

            if (response.status === 429) {
                const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
                const delay = calculateBackoffDelay(attempt, baseDelay, retryAfter);

                console.warn(`[useTokens] CoinGecko API rate limited (429). Waiting ${Math.round(delay)}ms.`);

                if (Date.now() - startTime + delay >= maxTimeout) {
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
                continue;
            }

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
            }

            const data: Record<string, { usd: number }> = await response.json();
            const fetchTime = Date.now();

            for (const [id, priceData] of Object.entries(data)) {
                if (priceData?.usd !== undefined) {
                    results.set(id, priceData.usd);
                    priceCache.set(id, { price: priceData.usd, timestamp: fetchTime });
                }
            }

            return results;
        } catch (error) {
            cleanup();
            lastError = error as Error;

            if (attempt < maxRetries) {
                const delay = calculateBackoffDelay(attempt, baseDelay);
                if (Date.now() - startTime + delay < maxTimeout) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            attempt++;
        }
    }

    if (attempt > maxRetries && lastError) {
        console.warn(`[useTokens] CoinGecko API: All attempts failed. Last error: ${lastError.message}`);
    }

    return results;
}

/**
 * Fetch token metadata from Solana Token List API and prices from CoinGecko.
 */
async function fetchTokenMetadataHybrid(
    mints: string[],
    coingeckoConfig?: CoinGeckoConfig,
    options?: { onUpdate?: () => void; cluster?: ClusterType },
): Promise<boolean> {
    if (mints.length === 0) return false;

    const now = Date.now();

    const mintsNeedingTokenList: string[] = [];
    const staleCoingeckoIdToMint = new Map<string, string>();

    for (const mint of mints) {
        const cached = metadataCache.get(mint);
        if (!cached) {
            mintsNeedingTokenList.push(mint);
            continue;
        }

        if (!cached.coingeckoId) continue;

        const priceEntry = priceCache.get(cached.coingeckoId);
        const isFresh = Boolean(priceEntry && now - priceEntry.timestamp < PRICE_CACHE_TTL);
        if (!isFresh) {
            staleCoingeckoIdToMint.set(cached.coingeckoId, mint);
        }
    }

    let didUpdate = false;

    // 1. Fetch token list metadata ONLY for mints missing metadata
    const tokenListMetadata = await fetchSolanaTokenListMetadata(mintsNeedingTokenList, {
        timeoutMs: 10000,
        cluster: options?.cluster,
    });

    // 2. Store token-list metadata into cache immediately (so logos show ASAP).
    for (const [mint, meta] of tokenListMetadata) {
        const coingeckoId = meta.extensions?.coingeckoId;
        const cachedPrice = coingeckoId ? priceCache.get(coingeckoId) : undefined;
        const usdPrice = cachedPrice?.price;

        const combined: TokenMetadata = {
            address: meta.address,
            name: meta.address === NATIVE_SOL_MINT ? 'Solana' : meta.name,
            symbol: meta.symbol,
            decimals: meta.decimals,
            logoURI: meta.logoURI,
            coingeckoId,
            usdPrice,
        };

        const existing = metadataCache.get(mint);
        const isDifferent =
            !existing ||
            existing.name !== combined.name ||
            existing.symbol !== combined.symbol ||
            existing.decimals !== combined.decimals ||
            existing.logoURI !== combined.logoURI ||
            existing.coingeckoId !== combined.coingeckoId ||
            existing.usdPrice !== combined.usdPrice;

        if (isDifferent) {
            didUpdate = true;
            metadataCache.set(mint, combined);
        }
    }

    if (didUpdate) {
        options?.onUpdate?.();
    }

    // 3. Collect CoinGecko IDs needing price refresh (from new + cached metadata)
    const coingeckoIdToMint = new Map<string, string>(staleCoingeckoIdToMint);
    for (const [mint, meta] of tokenListMetadata) {
        if (meta.extensions?.coingeckoId) {
            coingeckoIdToMint.set(meta.extensions.coingeckoId, mint);
        }
    }

    if (coingeckoIdToMint.size === 0) {
        return didUpdate;
    }

    // 4. Fetch prices (only stale/missing thanks to TTL in fetchCoinGeckoPrices)
    const prices = await fetchCoinGeckoPrices([...coingeckoIdToMint.keys()], coingeckoConfig);

    // 5. Update prices for cached mints (only bump if the displayed price changes)
    let didUpdatePrices = false;
    for (const [coingeckoId, mint] of coingeckoIdToMint) {
        const cached = metadataCache.get(mint);
        if (cached) {
            const usdPrice = prices.get(coingeckoId);
            if (usdPrice !== undefined) {
                if (cached.usdPrice !== usdPrice) {
                    didUpdate = true;
                    didUpdatePrices = true;
                    cached.usdPrice = usdPrice;
                    metadataCache.set(mint, cached);
                }
            }
        }
    }

    if (didUpdatePrices) {
        options?.onUpdate?.();
    }

    return didUpdate;
}

/**
 * Format balance for display (BigInt-safe)
 */
function formatBalance(amount: bigint, decimals: number): string {
    return formatBigIntBalance(amount, decimals, {
        maxDecimals: Math.min(decimals, 6),
    });
}

/**
 * Format USD value for display (BigInt-safe)
 */
function formatUsd(amount: bigint, decimals: number, usdPrice: number): string {
    return formatBigIntUsd(amount, decimals, usdPrice);
}

/** Selection type for wallet assets */
interface TokensSelection {
    lamports: bigint;
    tokenAccounts: TokenAccountInfo[];
    address: string;
}

/**
 * Select function to get token-relevant data from wallet assets
 */
function selectTokens(assets: WalletAssetsData | undefined, address: string): TokensSelection {
    return {
        lamports: assets?.lamports ?? 0n,
        tokenAccounts: assets?.tokenAccounts ?? [],
        address,
    };
}

/**
 * Sort tokens by USD value (highest first), tokens with metadata first
 */
function sortByValueDesc(a: Token, b: Token): number {
    const metadataSort = (b.logo ? 1 : 0) - (a.logo ? 1 : 0);
    if (metadataSort !== 0) return metadataSort;

    const aValue = (Number(a.amount) / Math.pow(10, a.decimals)) * (a.usdPrice ?? 0);
    const bValue = (Number(b.amount) / Math.pow(10, b.decimals)) * (b.usdPrice ?? 0);
    return bValue - aValue;
}

/**
 * Hook for fetching wallet token holdings.
 * Fetches metadata (name, symbol, icon) from Solana Token List API and USD prices from CoinGecko.
 *
 * Features:
 * - Automatic request deduplication across components
 * - Shared data with useBalance (single RPC query)
 * - Token-2022 support
 * - Shared polling interval (ref-counted)
 * - Configurable auto-refresh behavior
 * - Abort support for in-flight requests
 * - Optional client override
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
 *
 * @example With options
 * ```tsx
 * function TokenList() {
 *   const { tokens, refetch, abort } = useTokens({
 *     autoRefresh: true,
 *     refreshInterval: 30000,
 *     includeNativeSol: true,
 *   });
 *
 *   return (
 *     <div>
 *       {tokens.map(token => (
 *         <div key={token.mint}>{token.symbol}: {token.formatted}</div>
 *       ))}
 *       <button onClick={() => refetch()}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTokens(options: UseTokensOptions = {}): UseTokensReturn {
    const {
        enabled = true,
        includeZeroBalance = false,
        autoRefresh = false,
        refreshInterval = 60000,
        fetchMetadata = true,
        includeNativeSol = true,
        staleTimeMs = 0,
        cacheTimeMs = 5 * 60 * 1000, // 5 minutes
        refetchOnMount = 'stale',
        client: clientOverride,
    } = options;

    const { address, connected } = useAccount();
    const { type: clusterType } = useCluster();
    const connectorClient = useConnectorClient();

    // Get imageProxy and coingecko config from connector config
    const connectorConfig = connectorClient?.getConfig();
    const imageProxy = connectorConfig?.imageProxy;
    const coingeckoConfig = connectorConfig?.coingecko;

    // Memoize select function to avoid new function reference on every render
    const selectFn = useCallback(
        (assets: WalletAssetsData | undefined) => selectTokens(assets, address ?? ''),
        [address],
    );

    // Use shared wallet assets query
    const {
        data: selection,
        error,
        isFetching,
        updatedAt,
        refetch: sharedRefetch,
        abort,
    } = useWalletAssets<TokensSelection>({
        enabled,
        staleTimeMs,
        cacheTimeMs,
        refetchOnMount,
        refetchIntervalMs: autoRefresh ? refreshInterval : false,
        client: clientOverride,
        select: selectFn,
    });

    const lamports = selection?.lamports ?? 0n;
    const tokenAccounts = selection?.tokenAccounts ?? [];
    const walletAddress = selection?.address ?? '';

    // Build base tokens from raw data (without metadata)
    const baseTokens = useMemo((): Token[] => {
        const result: Token[] = [];

        // Add native SOL if requested
        if (includeNativeSol && walletAddress) {
            if (includeZeroBalance || lamports > 0n) {
                result.push({
                    mint: NATIVE_SOL_MINT,
                    tokenAccount: walletAddress,
                    amount: lamports,
                    decimals: 9,
                    formatted: formatBalance(lamports, 9),
                    isFrozen: false,
                    owner: walletAddress,
                });
            }
        }

        // Add SPL tokens
        for (const account of tokenAccounts) {
            if (!includeZeroBalance && account.amount === 0n) {
                continue;
            }

            result.push({
                mint: account.mint,
                tokenAccount: account.pubkey,
                amount: account.amount,
                decimals: account.decimals,
                formatted: formatBalance(account.amount, account.decimals),
                isFrozen: account.isFrozen,
                owner: account.owner,
                programId: account.programId,
            });
        }

        return result;
    }, [lamports, tokenAccounts, walletAddress, includeNativeSol, includeZeroBalance]);

    // Extract mints for metadata fetching
    const mints = useMemo(() => {
        const unique = new Set<string>();
        for (const token of baseTokens) {
            unique.add(token.mint);
        }
        return [...unique].sort();
    }, [baseTokens]);
    const mintsKey = useMemo(() => mints.join(','), [mints]);

    // Metadata version counter - bumped when metadata cache is updated
    // This triggers re-derivation of tokens with fresh metadata
    const [metadataVersion, setMetadataVersion] = useState(0);

    // Fetch metadata/prices when mint set changes.
    // The shared token-list cache prevents duplicate network requests, so we don't need
    // an in-flight guard here. This ensures setMetadataVersion is always called reliably.
    useEffect(() => {
        if (!fetchMetadata || !mintsKey) return;

        let isMounted = true;

        (async () => {
            try {
                const mintList = mintsKey.split(',');

                // Fetch and cache metadata; onUpdate is called immediately when logos arrive
                await fetchTokenMetadataHybrid(mintList, coingeckoConfig, {
                    onUpdate: () => {
                        if (isMounted) setMetadataVersion(v => v + 1);
                    },
                    cluster: clusterType ?? undefined,
                });

                // Final bump in case onUpdate wasn't called (e.g., only prices updated)
                if (isMounted) setMetadataVersion(v => v + 1);
            } catch (err) {
                console.error('[useTokens] Failed to fetch metadata:', err);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [mintsKey, fetchMetadata, coingeckoConfig, clusterType]);

    // Derive final tokens from baseTokens + metadata cache
    // This ensures balances always stay current (derived from latest baseTokens)
    const tokens = useMemo(() => {
        if (!fetchMetadata) {
            return baseTokens.slice().sort(sortByValueDesc);
        }

        // Apply metadata from cache
        const enriched = baseTokens.map(token => {
            const meta = metadataCache.get(token.mint);
            if (!meta) return token;

            const cachedPrice = meta.coingeckoId ? priceCache.get(meta.coingeckoId) : undefined;
            const usdPrice = cachedPrice?.price ?? meta.usdPrice;

            return {
                ...token,
                name: meta.name,
                symbol: meta.symbol,
                logo: transformImageUrl(meta.logoURI, imageProxy),
                usdPrice,
                formattedUsd: usdPrice ? formatUsd(token.amount, token.decimals, usdPrice) : undefined,
            };
        });

        return enriched.sort(sortByValueDesc);
        // metadataVersion triggers re-derivation when cache is updated
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseTokens, fetchMetadata, imageProxy, metadataVersion]);

    const totalAccounts = tokenAccounts.length + (includeNativeSol ? 1 : 0);

    // Start/stop cache cleanup interval based on hook lifecycle
    useEffect(() => {
        startCacheCleanup();
        return () => stopCacheCleanup();
    }, []);

    // Track previous connection state to detect disconnect
    const wasConnectedRef = useRef(connected);

    // Clear caches on disconnect/session end
    useEffect(() => {
        if (wasConnectedRef.current && !connected) {
            clearTokenCaches();
        }
        wasConnectedRef.current = connected;
    }, [connected]);

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
            tokens,
            isLoading: isFetching,
            error: visibleError,
            refetch,
            abort,
            lastUpdated: updatedAt ? new Date(updatedAt) : null,
            totalAccounts,
        }),
        [tokens, isFetching, visibleError, refetch, abort, updatedAt, totalAccounts],
    );
}
