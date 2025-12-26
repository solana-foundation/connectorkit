/**
 * Shared Solana Token List metadata fetch + cache.
 *
 * Used by multiple hooks (e.g. useTokens, useTransactions) to avoid duplicate
 * token-list network calls and to share a single in-memory cache.
 */

'use client';

import { createTimeoutSignal } from '../../utils/abort';
import type { ClusterType } from '../../utils/cluster';

export interface SolanaTokenListMetadata {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    extensions?: {
        coingeckoId?: string;
    };
}

interface SolanaTokenListApiResponse {
    content: SolanaTokenListMetadata[];
}

/**
 * Solana Token List API chain IDs for different networks
 * - 101: mainnet-beta
 * - 102: testnet
 * - 103: devnet
 */
const CLUSTER_CHAIN_IDS: Record<ClusterType, number> = {
    mainnet: 101,
    testnet: 102,
    devnet: 103,
    localnet: 103, // Use devnet tokens for localnet
    custom: 101, // Default to mainnet for custom clusters
};

const TOKEN_LIST_API_BASE_URL = 'https://token-list-api.solana.cloud/v1/mints';

/**
 * Build the token list API URL for a specific cluster
 */
function getTokenListApiUrl(cluster: ClusterType = 'mainnet'): string {
    const chainId = CLUSTER_CHAIN_IDS[cluster];
    return `${TOKEN_LIST_API_BASE_URL}?chainId=${chainId}`;
}

const DEFAULT_TIMEOUT_MS = 10000;
const TOKEN_LIST_CACHE_MAX_SIZE = 1500;
const MAX_ADDRESSES_PER_REQUEST = 100;

// Simple LRU-ish Map: delete+set on get to bump recency.
const tokenListCache = new Map<string, SolanaTokenListMetadata>();

function getCachedTokenListMetadata(mint: string): SolanaTokenListMetadata | undefined {
    const value = tokenListCache.get(mint);
    if (!value) return undefined;
    tokenListCache.delete(mint);
    tokenListCache.set(mint, value);
    return value;
}

function setCachedTokenListMetadata(mint: string, value: SolanaTokenListMetadata): void {
    if (tokenListCache.has(mint)) {
        tokenListCache.delete(mint);
    }

    tokenListCache.set(mint, value);

    if (tokenListCache.size > TOKEN_LIST_CACHE_MAX_SIZE) {
        const oldestKey = tokenListCache.keys().next().value as string | undefined;
        if (oldestKey) tokenListCache.delete(oldestKey);
    }
}

function createLinkedSignal(
    externalSignal: AbortSignal | undefined,
    timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();

    const onAbort = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener('abort', onAbort, { once: true });
    }

    const { signal: timeoutSignal, cleanup: cleanupTimeout } = createTimeoutSignal(timeoutMs);
    const onTimeoutAbort = () => controller.abort();
    if (timeoutSignal.aborted) controller.abort();
    else timeoutSignal.addEventListener('abort', onTimeoutAbort, { once: true });

    return {
        signal: controller.signal,
        cleanup: () => {
            cleanupTimeout();
            if (externalSignal) {
                externalSignal.removeEventListener('abort', onAbort);
            }
            timeoutSignal.removeEventListener('abort', onTimeoutAbort);
        },
    };
}

export interface FetchSolanaTokenListMetadataOptions {
    /** Timeout in milliseconds for each batch request */
    timeoutMs?: number;
    /** External abort signal */
    signal?: AbortSignal;
    /** Cluster type to fetch tokens for (determines chainId in API URL) */
    cluster?: ClusterType;
}

export async function fetchSolanaTokenListMetadata(
    mints: string[],
    options: FetchSolanaTokenListMetadataOptions = {},
): Promise<Map<string, SolanaTokenListMetadata>> {
    const results = new Map<string, SolanaTokenListMetadata>();

    if (!mints.length) return results;

    const seen = new Set<string>();
    const uncached: string[] = [];

    for (const mint of mints) {
        const normalized = mint?.trim();
        if (!normalized) continue;
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        const cached = getCachedTokenListMetadata(normalized);
        if (cached) results.set(normalized, cached);
        else uncached.push(normalized);
    }

    if (!uncached.length) return results;

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const apiUrl = getTokenListApiUrl(options.cluster);

    // Batch requests to avoid very large POST bodies/timeouts on wallets with many mints.
    for (let i = 0; i < uncached.length; i += MAX_ADDRESSES_PER_REQUEST) {
        if (options.signal?.aborted) break;

        const batch = uncached.slice(i, i + MAX_ADDRESSES_PER_REQUEST);
        const { signal, cleanup } = createLinkedSignal(options.signal, timeoutMs);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addresses: batch }),
                signal,
            });

            if (!response.ok) {
                console.warn('[token-list] Solana Token List API error:', response.status, response.statusText);
                continue;
            }

            const data: SolanaTokenListApiResponse = await response.json();
            if (!data?.content?.length) continue;

            for (const item of data.content) {
                if (!item?.address) continue;
                results.set(item.address, item);
                setCachedTokenListMetadata(item.address, item);
            }
        } catch (error) {
            console.warn('[token-list] Solana Token List API failed:', error);
        } finally {
            cleanup();
        }
    }

    return results;
}

export function clearSolanaTokenListCache(): void {
    tokenListCache.clear();
}
