import { derived, writable, get, type Readable } from 'svelte/store';

export interface QueryState<T> {
    data: T | undefined;
    error: Error | null;
    status: 'idle' | 'loading' | 'success' | 'error';
    isFetching: boolean;
}

interface CacheEntry {
    store: ReturnType<typeof writable<QueryState<unknown>>>;
    promise: Promise<unknown> | null;
    lastUpdated: number;
    queryFn: () => Promise<unknown>;
    subscribers: number;
}

// Global cache for shared queries
const cache = new Map<string, CacheEntry>();

export const createQuery = <T>(
    keyStore: Readable<string | null>,
    queryFn: () => Promise<T>,
    options: { staleTimeMs?: number; refetchIntervalMs?: number } = {},
) => {
    const { staleTimeMs = 0, refetchIntervalMs = 0 } = options;

    const queryStore = derived(
        keyStore,
        ($key, set) => {
            if (!$key) {
                set({ data: undefined, error: null, status: 'idle', isFetching: false });
                return;
            }

            // get or create entry in cache
            let entry = cache.get($key);
            if (!entry) {
                entry = {
                    store: writable({ data: undefined, error: null, status: 'idle', isFetching: false }),
                    promise: null,
                    lastUpdated: 0,
                    queryFn: queryFn as () => Promise<unknown>,
                    subscribers: 0,
                };
                cache.set($key, entry);
            }

            // Update the queryFn in cache to ensure it uses the latest closure variables
            entry.queryFn = queryFn as () => Promise<unknown>;
            entry.subscribers++;

            // subscribe to the cached store to update this derived store
            const unsubscribeStore = entry.store.subscribe(state => {
                set({
                    data: state.data as T,
                    error: state.error,
                    status: state.status,
                    isFetching: state.isFetching,
                });
            });

            const fetchData = async (force: boolean = false) => {
                const entry = cache.get($key); // re-get to be safe
                if (!entry) return;

                const now = Date.now();

                // deduplication
                if (entry.promise) return entry.promise;

                // stale check
                if (!force && entry.lastUpdated > 0 && now - entry.lastUpdated < staleTimeMs) {
                    return;
                }

                entry.store.update(state => ({
                    ...state,
                    isFetching: true,
                    status: state.status === 'idle' ? 'loading' : state.status,
                }));

                entry.promise = entry
                    .queryFn()
                    .then(data => {
                        entry!.store.set({ data, error: null, status: 'success', isFetching: false });
                        entry!.lastUpdated = Date.now();
                    })
                    .catch(error => {
                        entry!.store.update(s => ({ ...s, error, status: 'error', isFetching: false }));
                    })
                    .finally(() => {
                        entry!.promise = null;
                    });
            };

            // initial fetch
            fetchData();

            // polling
            let interval: ReturnType<typeof setInterval>;
            if (refetchIntervalMs > 0) {
                interval = setInterval(() => fetchData(true), refetchIntervalMs);
            }

            // cleanup
            return () => {
                unsubscribeStore();
                if (interval) clearInterval(interval);
                if (entry) {
                    entry.subscribers--;
                    // garbage collection
                    if (entry.subscribers === 0) {
                        setTimeout(() => cache.delete($key), 5000);
                    }
                }
            };
        },
        { data: undefined, error: null, status: 'idle', isFetching: false } as QueryState<T>,
    );

    // allows components to call `refetch()` explicitly
    const refetch = async () => {
        const key = get(keyStore);
        if (!key) return;

        const entry = cache.get(key);
        if (!entry) return;

        if (entry.promise) return entry.promise;

        entry.store.update(s => ({ ...s, isFetching: true }));

        entry.promise = entry
            .queryFn()
            .then(data => {
                entry.store.set({ data, error: null, status: 'success', isFetching: false });
                entry.lastUpdated = Date.now();
            })
            .catch(error => {
                entry.store.update(s => ({ ...s, error, status: 'error', isFetching: false }));
            })
            .finally(() => {
                entry.promise = null;
            });

        return entry.promise;
    };

    return {
        subscribe: queryStore.subscribe,
        refetch,
    };
};
