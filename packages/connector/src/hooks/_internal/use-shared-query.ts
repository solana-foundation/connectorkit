'use client';

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

/**
 * Snapshot of a shared query's current state
 */
export interface SharedQuerySnapshot<TData> {
    /** The fetched data, undefined if not yet loaded */
    data: TData | undefined;
    /** Error from the last fetch attempt */
    error: Error | null;
    /** Current status of the query */
    status: 'idle' | 'loading' | 'success' | 'error';
    /** Timestamp of last successful update */
    updatedAt: number | null;
    /** Whether a fetch is currently in progress */
    isFetching: boolean;
}

/**
 * Options for useSharedQuery hook
 */
export interface SharedQueryOptions {
    /** Whether the query is enabled (default: true) */
    enabled?: boolean;
    /** Time in ms to consider data fresh (default: 0) */
    staleTimeMs?: number;
    /** Time in ms to keep cache after last subscriber unmounts (default: 300000) */
    cacheTimeMs?: number;
    /** Whether to refetch on mount (default: 'stale') */
    refetchOnMount?: boolean | 'stale';
    /** Polling interval in ms, or false to disable (default: false) */
    refetchIntervalMs?: number | false;
}

/**
 * Options for fetch operations
 */
interface SharedQueryFetchOptions {
    staleTimeMs?: number;
    force?: boolean;
    signal?: AbortSignal;
}

/**
 * Internal cache entry for a query
 */
interface SharedQueryEntry<TData> {
    snapshot: SharedQuerySnapshot<TData>;
    subscribers: Set<() => void>;
    promise: Promise<TData> | null;
    abortController: AbortController | null;

    cacheTimeMs: number;
    gcTimeoutId: ReturnType<typeof setTimeout> | null;

    queryFn: ((signal: AbortSignal) => Promise<TData>) | null;

    // Ref-counted polling intervals
    intervalCounts: Map<number, number>;
    activeIntervalMs: number | null;
    intervalId: ReturnType<typeof setInterval> | null;
}

/** Default cache time: 5 minutes */
const DEFAULT_CACHE_TIME_MS = 5 * 60 * 1000;

/** Global cache store */
const store = new Map<string, SharedQueryEntry<unknown>>();

/**
 * Get or create a cache entry for a key
 */
function getOrCreateEntry<TData>(key: string): SharedQueryEntry<TData> {
    const existing = store.get(key) as SharedQueryEntry<TData> | undefined;
    if (existing) return existing;

    const entry: SharedQueryEntry<TData> = {
        snapshot: {
            data: undefined,
            error: null,
            status: 'idle',
            updatedAt: null,
            isFetching: false,
        },
        subscribers: new Set(),
        promise: null,
        abortController: null,

        cacheTimeMs: DEFAULT_CACHE_TIME_MS,
        gcTimeoutId: null,

        queryFn: null,

        intervalCounts: new Map(),
        activeIntervalMs: null,
        intervalId: null,
    };

    store.set(key, entry as SharedQueryEntry<unknown>);
    return entry;
}

/**
 * Notify all subscribers of a state change
 */
function emit(entry: SharedQueryEntry<unknown>): void {
    for (const cb of entry.subscribers) {
        cb();
    }
}

/**
 * Update snapshot and notify subscribers if changed
 */
function setSnapshot<TData>(entry: SharedQueryEntry<TData>, next: SharedQuerySnapshot<TData>): void {
    const prev = entry.snapshot;
    const isEqual =
        prev.status === next.status &&
        prev.isFetching === next.isFetching &&
        prev.updatedAt === next.updatedAt &&
        prev.error === next.error &&
        prev.data === next.data;

    if (isEqual) return;
    entry.snapshot = next;
    emit(entry as SharedQueryEntry<unknown>);
}

/**
 * Get the minimum polling interval from all subscribers
 */
function getMinIntervalMs(entry: SharedQueryEntry<unknown>): number | null {
    let min: number | null = null;
    for (const [ms, count] of entry.intervalCounts) {
        if (count <= 0) continue;
        if (min === null || ms < min) min = ms;
    }
    return min;
}

/**
 * Start or restart the polling interval based on subscriber requirements
 */
function startOrRestartInterval(key: string, entry: SharedQueryEntry<unknown>): void {
    const nextMs = getMinIntervalMs(entry);

    if (nextMs === null) {
        if (entry.intervalId) clearInterval(entry.intervalId);
        entry.intervalId = null;
        entry.activeIntervalMs = null;
        return;
    }

    if (entry.activeIntervalMs === nextMs && entry.intervalId) return;

    if (entry.intervalId) clearInterval(entry.intervalId);
    entry.activeIntervalMs = nextMs;
    entry.intervalId = setInterval(() => {
        const fn = entry.queryFn;
        if (!fn) return;
        void fetchSharedQuery(key, fn, { force: true });
    }, nextMs);
}

/**
 * Subscribe to a query's state changes
 */
function subscribeSharedQuery(key: string, onChange: () => void, cacheTimeMs?: number): () => void {
    const entry = getOrCreateEntry(key);
    entry.subscribers.add(onChange);

    if (typeof cacheTimeMs === 'number') {
        entry.cacheTimeMs = Math.max(entry.cacheTimeMs, cacheTimeMs);
    }

    // Cancel pending GC if re-subscribing
    if (entry.gcTimeoutId) {
        clearTimeout(entry.gcTimeoutId);
        entry.gcTimeoutId = null;
    }

    return () => {
        entry.subscribers.delete(onChange);
        if (entry.subscribers.size > 0) return;

        // Last subscriber unmounting - stop background work
        if (entry.abortController) {
            entry.abortController.abort();
        }
        entry.abortController = null;
        entry.promise = null;

        if (entry.intervalId) clearInterval(entry.intervalId);
        entry.intervalId = null;
        entry.activeIntervalMs = null;
        entry.intervalCounts.clear();

        // Schedule GC
        const gcDelayMs = entry.cacheTimeMs ?? DEFAULT_CACHE_TIME_MS;
        entry.gcTimeoutId = setTimeout(() => {
            if (entry.subscribers.size === 0) {
                store.delete(key);
            }
        }, gcDelayMs);
    };
}

/**
 * Fetch data for a query, with deduplication and caching
 */
async function fetchSharedQuery<TData>(
    key: string,
    queryFn: (signal: AbortSignal) => Promise<TData>,
    options: SharedQueryFetchOptions = {},
): Promise<TData> {
    const entry = getOrCreateEntry<TData>(key);
    entry.queryFn = queryFn;

    const staleTimeMs = options.staleTimeMs ?? 0;
    const now = Date.now();

    // Check if data is fresh
    const isFresh =
        options.force !== true &&
        entry.snapshot.status === 'success' &&
        entry.snapshot.updatedAt !== null &&
        now - entry.snapshot.updatedAt < staleTimeMs;

    if (isFresh && entry.snapshot.data !== undefined) {
        return entry.snapshot.data;
    }

    // Deduplicate: return existing promise if in-flight
    if (entry.promise) {
        return entry.promise;
    }

    const controller = new AbortController();
    entry.abortController = controller;

    // Link external abort signal if provided
    if (options.signal) {
        if (options.signal.aborted) {
            controller.abort();
        } else {
            options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
    }

    // Update loading state
    const isFirstLoad = entry.snapshot.status === 'idle' && entry.snapshot.updatedAt === null;
    setSnapshot(entry, {
        ...entry.snapshot,
        status: isFirstLoad ? 'loading' : entry.snapshot.status,
        isFetching: true,
        error: null,
    });

    const promise = (async () => {
        try {
            const data = await queryFn(controller.signal);
            setSnapshot(entry, {
                data,
                error: null,
                status: 'success',
                updatedAt: Date.now(),
                isFetching: false,
            });
            return data;
        } catch (cause) {
            const aborted = controller.signal.aborted;

            // On abort, preserve previous data and DON'T throw (avoids unhandled rejections)
            if (aborted) {
                setSnapshot(entry, {
                    data: entry.snapshot.data,
                    error: null,
                    status: entry.snapshot.status === 'idle' ? 'idle' : entry.snapshot.status,
                    updatedAt: entry.snapshot.updatedAt,
                    isFetching: false,
                });
                // Return previous data instead of throwing
                return entry.snapshot.data as TData;
            }

            // Non-abort error: store error but keep previous data
            const error = cause instanceof Error ? cause : new Error(String(cause));
            setSnapshot(entry, {
                data: entry.snapshot.data,
                error,
                status: 'error',
                updatedAt: entry.snapshot.updatedAt,
                isFetching: false,
            });
            throw error;
        } finally {
            entry.promise = null;
            entry.abortController = null;
        }
    })();

    entry.promise = promise;
    return promise;
}

/**
 * Return type for useSharedQuery hook
 */
export interface UseSharedQueryReturn<TData> extends SharedQuerySnapshot<TData> {
    /** Refetch the query, optionally with an abort signal */
    refetch: (options?: { signal?: AbortSignal }) => Promise<TData | undefined>;
    /** Abort any in-flight request */
    abort: () => void;
}

/**
 * Hook for shared, deduplicated data fetching with caching and polling support.
 *
 * @param key - Unique cache key, or null to disable
 * @param queryFn - Async function to fetch data, receives AbortSignal
 * @param options - Query options
 * @returns Query snapshot with refetch and abort methods
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch, abort } = useSharedQuery(
 *   ['balance', address],
 *   async (signal) => {
 *     const result = await rpc.getBalance(address).send();
 *     return result.value;
 *   },
 *   { refetchIntervalMs: 30000 }
 * );
 * ```
 */
export function useSharedQuery<TData>(
    key: string | null,
    queryFn: (signal: AbortSignal) => Promise<TData>,
    options: SharedQueryOptions = {},
): UseSharedQueryReturn<TData> {
    const {
        enabled = true,
        staleTimeMs = 0,
        cacheTimeMs,
        refetchOnMount = 'stale',
        refetchIntervalMs = false,
    } = options;

    // Stable reference to queryFn - update on every render but don't trigger effects
    const queryFnRef = useRef(queryFn);
    queryFnRef.current = queryFn;

    // Create a stable wrapper that reads from ref
    const stableQueryFn = useCallback((signal: AbortSignal) => queryFnRef.current(signal), []);

    // Memoize subscribe to avoid infinite loops
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (!key) return () => {};
            return subscribeSharedQuery(key, onChange, cacheTimeMs);
        },
        [key, cacheTimeMs],
    );

    // Memoize getSnapshot to return stable reference when key is null
    const emptySnapshot = useMemo<SharedQuerySnapshot<TData>>(
        () => ({
            data: undefined,
            error: null,
            status: 'idle',
            updatedAt: null,
            isFetching: false,
        }),
        [],
    );

    const getSnapshot = useCallback((): SharedQuerySnapshot<TData> => {
        if (!key) return emptySnapshot;
        return getOrCreateEntry<TData>(key).snapshot;
    }, [key, emptySnapshot]);

    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // Track if we've successfully fetched for this key (used to prevent duplicate fetches)
    const fetchedKeyRef = useRef<string | null>(null);

    // Initial fetch effect - only runs once per key change
    useEffect(() => {
        if (!key || !enabled) {
            fetchedKeyRef.current = null;
            return;
        }

        // Register queryFn for background refetching
        const entry = getOrCreateEntry<TData>(key);
        entry.queryFn = stableQueryFn;

        // Skip if we already successfully fetched for this key
        // (checking status === 'success' prevents skipping after aborted fetches in StrictMode)
        if (fetchedKeyRef.current === key && entry.snapshot.status === 'success') {
            return;
        }

        // Determine if we should fetch
        const current = entry.snapshot;
        const isStale = current.updatedAt === null || Date.now() - current.updatedAt >= staleTimeMs;
        const shouldFetch =
            refetchOnMount === true || current.status === 'idle' || (refetchOnMount === 'stale' && isStale);

        if (shouldFetch) {
            // Mark as fetched for this key (will be validated by status check on re-runs)
            fetchedKeyRef.current = key;
            void fetchSharedQuery(key, stableQueryFn, {
                staleTimeMs,
                force: refetchOnMount === true,
            });
        } else {
            // Data is fresh, mark as fetched
            fetchedKeyRef.current = key;
        }
    }, [key, enabled, staleTimeMs, refetchOnMount, stableQueryFn]);

    // Polling effect - separate from initial fetch
    useEffect(() => {
        if (!key || !enabled || refetchIntervalMs === false) return;

        const entry = getOrCreateEntry<TData>(key);
        entry.queryFn = stableQueryFn;

        const prev = entry.intervalCounts.get(refetchIntervalMs) ?? 0;
        entry.intervalCounts.set(refetchIntervalMs, prev + 1);
        startOrRestartInterval(key, entry as SharedQueryEntry<unknown>);

        return () => {
            const count = entry.intervalCounts.get(refetchIntervalMs) ?? 0;
            if (count <= 1) {
                entry.intervalCounts.delete(refetchIntervalMs);
            } else {
                entry.intervalCounts.set(refetchIntervalMs, count - 1);
            }
            startOrRestartInterval(key, entry as SharedQueryEntry<unknown>);
        };
    }, [key, enabled, refetchIntervalMs, stableQueryFn]);

    const refetch = useCallback(
        async (refetchOptions?: { signal?: AbortSignal }) => {
            if (!key) return undefined;
            return fetchSharedQuery(key, stableQueryFn, {
                force: true,
                signal: refetchOptions?.signal,
            });
        },
        [key, stableQueryFn],
    );

    const abort = useCallback(() => {
        if (!key) return;
        const entry = store.get(key);
        if (entry?.abortController) {
            entry.abortController.abort();
        }
    }, [key]);

    return useMemo(
        () => ({
            ...snapshot,
            refetch,
            abort,
        }),
        [snapshot, refetch, abort],
    );
}

/**
 * Invalidate a query, causing it to refetch on next access
 */
export function invalidateSharedQuery(key: string): void {
    const entry = store.get(key);
    if (!entry) return;

    setSnapshot(entry as SharedQueryEntry<unknown>, {
        ...entry.snapshot,
        updatedAt: null, // Mark as stale
    });
}

/**
 * Clear all cached queries (useful for logout/disconnect)
 */
export function clearSharedQueryCache(): void {
    for (const [, entry] of store) {
        if (entry.intervalId) clearInterval(entry.intervalId);
        if (entry.gcTimeoutId) clearTimeout(entry.gcTimeoutId);
        if (entry.abortController) entry.abortController.abort();
    }
    store.clear();
}
