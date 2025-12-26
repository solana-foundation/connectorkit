'use client';

import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { address as toAddress } from '@solana/addresses';
import { useAccount } from './use-account';
import { useSolanaClient } from './use-kit-solana-client';
import { useConnectorClient } from '../ui/connector-provider';
import { useSharedQuery } from './_internal/use-shared-query';
import type { CoinGeckoConfig } from '../types/connector';
import type { SolanaClient } from '../lib/kit-utils';

/**
 * Creates a timeout signal with browser compatibility fallback.
 *
 * Uses `AbortSignal.timeout()` if available (modern browsers),
 * otherwise falls back to manual AbortController + setTimeout.
 *
 * @param ms - Timeout in milliseconds
 * @returns Object with `signal` for fetch and `cleanup` function to clear the timer
 */
function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
    // Feature detect AbortSignal.timeout (available in modern browsers)
    if (typeof AbortSignal.timeout === 'function') {
        // No cleanup needed for native timeout signals
        return { signal: AbortSignal.timeout(ms), cleanup: () => {} };
    }

    // Fallback for older browsers: manual AbortController + setTimeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ms);

    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timeoutId),
    };
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

// Solana Token List API response
interface SolanaTokenMetadata {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    extensions?: {
        coingeckoId?: string;
    };
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

// Native SOL mint address
const NATIVE_MINT = 'So11111111111111111111111111111111111111112';

// Cache configuration
const CACHE_MAX_SIZE = 500;
const PRICE_CACHE_TTL = 60000; // 60 seconds
const STALE_CLEANUP_INTERVAL = 120000; // 2 minutes

/**
 * CoinGecko API defaults
 *
 * Rate Limits (as of 2024):
 * - Free tier (no API key): 10-30 requests/minute
 * - Demo tier (free API key): 30 requests/minute
 * - Paid tiers: Higher limits based on plan
 *
 * @see https://docs.coingecko.com/reference/introduction
 */
const COINGECKO_DEFAULT_MAX_RETRIES = 3;
const COINGECKO_DEFAULT_BASE_DELAY = 1000; // 1 second
const COINGECKO_DEFAULT_MAX_TIMEOUT = 30000; // 30 seconds
const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';

/**
 * LRU Cache with optional TTL support.
 * - Moves accessed items to most-recent position on get
 * - Evicts oldest entries when max size is reached
 * - Optionally prunes stale entries based on TTL
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

        // Check if entry is stale (for TTL-enabled caches)
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

        // Move to most-recent position (delete and re-add)
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key: K, value: V): void {
        // If key exists, delete it first to update position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evict oldest entry if at max size
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

    /**
     * Prune stale entries based on TTL.
     * Only works if getTtl and getTimestamp are provided.
     */
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
 * Fetch token metadata from Solana Token List API
 */
async function fetchSolanaTokenMetadata(mints: string[]): Promise<Map<string, SolanaTokenMetadata>> {
    const results = new Map<string, SolanaTokenMetadata>();

    if (mints.length === 0) return results;

    const { signal, cleanup } = createTimeoutSignal(10000);

    try {
        const response = await fetch('https://token-list-api.solana.cloud/v1/mints?chainId=101', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses: mints }),
            signal,
        });
        cleanup();

        if (!response.ok) {
            throw new Error(`Solana Token List API error: ${response.status}`);
        }

        const data: { content: SolanaTokenMetadata[] } = await response.json();

        for (const item of data.content) {
            results.set(item.address, item);
        }
    } catch (error) {
        cleanup();
        console.warn('[useTokens] Solana Token List API failed:', error);
    }

    return results;
}

/**
 * Calculate exponential backoff delay with jitter.
 * Formula: baseDelay * 2^attempt + random jitter (0-500ms)
 *
 * @param attempt - Current retry attempt (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param retryAfter - Optional Retry-After value from server (in seconds)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, baseDelay: number, retryAfter?: number): number {
    // If server provided Retry-After, honor it (convert from seconds to ms)
    if (retryAfter !== undefined && retryAfter > 0) {
        // Add small jitter (0-500ms) even when honoring Retry-After
        const jitter = Math.random() * 500;
        return retryAfter * 1000 + jitter;
    }

    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    // Add random jitter (0-500ms) to prevent thundering herd
    const jitter = Math.random() * 500;
    return exponentialDelay + jitter;
}

/**
 * Parse Retry-After header value.
 * Can be either a number of seconds or an HTTP date.
 *
 * @param retryAfterHeader - Value of the Retry-After header
 * @returns Number of seconds to wait, or undefined if invalid
 */
function parseRetryAfter(retryAfterHeader: string | null): number | undefined {
    if (!retryAfterHeader) return undefined;

    // Try parsing as a number (seconds)
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds) && seconds >= 0) {
        return seconds;
    }

    // Try parsing as an HTTP date
    const date = Date.parse(retryAfterHeader);
    if (!isNaN(date)) {
        const waitMs = date - Date.now();
        return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
    }

    return undefined;
}

/**
 * Fetch prices from CoinGecko API with rate limit handling.
 *
 * Features:
 * - Exponential backoff with jitter on 429 responses
 * - Honors Retry-After header when present
 * - Configurable max retries and timeout
 * - Optional API key support for higher rate limits
 *
 * Rate Limits (as of 2024):
 * - Free tier (no API key): 10-30 requests/minute
 * - Demo tier (free API key): 30 requests/minute
 * - Paid tiers: Higher limits based on plan
 *
 * @see https://docs.coingecko.com/reference/introduction
 */
async function fetchCoinGeckoPrices(coingeckoIds: string[], config?: CoinGeckoConfig): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    if (coingeckoIds.length === 0) return results;

    // Check price cache first - backoff only applies to uncached IDs
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

    // All IDs were cached, no API call needed
    if (uncachedIds.length === 0) return results;

    // Extract config with defaults
    const maxRetries = config?.maxRetries ?? COINGECKO_DEFAULT_MAX_RETRIES;
    const baseDelay = config?.baseDelay ?? COINGECKO_DEFAULT_BASE_DELAY;
    const maxTimeout = config?.maxTimeout ?? COINGECKO_DEFAULT_MAX_TIMEOUT;
    const apiKey = config?.apiKey;
    const isPro = config?.isPro ?? false;

    // Build request URL
    const url = `${COINGECKO_API_BASE_URL}/simple/price?ids=${uncachedIds.join(',')}&vs_currencies=usd`;

    // Build headers (add API key if provided)
    const headers: HeadersInit = {};
    if (apiKey) {
        // Use appropriate header based on API tier
        // Pro API: x-cg-pro-api-key, Demo API: x-cg-demo-api-key
        headers[isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = apiKey;
    }

    // Track start time to enforce total timeout
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
        // Check if we've exceeded total timeout
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= maxTimeout) {
            console.warn(
                `[useTokens] CoinGecko API: Total timeout (${maxTimeout}ms) exceeded after ${attempt} attempts. ` +
                    'Returning cached/partial results.',
            );
            break;
        }

        // Calculate remaining time for this request
        const remainingTimeout = maxTimeout - elapsedTime;
        const requestTimeout = Math.min(10000, remainingTimeout); // Cap individual request at 10s
        const { signal, cleanup } = createTimeoutSignal(requestTimeout);

        try {
            const response = await fetch(url, {
                headers,
                signal,
            });
            cleanup();

            // Handle rate limiting (429 Too Many Requests)
            if (response.status === 429) {
                const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
                const delay = calculateBackoffDelay(attempt, baseDelay, retryAfter);

                console.warn(
                    `[useTokens] CoinGecko API rate limited (429). ` +
                        `Attempt ${attempt + 1}/${maxRetries + 1}. ` +
                        `Retry-After: ${retryAfter ?? 'not specified'}s. ` +
                        `Waiting ${Math.round(delay)}ms before retry. ` +
                        `Consider adding an API key for higher limits: https://www.coingecko.com/en/api/pricing`,
                );

                // Check if waiting would exceed total timeout
                if (Date.now() - startTime + delay >= maxTimeout) {
                    console.warn(
                        `[useTokens] CoinGecko API: Skipping retry - would exceed total timeout (${maxTimeout}ms). ` +
                            'Returning cached/partial results.',
                    );
                    break;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
                continue;
            }

            // Handle other errors
            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
            }

            // Parse and cache successful response
            const data: Record<string, { usd: number }> = await response.json();
            const fetchTime = Date.now();

            for (const [id, priceData] of Object.entries(data)) {
                if (priceData?.usd !== undefined) {
                    results.set(id, priceData.usd);
                    priceCache.set(id, { price: priceData.usd, timestamp: fetchTime });
                }
            }

            // Success - exit retry loop
            return results;
        } catch (error) {
            cleanup();
            lastError = error as Error;

            // Don't retry on abort/timeout - we're already tracking total timeout
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.warn(`[useTokens] CoinGecko API request timed out. Attempt ${attempt + 1}/${maxRetries + 1}.`);
            } else {
                console.warn(
                    `[useTokens] CoinGecko API request failed. Attempt ${attempt + 1}/${maxRetries + 1}:`,
                    error,
                );
            }

            // For non-429 errors, use backoff but continue retry loop
            if (attempt < maxRetries) {
                const delay = calculateBackoffDelay(attempt, baseDelay);
                if (Date.now() - startTime + delay < maxTimeout) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            attempt++;
        }
    }

    // All retries exhausted
    if (attempt > maxRetries) {
        console.warn(
            `[useTokens] CoinGecko API: All ${maxRetries + 1} attempts failed. ` +
                'Returning cached/partial results. ' +
                `Last error: ${lastError?.message ?? 'Unknown error'}. ` +
                'If you are frequently rate limited, consider adding an API key: https://www.coingecko.com/en/api/pricing',
        );
    }

    return results;
}

/**
 * Fetch token metadata from Solana Token List API and prices from CoinGecko.
 * Hybrid approach for vendor flexibility.
 *
 * @param mints - Array of token mint addresses
 * @param coingeckoConfig - Optional CoinGecko API configuration
 */
async function fetchTokenMetadataHybrid(
    mints: string[],
    coingeckoConfig?: CoinGeckoConfig,
): Promise<Map<string, TokenMetadata>> {
    const results = new Map<string, TokenMetadata>();

    if (mints.length === 0) return results;

    // Check cache first
    const uncachedMints: string[] = [];
    const now = Date.now();

    for (const mint of mints) {
        const cached = metadataCache.get(mint);
        if (cached) {
            // Check if we need to refresh prices
            const priceStale =
                cached.coingeckoId &&
                (!priceCache.get(cached.coingeckoId) ||
                    now - (priceCache.get(cached.coingeckoId)?.timestamp ?? 0) >= PRICE_CACHE_TTL);

            if (priceStale && cached.coingeckoId) {
                // Metadata is cached but price is stale - we'll refresh price later
                uncachedMints.push(mint);
            }
            results.set(mint, cached);
        } else {
            uncachedMints.push(mint);
        }
    }

    // If all mints are fully cached, return early
    if (uncachedMints.length === 0) return results;

    // 1. Fetch metadata from Solana Token List API
    const solanaMetadata = await fetchSolanaTokenMetadata(uncachedMints);

    // 2. Extract coingeckoIds for price lookup
    const coingeckoIdToMint = new Map<string, string>();
    for (const [mint, meta] of solanaMetadata) {
        if (meta.extensions?.coingeckoId) {
            coingeckoIdToMint.set(meta.extensions.coingeckoId, mint);
        }
    }

    // Also check cached mints that need price refresh
    for (const mint of mints) {
        const cached = metadataCache.get(mint);
        if (cached?.coingeckoId && !coingeckoIdToMint.has(cached.coingeckoId)) {
            coingeckoIdToMint.set(cached.coingeckoId, mint);
        }
    }

    // 3. Fetch prices from CoinGecko (with rate limit handling)
    const prices = await fetchCoinGeckoPrices([...coingeckoIdToMint.keys()], coingeckoConfig);

    // 4. Combine metadata with prices
    for (const [mint, meta] of solanaMetadata) {
        const coingeckoId = meta.extensions?.coingeckoId;
        const usdPrice = coingeckoId ? prices.get(coingeckoId) : undefined;

        const combined: TokenMetadata = {
            address: meta.address,
            name: meta.address === NATIVE_MINT ? 'Solana' : meta.name,
            symbol: meta.symbol,
            decimals: meta.decimals,
            logoURI: meta.logoURI,
            coingeckoId,
            usdPrice,
        };

        results.set(mint, combined);
        metadataCache.set(mint, combined);
    }

    // Update prices for cached mints
    for (const [coingeckoId, mint] of coingeckoIdToMint) {
        const cached = results.get(mint) ?? metadataCache.get(mint);
        if (cached) {
            const usdPrice = prices.get(coingeckoId);
            if (usdPrice !== undefined) {
                cached.usdPrice = usdPrice;
                results.set(mint, cached);
                metadataCache.set(mint, cached);
            }
        }
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
 * Transform an image URL through a proxy if configured
 */
function transformImageUrl(url: string | undefined, imageProxy: string | undefined): string | undefined {
    if (!url) return undefined;
    if (!imageProxy) return url;
    const encodedUrl = encodeURIComponent(url);
    return imageProxy.endsWith('/') ? imageProxy + encodedUrl : imageProxy + '/' + encodedUrl;
}

/** Internal data structure for tokens RPC query */
interface TokensRpcData {
    tokens: Token[];
    mints: string[];
    totalAccounts: number;
}

/**
 * Hook for fetching wallet token holdings.
 * Fetches metadata (name, symbol, icon) from Solana Token List API and USD prices from CoinGecko.
 *
 * Features:
 * - Automatic request deduplication across components
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
    const { client: providerClient } = useSolanaClient();
    const connectorClient = useConnectorClient();

    // Use override client if provided, otherwise use provider client
    const rpcClient = clientOverride ?? providerClient;

    // Get imageProxy and coingecko config from connector config
    const connectorConfig = connectorClient?.getConfig();
    const imageProxy = connectorConfig?.imageProxy;
    const coingeckoConfig = connectorConfig?.coingecko;

    // Generate cache key based on RPC URL, address, and options that affect the query
    const key = useMemo(() => {
        if (!enabled || !connected || !address || !rpcClient) return null;
        const rpcUrl =
            rpcClient.urlOrMoniker instanceof URL
                ? rpcClient.urlOrMoniker.toString()
                : String(rpcClient.urlOrMoniker);
        return JSON.stringify(['wallet-tokens', rpcUrl, address, includeZeroBalance, includeNativeSol]);
    }, [enabled, connected, address, rpcClient, includeZeroBalance, includeNativeSol]);

    // Query function that fetches token accounts from RPC
    const queryFn = useCallback(
        async (signal: AbortSignal): Promise<TokensRpcData> => {
            if (!connected || !address || !rpcClient) {
                return { tokens: [], mints: [], totalAccounts: 0 };
            }

            // Throw on abort - fetchSharedQuery will preserve previous data
            if (signal.aborted) {
                throw new DOMException('Query aborted', 'AbortError');
            }

            const rpc = rpcClient.rpc;
            const walletAddress = toAddress(address);
            const tokenProgramId = toAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            // Fetch SOL balance and token accounts in parallel
            const [balanceResult, tokenAccountsResult] = await Promise.all([
                includeNativeSol ? rpc.getBalance(walletAddress).send() : Promise.resolve(null),
                rpc
                    .getTokenAccountsByOwner(walletAddress, { programId: tokenProgramId }, { encoding: 'jsonParsed' })
                    .send(),
            ]);

            // Throw on abort - fetchSharedQuery will preserve previous data
            if (signal.aborted) {
                throw new DOMException('Query aborted', 'AbortError');
            }

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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = account.account.data as any;
                if (data?.parsed?.info) {
                    const info = data.parsed.info;
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

            return {
                tokens: tokenList,
                mints,
                totalAccounts: tokenAccountsResult.value.length + (includeNativeSol ? 1 : 0),
            };
        },
        [connected, address, rpcClient, includeZeroBalance, includeNativeSol],
    );

    // Use shared query for deduplication and caching of RPC data
    const {
        data: rpcData,
        error,
        isFetching,
        updatedAt,
        refetch: sharedRefetch,
        abort,
    } = useSharedQuery<TokensRpcData>(key, queryFn, {
        enabled,
        staleTimeMs,
        cacheTimeMs,
        refetchOnMount,
        refetchIntervalMs: autoRefresh ? refreshInterval : false,
    });

    // Memoize base tokens from RPC data
    const baseTokens = rpcData?.tokens ?? [];
    const mints = rpcData?.mints ?? [];
    const totalAccounts = rpcData?.totalAccounts ?? 0;

    // Track enriched tokens with metadata (using state to trigger re-renders)
    const [enrichedTokens, setEnrichedTokens] = useState<{ key: string; tokens: Token[] } | null>(null);
    // Track which key we're currently fetching to avoid duplicate fetches
    const fetchingKeyRef = useRef<string | null>(null);

    // Compute mints key for comparison (stable reference)
    const mintsKey = useMemo(() => mints.join(','), [mints]);

    // Fetch metadata when mints change
    useEffect(() => {
        // Skip if metadata fetch disabled or no mints
        if (!fetchMetadata || mintsKey === '') {
            return;
        }

        // Skip if we already have enriched data for these exact mints
        if (enrichedTokens?.key === mintsKey) {
            return;
        }

        // Skip if we're already fetching for these mints
        if (fetchingKeyRef.current === mintsKey) {
            return;
        }

        // Mark as fetching
        fetchingKeyRef.current = mintsKey;

        // Capture current values for async operation
        const currentMints = mints;
        const currentBaseTokens = baseTokens;
        const currentMintsKey = mintsKey;

        // Fetch metadata asynchronously
        let cancelled = false;
        (async () => {
            try {
                const metadata = await fetchTokenMetadataHybrid(currentMints, coingeckoConfig);

                if (cancelled) return;

                // Apply metadata to tokens
                const enriched = currentBaseTokens.map(token => {
                    const meta = metadata.get(token.mint);
                    if (!meta) return token;

                    return {
                        ...token,
                        name: meta.name,
                        symbol: meta.symbol,
                        logo: transformImageUrl(meta.logoURI, imageProxy),
                        usdPrice: meta.usdPrice,
                        formattedUsd: meta.usdPrice ? formatUsd(token.amount, token.decimals, meta.usdPrice) : undefined,
                    };
                });

                // Sort by USD value (highest first), tokens with metadata first
                enriched.sort((a, b) => {
                    // Tokens with metadata come first
                    const metadataSort = (b.logo ? 1 : 0) - (a.logo ? 1 : 0);
                    if (metadataSort !== 0) return metadataSort;

                    // Then sort by USD value
                    const aValue = (Number(a.amount) / Math.pow(10, a.decimals)) * (a.usdPrice ?? 0);
                    const bValue = (Number(b.amount) / Math.pow(10, b.decimals)) * (b.usdPrice ?? 0);
                    return bValue - aValue;
                });

                setEnrichedTokens({ key: currentMintsKey, tokens: enriched });
            } catch (err) {
                console.error('[useTokens] Failed to fetch metadata:', err);
                // On error, store base tokens with the key so we don't retry infinitely
                setEnrichedTokens({ key: currentMintsKey, tokens: currentBaseTokens });
            } finally {
                // Clear fetching ref if it's still for this key
                if (fetchingKeyRef.current === currentMintsKey) {
                    fetchingKeyRef.current = null;
                }
            }
        })();

        return () => {
            cancelled = true;
            // Clear fetching ref on cleanup
            if (fetchingKeyRef.current === currentMintsKey) {
                fetchingKeyRef.current = null;
            }
        };
        // Only depend on mintsKey and fetchMetadata - the other values are captured in the closure
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mintsKey, fetchMetadata]);

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
            // User just disconnected - clear caches
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

    // Use enriched tokens if available and matching current mints, otherwise base tokens
    const tokens = enrichedTokens?.key === mintsKey ? enrichedTokens.tokens : baseTokens;

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
